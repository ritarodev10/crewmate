# WebSocket Gateway Conventions

---

## Gateway Setup

The gateway lives at `apps/api/src/ws/events.gateway.ts`. It is the single Socket.io gateway for the entire application.

```ts
// events.gateway.ts
@WebSocketGateway({
  cors: {
    origin: process.env.WEB_URL,
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket'],
})
export class EventsGateway {
  @WebSocketServer()
  private readonly server: Server;
  // ...
}
```

The gateway is exported from `WsModule` and injected into any service that needs to emit events.

---

## Room Strategy

All clients join a room named `operator:{operatorId}` immediately on connection. Events are emitted to that room only — never broadcast to all connected clients.

```ts
@SubscribeMessage('join')  // not used — join happens on connect
handleConnection(client: Socket) {
  const token = client.handshake.auth.token as string | undefined;

  if (!token) {
    client.disconnect();
    return;
  }

  try {
    const payload = this.jwtService.verify<JwtPayload>(token);
    client.data.operatorId = payload.operatorId;
    client.data.userId = payload.sub;
    void client.join(`operator:${payload.operatorId}`);
  } catch {
    client.disconnect();
  }
}
```

This pattern ensures a client from OperatorA can never receive events from OperatorB even if they are connected to the same gateway.

---

## Emit Method

Services call a single `emit` method on the injected `EventsGateway`:

```ts
// events.gateway.ts
emit<T extends WsEventName>(
  operatorId: string,
  event: T,
  payload: WsEventPayload[T],
): void {
  this.server.to(`operator:${operatorId}`).emit(event, payload);
}
```

---

## Emitted Events — Exact Payload Shapes

The gateway emits exactly 4 events. No others. All field names are `camelCase`. All IDs are CUIDs (strings).

### `job.status.changed`

Emitted when a job transitions to a new status (SCHEDULED → IN_PROGRESS, IN_PROGRESS → COMPLETED). Also emitted on cancellation via `job.cancelled` — do not emit both for cancellation.

```ts
interface JobStatusChangedPayload {
  jobId: string;
  status: JobStatus;          // 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  workerId?: string;          // undefined for team jobs at the job level
  teamId?: string;            // undefined for solo jobs
  lat: number;                // job location (from customer)
  lng: number;
  progressPct: number;        // 0 | 25 | 50 | 75 | 100
}
```

### `job.progress.updated`

Emitted when a worker updates progress (25%, 50%, 75%, 100%) without a status change.

```ts
interface JobProgressUpdatedPayload {
  jobId: string;
  progressPct: number;        // 25 | 50 | 75 | 100
  workerId: string;           // the worker who tapped the step
}
```

### `job.cancelled`

Emitted instead of (not in addition to) `job.status.changed` when a job is revoked. Frontend listens for this separately to show cancellation reason in the UI.

```ts
interface JobCancelledPayload {
  jobId: string;
  cancelReasonCode: CancelCode;
  cancelledBy: string;        // userId of manager/admin who revoked
}
```

### `worker.status.changed`

Emitted whenever a worker's `status` field changes (IDLE → ON_JOB when they start a job; ON_JOB → IDLE when they complete or their job is cancelled).

```ts
interface WorkerStatusChangedPayload {
  workerId: string;
  status: WorkerStatus;       // 'IDLE' | 'ON_JOB' | 'OFF_DUTY'
}
```

---

## TypeScript Types for Events

Define a discriminated union map to keep the `emit` method type-safe:

```ts
// ws/events.types.ts
export type WsEventName =
  | 'job.status.changed'
  | 'job.progress.updated'
  | 'job.cancelled'
  | 'worker.status.changed';

export interface WsEventPayload {
  'job.status.changed': JobStatusChangedPayload;
  'job.progress.updated': JobProgressUpdatedPayload;
  'job.cancelled': JobCancelledPayload;
  'worker.status.changed': WorkerStatusChangedPayload;
}
```

---

## Emit from Service Layer

The `EventsGateway` is injected into services, not controllers. Emit after the database write succeeds within the same service method.

```ts
// jobs.service.ts
@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async updateJobStatus(
    jobId: string,
    dto: UpdateJobStatusDto,
    operatorId: string,
    actorUserId: string,
  ): Promise<JobDetailResponse> {
    // 1. Validate transition
    // 2. Write to DB (in transaction)
    const updatedJob = await this.prisma.$transaction([...]);

    // 3. Emit after successful write
    this.eventsGateway.emit(operatorId, 'job.status.changed', {
      jobId,
      status: dto.status,
      workerId: updatedJob.assigneeKind === 'SOLO' ? updatedJob.assigneeId : undefined,
      teamId: updatedJob.assigneeKind === 'TEAM' ? updatedJob.assigneeId : undefined,
      lat: updatedJob.lat,
      lng: updatedJob.lng,
      progressPct: updatedJob.progressPct,
    });

    // 4. Emit worker status change if needed
    if (dto.status === 'IN_PROGRESS') {
      this.eventsGateway.emit(operatorId, 'worker.status.changed', {
        workerId: resolveWorkerId(updatedJob),
        status: 'ON_JOB',
      });
    }

    return toJobDetailResponse(updatedJob);
  }
}
```

Never emit from a controller. If the controller calls the service and the service throws before the DB write, no event is emitted — this is the correct behavior.

---

## Listen-Only Pattern

The server never handles incoming messages from clients in this project. Workers and managers do not push events to the server over WebSocket — they use REST endpoints for all mutations.

Do not add `@SubscribeMessage()` handlers for any domain event. The only allowed `@SubscribeMessage` is for connection lifecycle (e.g., a ping/pong keepalive if needed).

---

## Frontend Connection

The frontend connects from `apps/web` using Socket.io client v4:

```ts
// apps/web/src/lib/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(jwtToken: string): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL!, {
      auth: { token: jwtToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
```

The `auth.token` is verified by `handleConnection` on the gateway. If invalid or missing, the gateway calls `client.disconnect()` immediately.

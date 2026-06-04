# Events and Queues

## When to use which

| Need | Tool |
|---|---|
| Fan out a domain notification to in-process listeners | `EventEmitter2` (`@nestjs/event-emitter`) |
| Defer work, retry on failure, run in a separate process | BullMQ (`@nestjs/bullmq`) |
| Cross-service or cross-deployment messaging | A real broker (RabbitMQ, SQS, Kafka). Out of scope for the MVP. |

A rule of thumb. If a failure inside the handler should not roll back the publisher, use a queue. If the handler is fast, synchronous, and best-effort, an emitter is fine.

## Event naming

`domain.entity.action` in past tense.

| Good | Bad |
|---|---|
| `job.created` | `createJob` |
| `job.status.changed` | `updateJobStatus` |
| `worker.assigned` | `assigningWorker` |
| `webhook.delivery.failed` | `webhookFail` |

- Past tense, because an event is something that already happened.
- Dotted segments, because consumers filter by prefix (`job.*` subscribes to all job events).
- No tenant scoping in the event name. The payload carries the `tenantId`.

## Event payloads

Typed, versioned, minimal.

```ts
// modules/jobs/events/job-created.event.ts
export class JobCreatedEvent {
  static readonly name = 'job.created';
  static readonly version = 1;

  constructor(
    public readonly tenantId: string,
    public readonly jobId: string,
    public readonly propertyId: string,
    public readonly scheduledFor: Date,
    public readonly actorId: string,
    public readonly occurredAt: Date,
  ) {}
}
```

Rules.

- Carry IDs, not full entities. Consumers refetch what they need.
- Carry the actor and the `occurredAt` timestamp. Audit and replay depend on it.
- Bump `version` when the payload shape changes in a way consumers must handle.

## Publishing

In-process.

```ts
this.events.emit(JobCreatedEvent.name, new JobCreatedEvent(...));
```

To a queue.

```ts
await this.notificationsQueue.add(
  'send-job-assignment-email',
  { jobId, workerId },
  {
    jobId: `assign:${jobId}:${workerId}`,   // dedupe key
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 60 * 60 * 24, count: 1000 },
    removeOnFail: { age: 60 * 60 * 24 * 7 },
  },
);
```

## Outbox pattern (when events must not be lost)

If publishing an event must succeed when and only when the database write succeeds, use an outbox.

1. In the same transaction as the business write, insert a row into `outbox_events`.
2. A background worker reads `outbox_events` in order and publishes to BullMQ.
3. The worker marks the row processed (or failed with a count).

This avoids the dual-write problem (DB write succeeds, broker publish fails, or vice versa).

For the MVP project, document this trade-off and either implement it or note "fire-and-forget acceptable for v1, outbox tracked in roadmap".

## Consumers and processors

A queue processor lives next to the feature that owns the work.

```ts
// modules/notifications/processors/webhook-delivery.processor.ts
@Processor('webhook-delivery')
export class WebhookDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);

  constructor(private readonly delivery: WebhookDeliveryService) {
    super();
  }

  async process(job: Job<WebhookDeliveryPayload>): Promise<void> {
    this.logger.log({ jobId: job.id, attempt: job.attemptsMade }, 'Delivering');
    await this.delivery.deliver(job.data);
  }
}
```

Rules.

- One processor per queue. One queue per business concept.
- Processors are thin. They call a service that does the actual work.
- Handlers are **idempotent**. The same event delivered twice must produce the same end state.

## Idempotency

A handler is idempotent if processing the same input twice produces the same outcome.

Patterns.

- Natural keys. `assign:{jobId}:{workerId}` as the BullMQ `jobId` prevents duplicate enqueues.
- Server-side checks. Before sending the webhook, look up `webhook_deliveries` for `(eventId)` and skip if already delivered.
- Conditional updates. `UPDATE jobs SET status = ... WHERE id = ? AND status = ?` so a duplicate transition is a no-op.

If a handler cannot be made idempotent, isolate the side effect (a third-party API that does not support idempotency keys), retry with care, and log every attempt.

## Retries and dead-lettering

- Default retry. 5 attempts, exponential backoff starting at 1 second.
- Permanent failures (4xx from an external API on bad input) do not retry. Throw a subclass of `UnrecoverableError`.
- Failed jobs after max attempts move to a DLQ. A small admin tool can reprocess from the DLQ.

## Listening to events

```ts
@OnEvent(JobCreatedEvent.name, { async: true })
async handleJobCreated(event: JobCreatedEvent): Promise<void> {
  await this.schedules.addEntry(event);
}
```

- One listener per concern. Do not stack three responsibilities in one handler.
- Listeners log start and finish with the event id, so a slow listener is visible.
- Listeners catch their own errors. An exception from a listener should not bubble up to the publisher.

## WebSocket relays

When a domain event should reach a connected client, a separate listener forwards it to the WebSocket gateway.

```ts
@OnEvent('job.status.changed')
async relayJobStatusChange(event: JobStatusChangedEvent): Promise<void> {
  this.gateway.broadcastToTenant(event.tenantId, 'job.status.changed', {
    jobId: event.jobId,
    status: event.status,
  });
}
```

Rules.

- The gateway only relays. It does not contain business logic.
- Payloads sent over the wire are minimal and PII-free.

## Banned

- Emitting an event inside a Prisma transaction without using the outbox. Events outlive transactions, do not lie to consumers.
- Catching an exception inside a processor and silently dropping the job.
- Using event names that contain the action's outcome (`job.created.success`). Either it happened or it did not.

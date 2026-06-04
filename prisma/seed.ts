// CrewMate seed script.
// Creates one operator with realistic demo data so a reviewer can `pnpm db:seed`
// and immediately see the app populated. See docs/guardrails/backend/01-data.md.

import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Operator
  const operator = await prisma.operator.upsert({
    where: { slug: 'brookline-property-co' },
    update: {},
    create: { name: 'Brookline Property Co.', slug: 'brookline-property-co' },
  });

  // Users: admin, coordinator, worker
  const adminHash = await argon2.hash('AdminPass123!');
  const coordHash = await argon2.hash('CoordPass123!');
  const workerHash = await argon2.hash('WorkerPass123!');

  await prisma.user.upsert({
    where: { operatorId_email: { operatorId: operator.id, email: 'admin@brookline.demo' } },
    update: {},
    create: {
      email: 'admin@brookline.demo',
      name: 'Alex Admin',
      passwordHash: adminHash,
      operatorId: operator.id,
    },
  });

  await prisma.user.upsert({
    where: { operatorId_email: { operatorId: operator.id, email: 'coordinator@brookline.demo' } },
    update: {},
    create: {
      email: 'coordinator@brookline.demo',
      name: 'Casey Coordinator',
      passwordHash: coordHash,
      operatorId: operator.id,
    },
  });

  const workerUser = await prisma.user.upsert({
    where: { operatorId_email: { operatorId: operator.id, email: 'worker@brookline.demo' } },
    update: {},
    create: {
      email: 'worker@brookline.demo',
      name: 'Jordan Worker',
      passwordHash: workerHash,
      operatorId: operator.id,
    },
  });

  // Properties
  const prop1 = await prisma.property.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: '42 Maple Street',
      kind: 'RESIDENTIAL',
      address: '42 Maple Street, Brookline, MA 02445',
      timezone: 'America/New_York',
      operatorId: operator.id,
    },
  });

  const prop2 = await prisma.property.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: '100 Commerce Drive',
      kind: 'COMMERCIAL',
      address: '100 Commerce Drive, Brookline, MA 02445',
      timezone: 'America/New_York',
      operatorId: operator.id,
    },
  });

  const prop3 = await prisma.property.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: '7 Park Lane',
      kind: 'RESIDENTIAL',
      address: '7 Park Lane, Brookline, MA 02446',
      timezone: 'America/New_York',
      operatorId: operator.id,
    },
  });

  // Workers
  const worker1 = await prisma.worker.upsert({
    where: { id: '00000000-0000-0000-1000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-1000-000000000001',
      name: 'Jordan Worker',
      phone: '+16175550101',
      operatorId: operator.id,
      userId: workerUser.id,
    },
  });

  const worker2 = await prisma.worker.upsert({
    where: { id: '00000000-0000-0000-1000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-1000-000000000002',
      name: 'Sam Rivera',
      phone: '+16175550102',
      operatorId: operator.id,
    },
  });

  const worker3 = await prisma.worker.upsert({
    where: { id: '00000000-0000-0000-1000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-1000-000000000003',
      name: 'Morgan Chen',
      phone: '+16175550103',
      operatorId: operator.id,
    },
  });

  const worker4 = await prisma.worker.upsert({
    where: { id: '00000000-0000-0000-1000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-1000-000000000004',
      name: 'Taylor Brooks',
      phone: '+16175550104',
      operatorId: operator.id,
    },
  });

  // 15 Jobs spread across statuses
  // workerId references User.id (not Worker.id) per schema: Job.worker -> User @relation("JobWorker")
  const now = new Date();
  const day = (offset: number): Date => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return d;
  };

  // 5 SCHEDULED jobs
  for (let i = 1; i <= 5; i++) {
    await prisma.job.upsert({
      where: { id: `00000000-0000-0000-3000-00000000000${i}` },
      update: {},
      create: {
        id: `00000000-0000-0000-3000-00000000000${i}`,
        operatorId: operator.id,
        propertyId: [prop1, prop2, prop3][i % 3].id,
        type: 'CLEANING',
        status: 'SCHEDULED',
        scheduledFor: day(i),
      },
    });
  }

  // 3 EN_ROUTE jobs
  for (let i = 6; i <= 8; i++) {
    await prisma.job.upsert({
      where: { id: `00000000-0000-0000-3000-00000000000${i}` },
      update: {},
      create: {
        id: `00000000-0000-0000-3000-00000000000${i}`,
        operatorId: operator.id,
        propertyId: [prop1, prop2, prop3][i % 3].id,
        workerId: workerUser.id,
        type: 'INSPECTION',
        status: 'EN_ROUTE',
        scheduledFor: day(0),
      },
    });
  }

  // 4 IN_PROGRESS jobs
  for (let i = 9; i <= 12; i++) {
    await prisma.job.upsert({
      where: { id: `00000000-0000-0000-3000-0000000000${i}` },
      update: {},
      create: {
        id: `00000000-0000-0000-3000-0000000000${i}`,
        operatorId: operator.id,
        propertyId: [prop1, prop2, prop3][i % 3].id,
        workerId: workerUser.id,
        type: 'MAINTENANCE',
        status: 'IN_PROGRESS',
        scheduledFor: day(0),
        startedAt: new Date(),
      },
    });
  }

  // 3 COMPLETED jobs
  for (let i = 13; i <= 15; i++) {
    await prisma.job.upsert({
      where: { id: `00000000-0000-0000-3000-0000000000${i}` },
      update: {},
      create: {
        id: `00000000-0000-0000-3000-0000000000${i}`,
        operatorId: operator.id,
        propertyId: [prop1, prop2, prop3][i % 3].id,
        workerId: workerUser.id,
        type: 'CLEANING',
        status: 'COMPLETED',
        scheduledFor: day(-1),
        startedAt: new Date(now.getTime() - 3600000),
        completedAt: new Date(),
      },
    });
  }

  // Suppress unused variable warnings
  void worker1;
  void worker2;
  void worker3;
  void worker4;

  // Webhook endpoint pointing at webhook.site for demo
  await prisma.webhookEndpoint.upsert({
    where: { id: '00000000-0000-0000-2000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-2000-000000000001',
      url: 'https://webhook.site/placeholder-crewmate-demo',
      secret: 'demo-signing-secret-not-production-safe',
      events: ['job.created', 'job.status.changed'],
      operatorId: operator.id,
      isActive: true,
    },
  });

  process.stdout.write('\n=== DEMO CREDENTIALS ===\n');
  process.stdout.write('Admin:       admin@brookline.demo / AdminPass123!\n');
  process.stdout.write('Coordinator: coordinator@brookline.demo / CoordPass123!\n');
  process.stdout.write('Worker:      worker@brookline.demo / WorkerPass123!\n');
  process.stdout.write('========================\n\n');
}

main()
  .catch((err: unknown) => {
    process.stderr.write(`[seed] failed: ${String(err)}\n`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

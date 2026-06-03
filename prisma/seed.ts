// CrewMate seed script.
// Creates one operator with realistic demo data so a reviewer can `pnpm db:seed`
// and immediately see the app populated. See nestjs-ai-guardrails/04-DATA.md.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Implementation lives here. Creates:
  //  - 1 operator (Brookline Property Co.)
  //  - 3 users (admin, coordinator, worker) with hashed passwords
  //  - 3 properties across one region
  //  - 4 workers (one linked to the worker user)
  //  - 15 jobs spread across SCHEDULED / EN_ROUTE / IN_PROGRESS / COMPLETED
  //  - 1 webhook endpoint pointing at webhook.site for demo deliveries
  //
  // Demo credentials are logged at the end of the run.
  //
  // TODO(seed): implement when modules are wired in apps/api/src/modules/.

  console.log('[seed] not yet implemented. wire feature modules first.');
}

main()
  .catch((err) => {
    console.error('[seed] failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

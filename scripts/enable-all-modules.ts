/**
 * Enables all available modules for all tenants.
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   Local dev:  npx tsx scripts/enable-all-modules.ts
 *   Beta:       DATABASE_URL="<public_url>" npx tsx scripts/enable-all-modules.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ALL_MODULES = {
  handover: true,
  production: true,
  fichas: true,
  checklists: true,
};

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, active_modules: true } });

  if (tenants.length === 0) {
    console.log("No tenants found.");
    return;
  }

  for (const tenant of tenants) {
    const current = (tenant.active_modules as Record<string, boolean>) ?? {};
    const merged = { ...ALL_MODULES, ...current };

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { active_modules: merged },
    });

    console.log(`✓ [${tenant.name}] active_modules:`, merged);
  }

  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

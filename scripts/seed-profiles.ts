/**
 * Seed default UserProfiles for all tenants that have none.
 *
 * Usage:
 *   Local dev:  npx tsx scripts/seed-profiles.ts
 *   Beta:       railway run npx tsx scripts/seed-profiles.ts
 *   Prod:       DATABASE_URL="<prod_url>" npx tsx scripts/seed-profiles.ts
 */

import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_PROFILES: {
  name: string;
  base_role: UserRole;
  allowed_modules: Record<string, boolean>;
}[] = [
  {
    name: "Admin",
    base_role: "ADMIN",
    allowed_modules: {
      stations: true,
      handover: true,
      production: true,
      prep_items: true,
      fichas: true,
      checklists: true,
      settings: true,
    },
  },
  {
    name: "Gerente",
    base_role: "MANAGER",
    allowed_modules: {
      stations: true,
      handover: true,
      production: true,
      prep_items: true,
      fichas: true,
      checklists: true,
      settings: true,
    },
  },
  {
    name: "Líder de Praça",
    base_role: "STATION_LEADER",
    allowed_modules: { handover: true, fichas: true, checklists: true },
  },
  {
    name: "Ajudante de Cozinha",
    base_role: "STATION_LEADER",
    allowed_modules: { production: true, fichas: true, checklists: true },
  },
  {
    name: "Garçom",
    base_role: "STAFF",
    allowed_modules: { handover: true, fichas: true },
  },
  {
    name: "Ajudante Geral",
    base_role: "STAFF",
    allowed_modules: { handover: true, fichas: true },
  },
];

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });

  if (tenants.length === 0) {
    console.log("No tenants found — nothing to seed.");
    return;
  }

  for (const tenant of tenants) {
    const existing = await prisma.userProfile.count({
      where: { tenant_id: tenant.id },
    });

    if (existing > 0) {
      console.log(`[${tenant.name}] Already has ${existing} profile(s) — skipping.`);
      continue;
    }

    console.log(`[${tenant.name}] Seeding ${DEFAULT_PROFILES.length} profiles...`);

    for (const profile of DEFAULT_PROFILES) {
      await prisma.userProfile.upsert({
        where: { tenant_id_name: { tenant_id: tenant.id, name: profile.name } },
        update: { base_role: profile.base_role, allowed_modules: profile.allowed_modules },
        create: { tenant_id: tenant.id, ...profile },
      });
      console.log(`  ✓ ${profile.name} (${profile.base_role})`);
    }
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed process...");

  const tenant = await prisma.tenant.upsert({
    where: { slug: "restaurante-demo" },
    update: {},
    create: {
      name: "Restaurante Demo",
      slug: "restaurante-demo",
      active_modules: { handover: true, production: true },
      max_employees: 10,
    },
  });
  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

  const grelha = await prisma.station.upsert({
    where: { tenant_id_name: { tenant_id: tenant.id, name: "Praça da Grelha" } },
    update: {},
    create: { name: "Praça da Grelha", tenant_id: tenant.id },
  });

  const fria = await prisma.station.upsert({
    where: { tenant_id_name: { tenant_id: tenant.id, name: "Praça Fria" } },
    update: {},
    create: { name: "Praça Fria", tenant_id: tenant.id },
  });

  const bar = await prisma.station.upsert({
    where: { tenant_id_name: { tenant_id: tenant.id, name: "Bar" } },
    update: {},
    create: { name: "Bar", tenant_id: tenant.id },
  });
  console.log("✅ Praças criadas");

  const grelhaItems = [
    { name: "Picanha Porcionada", unit: "kg", target: 8 },
    { name: "Frango Marinado", unit: "kg", target: 5 },
    { name: "Molho BBQ", unit: "litros", target: 3 },
  ];
  const friaItems = [
    { name: "Tomate Fatiado", unit: "kg", target: 5 },
    { name: "Alface Lavada", unit: "kg", target: 3 },
    { name: "Molho Caesar", unit: "litros", target: 2 },
  ];
  const barItems = [
    { name: "Limão Cortado", unit: "un", target: 50 },
    { name: "Hortelã", unit: "un", target: 30 },
    { name: "Xarope Simples", unit: "litros", target: 2 },
  ];

  for (const [station, items] of [
    [grelha, grelhaItems],
    [fria, friaItems],
    [bar, barItems],
  ] as const) {
    for (const item of items) {
      await prisma.prepItem.upsert({
        where: { tenantId_name: { tenant_id: tenant.id, name: item.name } },
        update: { target_quantity: item.target },
        create: {
          tenant_id: tenant.id,
          name: item.name,
          unit: item.unit,
          target_quantity: item.target,
          stations: { connect: [{ id: station.id }] },
        },
      });
    }
  }
  console.log("✅ Insumos criados");
  console.log("\nTenant ID para o setup-admin:", tenant.id);
  console.log("Seed concluído com sucesso.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

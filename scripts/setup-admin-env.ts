import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const CLERK_USER_ID = process.env.CLERK_USER_ID
  const USER_EMAIL = process.env.USER_EMAIL
  const USER_NAME = process.env.USER_NAME

  if (!CLERK_USER_ID) {
    console.error("❌ Erro: CLERK_USER_ID não definido.")
    process.exit(1)
  }

  console.log("🚀 Iniciando Setup de Admin via ENV...")

  try {
    // Busca o primeiro tenant criado pelo seed
    const tenant = await prisma.tenant.findFirst({
      orderBy: { created_at: 'asc' }
    })

    if (!tenant) {
      console.error("❌ Erro: Nenhum Tenant encontrado. Rode 'npx prisma db seed' primeiro.")
      process.exit(1)
    }

    console.log(`🏢 Vinculando ao Tenant: ${tenant.name} (${tenant.id})`)
    
    const user = await prisma.user.upsert({
      where: { clerk_user_id: CLERK_USER_ID },
      update: {
        tenant_id: tenant.id,
        role: "ADMIN",
        status: "ACTIVE",
      },
      create: {
        clerk_user_id: CLERK_USER_ID,
        tenant_id: tenant.id,
        email: USER_EMAIL || "admin@producao.com",
        name: USER_NAME || "Administrador",
        role: "ADMIN",
        status: "ACTIVE",
      },
    })

    console.log("✅ Sucesso! Usuário Admin configurado.")
    console.log(`Internal ID: ${user.id}`)
    console.log(`Ficou vinculado ao Tenant: ${tenant.name}`)

  } catch (error) {
    console.error("❌ Erro ao configurar Admin:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

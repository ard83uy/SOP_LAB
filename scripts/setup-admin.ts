import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Configurações (Ajuste se precisar)
  const CLERK_USER_ID = process.env.CLERK_USER_ID ?? "user_3C6JRrjk7C8UJUxSfkH5H7OeYH2"
  const USER_EMAIL = "alvaro@labarbara.com.br"
  const USER_NAME = "Alvaro Delacoste"

  console.log("🚀 Iniciando Setup de Admin...")

  try {
    // Garantir que o Tenant existe (usa slug como chave para ser idempotente)
    console.log("🏢 Verificando Tenant...")
    const tenant = await prisma.tenant.upsert({
      where: { slug: "la-barbara" },
      update: {},
      create: {
        name: "La Barbara",
        slug: "la-barbara",
        active_modules: { handover: true, production: true },
      }
    })
    const TENANT_ID = tenant.id
    console.log(`   Tenant ID: ${TENANT_ID}`)

    console.log("👤 Verificando Usuário...")
    const user = await prisma.user.upsert({
      where: { clerk_user_id: CLERK_USER_ID },
      update: {
        tenant_id: TENANT_ID,
        role: "ADMIN",
        status: "ACTIVE",
      },
      create: {
        clerk_user_id: CLERK_USER_ID,
        tenant_id: TENANT_ID,
        email: USER_EMAIL,
        name: USER_NAME,
        role: "ADMIN",
        status: "ACTIVE",
      },
    })

    console.log("✅ Sucesso! Usuário Admin configurado.")
    console.log("--- Detalhes ---")
    console.log(`ID Interno: ${user.id}`)
    console.log(`Clerk ID: ${user.clerk_user_id}`)
    console.log(`Tenant vinculado: ${user.tenant_id}`)
    console.log("---")
    console.log("Agora você já pode acessar localhost:3000 e entrar direto no Painel!")

  } catch (error) {
    console.error("❌ Erro ao configurar Admin:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

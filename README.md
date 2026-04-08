# SOP Mobile

> Gestão operacional de restaurantes — Back-of-House, Mobile-First, Multi-tenant.

SOP Mobile digitaliza a troca de turno de cozinhas: cozinheiros contam os insumos da praça ao sair, a produção vê em tempo real o que precisa preparar. Cria accountability, elimina conflitos entre turnos.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16.x (App Router) |
| Database | PostgreSQL via Railway |
| ORM | Prisma 6.x |
| Auth | Clerk |
| Styling | Tailwind CSS v4 + shadcn (base-ui) |
| State | TanStack React Query 5.x |
| Deploy | Railway (GitOps) |

---

## Desenvolvimento Local

```bash
npm install
npm run dev
```

O projeto conecta diretamente ao banco de dev no Railway (sem banco local).
Configure o `.env` com:
```
DATABASE_URL=postgresql://...   # Railway Dev DB
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

---

## Migrations

```bash
# Nova migration
npx prisma migrate dev --name nome_da_mudanca

# Aplicar em staging/prod
npx prisma migrate deploy
```

---

## Estrutura do Projeto

```
app/
  api/                    # API Routes (Next.js)
    users/                # CRUD usuários
    user-profiles/        # Perfis de usuário
    stations/             # Praças
    prep-items/           # Insumos
    handovers/            # Contagem de turno
    production/           # Dashboard e logs de produção
    recipes/              # Fichas técnicas
  (authenticated)/        # Páginas protegidas
    admin/
      stations/           # Gestão de praças
      prep-items/         # Catálogo de insumos
      team/               # Gestão de equipe
      fichas-tecnicas/    # Fichas técnicas (admin)
      settings/           # Configurações do sistema
        profiles/         # Perfis de usuário
    staff/
      handover/           # Contagem de turno
      production/         # Dashboard de produção
      fichas/             # Fichas técnicas (staff)
components/
  layout/                 # BottomNav, PageHeader, EmptyState
  ui/                     # shadcn components (base-ui)
lib/
  middlewares/            # compose, withAuth, withTenant, withRole, withModule, withValidation
  prisma.ts               # PrismaClient singleton
  timezone.ts             # Helpers America/Sao_Paulo
  validations/schemas.ts  # Zod schemas compartilhados
prisma/
  schema.prisma           # Data model
  migrations/             # Histórico de migrations
docs/
  01_PRD.md               # Product Requirements
  02_SPECS.md             # Technical Specifications (fonte de verdade)
  03_BACKLOG.md           # Backlog e histórico de features
  DEPLOY_GUIDE.md         # Guia de deploy e infraestrutura
```

---

## Conceitos-chave

### Perfis de Usuário
Cada colaborador tem um **Perfil** (criado pelo gerente em Configurações → Perfis). O perfil define:
- **Nome da função** (ex: "Barista", "Cozinheiro de Produção")
- **Nível de acesso** (`base_role`: ADMIN, MANAGER, STATION_LEADER, STAFF)
- **Módulos visíveis** (`allowed_modules`): quais telas aparecem no menu

O `BottomNav` é gerado dinamicamente pelos `allowed_modules` do perfil.

### Middleware Stack
```ts
compose(withAuth, withTenant, withRole(["ADMIN", "MANAGER"]), withValidation(schema), handler)
```
Toda rota de API usa `compose()` de `lib/middlewares/`.

### Multi-tenancy
Todo acesso ao banco inclui `where: { tenant_id }`. Nunca acessar dados sem filtro de tenant.

---

## Deploy

Ver [docs/DEPLOY_GUIDE.md](docs/DEPLOY_GUIDE.md) para instruções completas.

**Fluxo resumido:** `feature/*` → PR → `beta` (auto-deploy Railway Staging) → PR → `main` (auto-deploy Railway Prod)

⚠️ **Nunca commitar diretamente em `beta` ou `main` sem autorização explícita do usuário.**

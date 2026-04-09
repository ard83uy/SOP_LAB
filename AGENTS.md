<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deployment and Commit Rules
- **NEVER** commit or push to the `beta` or `main`/production branches without the USER's express authorization.
- All code changes should remain local until approval for deployment is granted.

---

# SOP Mobile — Guia de Continuação para IAs

## Onde ler antes de começar
- `docs/01_PRD.md` — produto, personas, features implementadas
- `docs/02_SPECS.md` — data model completo, middleware stack, todas as API routes, convenções
- `docs/03_BACKLOG.md` — o que já foi feito e o que vem a seguir
- `docs/ARA.md` — decisões arquiteturais e seus trade-offs
- `docs/DEPLOY_GUIDE.md` — infraestrutura, GitOps, migrations, troubleshooting

## Regras invioláveis do código

### Banco de dados
- Toda query Prisma inclui `where: { tenant_id }` — sem exceções
- Após qualquer alteração no `schema.prisma`: `npx prisma generate`
- Migrations NÃO usam `prisma migrate dev` (requer TTY). Criar SQL manualmente em `prisma/migrations/TIMESTAMP_nome/migration.sql` e aplicar com `npx prisma migrate deploy`

### API Routes
- Toda rota usa `compose(withAuth, withTenant, ...)` de `lib/middlewares/compose`
- `req.ctx` disponível: `{ tenant_id, user_id, role, profile_id, parsedBody }`
- `profile_id` é injetado pelo `withTenant` — usar para controle de acesso por perfil

### Fichas Técnicas (Recipes)
- Campo de acesso: `allowed_profile_ids String[]` (UUIDs de UserProfile)
- **NÃO** usar `allowed_roles` — foi removido na migration `20260408200000`
- ADMIN/MANAGER veem todas as fichas; outros filtrados por `profile_id ∈ allowed_profile_ids`

### Frontend
- UI é `@base-ui/react` (não `@radix-ui`) — props podem diferir do shadcn padrão
  - `Select.onValueChange` recebe `(value: string | null, eventDetails) => void`
  - Accordion: verificar docs em `node_modules/@base-ui-components/react/`
- TanStack Query v5 para estado do servidor — ver React Query Keys em `docs/02_SPECS.md`
- Tailwind v4 — usar variáveis semânticas (`bg-background`, `text-foreground`), nunca `slate-*`

### Sistema de Perfis
- `UserProfile.allowed_modules` controla quais telas o colaborador vê no BottomNav
- `User.role` é SEMPRE derivado de `UserProfile.base_role` — nunca editar diretamente
- ADMIN/MANAGER sem perfil → fallback para ver todos os módulos

## Estrutura de arquivos relevante

```
app/
  (authenticated)/
    admin/
      fichas-tecnicas/          ← CRUD fichas (seletor de perfis, não roles)
      settings/profiles/        ← Gestão de perfis
      team/                     ← Equipe (usa profile_id)
    staff/
      fichas/                   ← Leitura filtrada por perfil
lib/
  middlewares/
    compose.ts                  ← AppContext type (inclui profile_id)
    withTenant.ts               ← Injeta profile_id no ctx
  validations/schemas.ts        ← createRecipeSchema usa allowed_profile_ids
prisma/
  schema.prisma                 ← Fonte de verdade do modelo
  migrations/                   ← Histórico de migrations aplicadas
scripts/
  seed-profiles.ts              ← Seed de perfis padrão para um tenant
```

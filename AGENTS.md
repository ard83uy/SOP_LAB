<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deployment and Commit Rules
- **NEVER** commit or push to the `beta` or `main`/production branches without the USER's express authorization.
- All code changes should remain local until approval for deployment is granted.

---

# Versionamento — REGRA OBRIGATÓRIA

O projeto segue **SemVer** (`MAJOR.MINOR.PATCH`). A versão é a fonte de verdade do que está em produção e DEVE estar visível ao gerente no header da aplicação.

## Quando incrementar

| Tipo de mudança | Bump | Exemplo |
|---|---|---|
| Bug fix sem mudança de API/UX | PATCH (`0.1.0` → `0.1.1`) | Corrigir cálculo `to_produce`, erro de validação |
| Nova feature, novo endpoint, novo módulo, mudança de UX | MINOR (`0.1.0` → `0.2.0`) | Adicionar sub-tabs no Insumos, novo módulo de Menu |
| Breaking change em schema, API ou contrato com cliente | MAJOR (`0.x.x` → `1.0.0`) | Renomear endpoint, remover campo do schema, mudança de auth |

## Processo obrigatório a cada alteração

Toda IA que modificar código DEVE, antes de finalizar a tarefa:

1. Atualizar `package.json` → campo `version` (SemVer)
2. Adicionar entrada no topo de `CHANGELOG.md` no formato abaixo
3. Mencionar a nova versão na resposta final ao usuário

```markdown
## [0.2.0] - 2026-MM-DD

### Added
- Sub-tabs de categoria (Primary/Manipulated/Intermediate/Final) na tela de Insumos
- Endpoint `GET /api/prep-items?category=`

### Changed
- `PrepItem` agora tem campo `category: RecipeCategory`

### Fixed
- Cálculo de `to_produce` ignorando produção do dia anterior

### Migration
- `20260520_add_category_to_prep_items`
```

Seções permitidas: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`, `Migration`.

## Exibição da versão

- TopNav (visão ADMIN/MANAGER): badge `v0.X.Y` ao lado do logo SOP
- Clicar no badge → modal/dialog com as últimas 5 entradas do CHANGELOG
- A versão é lida em build-time de `package.json` via `process.env.NEXT_PUBLIC_APP_VERSION` (definida no `next.config.ts`)
- STAFF (não-gerente): NÃO vê o badge — apenas o logo

## Documentação adicional

- Mudanças que afetam o data model também devem ser refletidas em `docs/02_SPECS.md`
- Mudanças que afetam features para usuários finais também em `docs/01_PRD.md`
- Decisões arquiteturais novas → registrar em `docs/ARA.md` como novo ARA-NNN

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

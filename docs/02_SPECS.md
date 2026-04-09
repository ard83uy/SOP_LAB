# Technical Specifications

> **Última atualização:** 2026-04-08
> **Fonte de verdade:** o código. Este documento reflete o estado real da implementação.

---

## 1. Architecture

API-First com separação clara entre Frontend (Next.js App Router) e Backend (Next.js API Routes).
Multi-tenancy com isolamento lógico via `tenant_id` em todas as tabelas.
GitOps de 3 ambientes (Dev → Beta → Prod) com deploy automático via Railway.

### Princípios
- **Zero Trust:** Todo request é autenticado (Clerk JWT) e autorizado (RBAC + tenant_id).
- **Mobile-First:** UI desenhada primariamente para telas de celular.
- **Modularidade:** Features controladas por `active_modules` no Tenant (feature gating) e por `allowed_modules` no UserProfile (visibilidade por perfil).
- **Observabilidade:** Logger Pino estruturado com `user_id`, `tenant_id`, `request_id` e Error Handler global.

### GitOps (3 Tiers)
| Tier | Branch | Railway Env | Database | Clerk |
|------|--------|-------------|----------|-------|
| Dev (Local) | `feature/*` | - | PostgreSQL Dev (Railway) | Development |
| Beta (Staging) | `beta` | Auto-deploy | PostgreSQL Beta | Development |
| Production | `main` | Auto-deploy | PostgreSQL Prod | Production |

---

## 2. Tech Stack

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| Framework | Next.js (App Router) | 16.2.2 |
| Database | PostgreSQL (Railway hosted) | — |
| ORM | Prisma | 6.x |
| Auth | Clerk (`@clerk/nextjs`) | 7.x |
| Styling | Tailwind CSS v4 + shadcn (base-ui) | 4.x |
| State | TanStack React Query | 5.x |
| Validation | Zod | 4.x |
| Logging | Pino | 10.x |
| Deploy | Railway (GitOps) | — |

> **Atenção:** O projeto usa `@base-ui/react` como primitivo para shadcn (Accordion, Select, etc.) — não `@radix-ui`. As props podem diferir do shadcn padrão (ex: `onValueChange` recebe `(value: string | null, eventDetails) => void`).

---

## 3. Data Model

### Diagrama de relacionamentos

```
Tenant (1) ──< User (many)
Tenant (1) ──< UserProfile (many)
UserProfile (1) ──< User (many)       ← perfil define função e módulos
Tenant (1) ──< Station (many)
Tenant (1) ──< PrepItem (many)
Station (many) >──< PrepItem (many)   ← relação M:M
PrepItem (1) ──< PrepItemDayTarget (many)
PrepItem (1) ──< PrepItemRequest? (0..1)
ShiftHandover (1) ──< HandoverItemCount (many)
ShiftHandover (1) ──< ProductionLog (many)
Recipe (1) ──< RecipeIngredient (many)
Recipe (1) ──< RecipeStep (many)
Recipe (1) ──< RecipeComment (many)
Checklist (1) ──< ChecklistTask (many)
Checklist (many) >──< UserProfile (many)  ← M:M
ChecklistTask (1) ──< ChecklistCompletion (many)
```

### Tenant

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | |
| name | String | Nome do restaurante |
| slug | String unique | URL-friendly identifier |
| active_modules | JSONB | Feature gating: `{"handover": true, "production": true}` |
| max_employees | Int | Limite de usuários (billing), default 10 |
| created_at | DateTime | |

### UserProfile ⭐ (central — define função do colaborador)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | |
| tenant_id | UUID FK → Tenant | |
| name | String | Nome da função (ex: "Barista", "Cozinheiro de Produção") |
| base_role | UserRole | Nível de acesso no sistema |
| allowed_modules | JSONB | Módulos visíveis: `{"handover": true, "fichas": true, ...}` |
| created_at | DateTime | |
| **unique** | (tenant_id, name) | |

**Módulos disponíveis em `allowed_modules`:**
`stations` | `handover` | `production` | `prep_items` | `fichas` | `settings`

### User

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | |
| clerk_user_id | String unique | ID do Clerk (bridge auth) |
| tenant_id | UUID FK → Tenant | |
| role | UserRole | Derivado de `profile.base_role` automaticamente |
| profile_id | UUID FK → UserProfile? | Perfil atribuído (nullable) |
| name | String | |
| email | String | |
| status | UserStatus | ACTIVE \| ONBOARDING \| INACTIVE |
| created_at | DateTime | |

### Enums

```prisma
enum UserRole {
  ADMIN           // controle total
  MANAGER         // controle operacional completo
  STATION_LEADER  // líder de área operacional
  STAFF           // colaborador básico
  PREP_KITCHEN    // (legado, em processo de unificação com STATION_LEADER)
}

enum UserStatus { ACTIVE | ONBOARDING | INACTIVE }
enum RequestStatus { PENDING | APPROVED | REJECTED }
enum RecipeCategory { PRIMARY | MANIPULATED | INTERMEDIATE | FINAL }
enum ChecklistFrequency { DAILY | SPECIFIC_DAYS }
enum TimeSlot { ALL_DAY | OPENING | MIDDAY | CLOSING }
```

### Station

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| name | String | Ex: "Grelha", "Salada", "Bar" |
| icon | String? | Nome do ícone Lucide, default "UtensilsCrossed" |
| created_at | DateTime | |
| **unique** | (tenant_id, name) | |

### PrepItem (Insumo)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| name | String | |
| unit | String | "kg", "litros", "unidades", etc |
| target_quantity | Float | Par Level padrão |
| created_at | DateTime | |

Relacionamentos: `stations[]` (M:M), `dayTargets[]`, `requestSource?`, `recipeIngredients[]`

### Recipe (Ficha Técnica)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| name | String | |
| description | String? | |
| category | RecipeCategory | PRIMARY \| MANIPULATED \| INTERMEDIATE \| FINAL |
| base_yield | Float | Ex: 10 (porções) |
| yield_unit | String | Ex: "porções", "kg" |
| photo_url | String? | |
| **allowed_profile_ids** | String[] | UUIDs dos perfis que podem visualizar esta ficha |
| created_at / updated_at | DateTime | |

> ⚠️ `allowed_profile_ids` substituiu `allowed_roles` (migration `20260408200000`). ADMIN/MANAGER sempre veem todas as fichas, independentemente deste campo.

Sub-modelos: `RecipeIngredient`, `RecipeStep`, `RecipeComment`

### Checklist

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| name | String | |
| description | String? | |
| is_active | Boolean | default true |
| created_by | UUID FK → User | |
| profiles | UserProfile[] | M:M — quais perfis executam este checklist |

Sub-modelos: `ChecklistTask`, `ChecklistCompletion`

### ChecklistTask

| Campo | Tipo | Descrição |
|-------|------|-----------|
| frequency | ChecklistFrequency | DAILY \| SPECIFIC_DAYS |
| days_of_week | Int[] | 0=Dom…6=Sáb (usado quando SPECIFIC_DAYS) |
| time_slot | TimeSlot | ALL_DAY \| OPENING \| MIDDAY \| CLOSING |
| points | Int | Pontuação da tarefa (gamificação futura) |
| sort_order | Int | Ordem de exibição |

---

## 4. Middleware Stack

```ts
// Toda rota de API usa compose():
export const GET = compose(withAuth, withTenant, handler);
export const POST = compose(withAuth, withTenant, withRole(["ADMIN"]), withValidation(schema), handler);
```

| Middleware | Função | Injeta em req.ctx |
|---|---|---|
| `withAuth` | Valida JWT Clerk | `clerk_user_id` |
| `withTenant` | Resolve user no DB | `tenant_id`, `user_id`, `role`, **`profile_id`** |
| `withRole(["ADMIN"])` | Verifica role. Rejeita `403` | — |
| `withModule("production")` | Verifica `tenant.active_modules`. Rejeita `403` | — |
| `withValidation(schema)` | Parseia body Zod | `parsedBody` |

**`req.ctx` completo:**
```ts
type AppContext = {
  clerk_user_id?: string;
  tenant_id?: string;
  user_id?: string;
  role?: string;
  profile_id?: string | null;  // ← disponível em todos os handlers
  parsedBody?: any;
};
```

**Regra inviolável:** toda query Prisma inclui `where: { tenant_id }`.

---

## 5. API Routes

### Tenant & Auth
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| POST | `/api/tenants` | Public | Cria restaurante + admin |
| GET | `/api/users/me` | Any | Perfil + tenant + profile + allowed_modules |

### Users
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/users` | ADMIN\|MANAGER | Lista usuários com perfil |
| POST | `/api/users` | ADMIN\|MANAGER | Cria usuário (Clerk) — aceita `profile_id` |
| PATCH | `/api/users/[id]` | ADMIN\|MANAGER | Atualiza nome, `profile_id`, senha |
| DELETE | `/api/users/[id]` | ADMIN\|MANAGER | Remove do Clerk + DB |

### UserProfiles
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/user-profiles` | ADMIN\|MANAGER | Lista perfis com usuários e contagem |
| POST | `/api/user-profiles` | ADMIN\|MANAGER | Cria perfil (`name`, `base_role`) |
| PATCH | `/api/user-profiles/[id]` | ADMIN\|MANAGER | Atualiza `name`, `base_role`, `allowed_modules` |
| DELETE | `/api/user-profiles/[id]` | ADMIN\|MANAGER | Remove (bloqueado se tem usuários) |

### Recipes (Fichas Técnicas)
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/recipes` | Any | Lista fichas — ADMIN/MANAGER veem todas; outros filtrado por `profile_id` ∈ `allowed_profile_ids` |
| POST | `/api/recipes` | ADMIN\|MANAGER | Cria ficha — aceita `allowed_profile_ids: string[]` |
| GET | `/api/recipes/[id]` | Any | Detalhe — verifica `profile_id` no `allowed_profile_ids` |
| PATCH | `/api/recipes/[id]` | ADMIN\|MANAGER | Atualiza ficha e `allowed_profile_ids` |
| DELETE | `/api/recipes/[id]` | ADMIN\|MANAGER | Remove ficha |

### Checklists
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET/POST | `/api/checklists` | Any/ADMIN\|MANAGER | Lista e cria checklists |
| GET/PATCH/DELETE | `/api/checklists/[id]` | Any/ADMIN\|MANAGER | CRUD individual |
| GET/POST | `/api/checklists/[id]/tasks` | Any/ADMIN\|MANAGER | Tarefas do checklist |
| POST | `/api/checklist-completions` | Any | Marca tarefa como concluída |
| DELETE | `/api/checklist-completions` | Any | Desmarca tarefa |

### Stations, PrepItems, Handover, Production
| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/stations` | CRUD praças |
| GET/POST/DELETE | `/api/stations/[id]/prep-items` | Insumos da praça |
| GET/POST/PATCH/DELETE | `/api/prep-items/[id]` | CRUD insumos |
| GET/POST | `/api/prep-items/[id]/day-targets` | Par level por dia |
| GET/POST | `/api/handovers` | Contagem de turno |
| GET | `/api/production/dashboard` | Itens a produzir |
| GET/POST | `/api/production/log` | Histórico e registro |
| GET | `/api/production/theoretical` | Necessidade teórica |
| GET/POST | `/api/prep-item-requests` | Solicitações de insumo |
| POST | `/api/prep-item-requests/[id]/review` | Aprovação/rejeição |
| GET | `/api/health` | Health check |

---

## 6. UI Routes

```
/                                      Landing (redireciona se logado)
/sign-in/[[...sign-in]]               Clerk SignIn
/sign-up/[[...sign-up]]               Clerk SignUp
/(authenticated)/                     Layout com BottomNav dinâmico
  /admin/stations                     CRUD praças
  /admin/stations/[id]/prep-items     Insumos da praça
  /admin/prep-items                   Catálogo global de insumos
  /admin/team                         Gestão de equipe (usa perfis)
  /admin/fichas-tecnicas              CRUD fichas técnicas (com seletor de perfis)
  /admin/fichas-tecnicas/[id]         Edição de ficha (ingredientes, passos, foto, perfis)
  /admin/settings                     Hub de Configurações
  /admin/settings/profiles            Gestão de perfis de usuário
  /admin/reports                      Relatórios (placeholder)
  /staff/handover                     Contagem de turno
  /staff/production                   Dashboard de produção
  /staff/fichas                       Visualização de fichas (filtradas pelo perfil)
```

---

## 7. BottomNav — Lógica de Visibilidade

O nav é gerado 100% pelos `allowed_modules` do perfil do usuário logado:

```ts
// ADMIN/MANAGER sem perfil → all modules (fallback)
// Todos os outros → filtra MODULE_LINKS pelos módulos true no perfil

const MODULE_LINKS = {
  stations:   "/admin/stations",
  handover:   "/staff/handover",
  production: "/staff/production",
  prep_items: "/admin/prep-items",
  fichas:     "/staff/fichas",
  settings:   "/admin/settings",
}
```

`/api/users/me` retorna `profile: { id, name, base_role, allowed_modules }`.

---

## 8. Lógica de Acesso às Fichas Técnicas

```
ADMIN ou MANAGER  →  vê todas as fichas (sem filtro)
Outros usuários   →  GET /api/recipes filtra: allowed_profile_ids ∋ req.ctx.profile_id
                  →  GET /api/recipes/[id] verifica: profile_id ∈ recipe.allowed_profile_ids
Sem perfil (STAFF puro)  →  não vê nenhuma ficha (allowed_profile_ids nunca inclui null)
```

---

## 9. Cálculos em Runtime (não persistidos)

```
effective_target   = dayTarget?.target_quantity ?? prepItem.target_quantity
to_produce         = max(0, effective_target − actual_quantity − already_produced)
theoretical_need   = effective_target − last_actual_quantity
current_quantity   = last_actual + already_produced
```

---

## 10. Convenções

### React Query Keys
| Key | Rota |
|---|---|
| `["me"]` | GET /api/users/me |
| `["team"]` | GET /api/users |
| `["team-profiles"]` | GET /api/user-profiles (team page) |
| `["user-profiles"]` | GET /api/user-profiles (settings page e fichas) |
| `["stations"]` | GET /api/stations |
| `["station-prep-items", stationId]` | GET /api/stations/[id]/prep-items |
| `["all-prep-items"]` | GET /api/prep-items |
| `["recipes"]` | GET /api/recipes |
| `["recipe", id]` | GET /api/recipes/[id] |
| `["production-dashboard"]` | GET /api/production/dashboard |
| `["production-history"]` | GET /api/production/log |
| `["production-theoretical"]` | GET /api/production/theoretical |
| `["handover-history"]` | GET /api/handovers |

### Timezone
Todas as datas usam `lib/timezone.ts` (America/Sao_Paulo):
- `nowSP()`, `todayDowSP()`, `formatSP(date?)`, `dateLabelSP(date)`, `timeLabelSP(date)`

### Design System
- **Fonte:** Plus Jakarta Sans via `next/font/google`
- **Primary:** laranja-âmbar `oklch(0.63 0.19 44)` (light) / `oklch(0.72 0.19 44)` (dark)
- **Variáveis semânticas Tailwind:** sempre `bg-background`, `text-foreground`, `text-muted-foreground`. Nunca `slate-*`
- **Componentes UI:** `components/ui/` — base-ui primitivos via shadcn CLI
- **Botão FAB mobile:** `fixed bottom-24 right-4 rounded-full h-14 w-14`

---

## 11. Segurança

- Nunca armazenar senhas (Clerk gerencia)
- Todo handler verifica `tenant_id` via middleware
- `allowed_modules` no perfil controla visibilidade da UI (não substitui middleware de API)
- `allowed_profile_ids` nas fichas controla acesso granular por perfil (não por role)
- Self-delete bloqueado: `req.ctx.user_id === id` → 400
- Perfil com usuários não pode ser excluído

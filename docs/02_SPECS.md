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
| Forms | react-hook-form + zodResolver | — |
| Validation | Zod | 4.x |
| Logging | Pino | 10.x |
| Animations | tw-animate-css | — |
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
Station (many) >──< PrepItem (many)   ← relação implícita M:M
PrepItem (1) ──< PrepItemDayTarget (many)
PrepItem (1) ──< PrepItemRequest? (0..1)
ShiftHandover (1) ──< HandoverItemCount (many)
ShiftHandover (1) ──< ProductionLog (many)
Recipe (1) ──< RecipeIngredient (many)
Recipe (1) ──< RecipeStep (many)
Recipe (1) ──< RecipeComment (many)
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
| base_role | UserRole | Nível de acesso no sistema (ver enum abaixo) |
| allowed_modules | JSONB | Módulos visíveis: `{"handover": true, "production": false, "fichas": true, ...}` |
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
```

### Station

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | |
| tenant_id | UUID FK → Tenant | |
| name | String | Ex: "Grelha", "Salada", "Bar" |
| icon | String? | Nome do ícone Lucide, default "UtensilsCrossed" |
| created_at | DateTime | |
| **unique** | (tenant_id, name) | |

### PrepItem (Insumo)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | |
| tenant_id | UUID FK → Tenant | |
| name | String | |
| unit | String | "kg", "litros", "unidades", etc |
| target_quantity | Float | Par Level padrão |
| created_at | DateTime | |
| **unique** | (tenant_id, name) | |

Relacionamentos: `stations[]` (M:M), `dayTargets[]`, `requestSource?`, `recipeIngredients[]`

### PrepItemDayTarget

Override de target_quantity por dia da semana.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | |
| prep_item_id | UUID FK → PrepItem | |
| day_of_week | Int | 0=Dom … 6=Sáb |
| target_quantity | Float | Override para este dia |
| **unique** | (prep_item_id, day_of_week) | |

### ShiftHandover (Contagem de Turno)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| user_id | UUID FK → User | Quem fez a contagem (accountability) |
| station_id | UUID FK → Station | |
| note | String? | Nota de passagem de turno |
| created_at | DateTime | Timestamp exato |

### HandoverItemCount

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | |
| shift_handover_id | UUID FK → ShiftHandover | |
| prep_item_id | UUID FK → PrepItem | |
| actual_quantity | Float | Quantidade real contada |
| **unique** | (shift_handover_id, prep_item_id) | |

### ProductionLog

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| prep_item_id | UUID FK → PrepItem | |
| user_id | UUID FK → User | Quem produziu (accountability) |
| shift_handover_id | UUID FK → ShiftHandover | Contagem que originou a demanda |
| produced_quantity | Float | Quantidade produzida |
| created_at | DateTime | |

### Recipe (Ficha Técnica)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| name | String | |
| description | String? | |
| category | RecipeCategory | |
| base_yield | Float | Ex: 10 (porções) |
| yield_unit | String | Ex: "porções", "kg" |
| photo_url | String? | |
| allowed_roles | UserRole[] | Roles que podem visualizar |
| created_at / updated_at | DateTime | |

Sub-modelos: `RecipeIngredient`, `RecipeStep`, `RecipeComment`

### PrepItemRequest

Colaborador solicita novo insumo; gestor aprova/rejeita. Se aprovado, cria o PrepItem.

---

## 4. Middleware Stack

```ts
// Toda rota de API usa compose():
export const GET = compose(withAuth, withTenant, withRole(["ADMIN"]), handler);
export const POST = compose(withAuth, withTenant, withRole(["ADMIN"]), withValidation(schema), handler);
```

| Middleware | Função |
|---|---|
| `withAuth` | Valida JWT Clerk → injeta `req.ctx.clerk_user_id` |
| `withTenant` | Resolve user no DB → injeta `tenant_id`, `user_id`, `role` |
| `withRole(["ADMIN"])` | Verifica se `req.ctx.role` está na lista. Rejeita `403` |
| `withModule("production")` | Verifica se módulo está em `tenant.active_modules`. Rejeita `403` |
| `withValidation(schema)` | Parseia body com Zod → injeta em `req.ctx.parsedBody` |

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
| PATCH | `/api/users/[id]` | ADMIN\|MANAGER | Atualiza nome, `profile_id`, senha, suspensão |
| DELETE | `/api/users/[id]` | ADMIN\|MANAGER | Remove do Clerk + DB |

### UserProfiles
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/user-profiles` | ADMIN\|MANAGER | Lista perfis com usuários e contagem |
| POST | `/api/user-profiles` | ADMIN\|MANAGER | Cria perfil (`name`, `base_role`) |
| PATCH | `/api/user-profiles/[id]` | ADMIN\|MANAGER | Atualiza `name`, `base_role`, `allowed_modules` |
| DELETE | `/api/user-profiles/[id]` | ADMIN\|MANAGER | Remove perfil (bloqueado se tem usuários) |

> PATCH `allowed_modules` sincroniza automaticamente o `role` de todos os usuários do perfil quando `base_role` muda.

### Stations
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/stations` | Any | Lista praças do tenant |
| POST | `/api/stations` | ADMIN\|MANAGER | Cria praça |
| GET | `/api/stations/[id]` | Any | Detalhe da praça |
| DELETE | `/api/stations/[id]` | ADMIN\|MANAGER | Remove praça |
| GET | `/api/stations/[id]/prep-items` | Any | Insumos da praça (enriched) |
| POST | `/api/stations/[id]/prep-items` | ADMIN\|MANAGER | Vincula insumo à praça |
| DELETE | `/api/stations/[id]/prep-items/[itemId]` | ADMIN\|MANAGER | Desvincula |

### PrepItems
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/prep-items` | Any | Catálogo global |
| POST | `/api/prep-items` | ADMIN\|MANAGER | Cria insumo |
| GET/PATCH/DELETE | `/api/prep-items/[id]` | Any/ADMIN | CRUD individual |
| GET/POST | `/api/prep-items/[id]/day-targets` | Any/ADMIN | Par level por dia da semana |

### Handover (Contagem)
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/handovers` | Any | Histórico 30 dias agrupado |
| POST | `/api/handovers` | Any | Submete contagem |
| GET | `/api/handovers/latest/[stationId]` | Any | Última contagem da praça |

### Production
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/production/dashboard` | Any | Itens a produzir (delta > 0) |
| GET/POST | `/api/production/log` | Any | Histórico e registro de produção |
| GET | `/api/production/theoretical` | Any | Necessidade teórica (sem descontar produção) |

### Recipes (Fichas Técnicas)
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET/POST | `/api/recipes` | Any/ADMIN\|MANAGER | Lista e cria fichas |
| GET/PATCH/DELETE | `/api/recipes/[id]` | Any/ADMIN\|MANAGER | CRUD individual |

### Outros
| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/prep-item-requests` | Solicitação de insumos por colaboradores |
| POST | `/api/prep-item-requests/[id]/review` | ADMIN aprova/rejeita |
| GET | `/api/health` | Health check |

---

## 6. UI Routes

```
/                                      Landing (redireciona se logado)
/sign-in/[[...sign-in]]               Clerk SignIn
/sign-up/[[...sign-up]]               Clerk SignUp
/(authenticated)/                     Layout com BottomNav
  /admin/stations                     CRUD praças
  /admin/stations/[id]/prep-items     Insumos da praça
  /admin/prep-items                   Catálogo global de insumos
  /admin/team                         Gestão de equipe (usa perfis)
  /admin/fichas-tecnicas              CRUD fichas técnicas
  /admin/fichas-tecnicas/[id]         Edição de ficha
  /admin/settings                     Hub de Configurações
  /admin/settings/profiles            Gestão de perfis de usuário
  /admin/reports                      Relatórios (placeholder)
  /staff/handover                     Contagem de turno
  /staff/production                   Dashboard de produção
  /staff/fichas                       Visualização de fichas
```

---

## 7. BottomNav — Lógica de Visibilidade

O nav é gerado 100% pelos `allowed_modules` do perfil do usuário logado:

```ts
// ADMIN/MANAGER sem perfil → all modules (fallback)
// Qualquer role → filtra MODULE_LINKS pelos módulos habilitados no perfil

const MODULE_LINKS = {
  stations:   "/admin/stations",
  handover:   "/staff/handover",
  production: "/staff/production",
  prep_items: "/admin/prep-items",
  fichas:     "/staff/fichas",
  settings:   "/admin/settings",
}
```

`/api/users/me` retorna `profile.allowed_modules` junto com o usuário.

---

## 8. Cálculos em Runtime (não persistidos)

```
effective_target   = dayTarget?.target_quantity ?? prepItem.target_quantity
to_produce         = max(0, effective_target − actual_quantity − already_produced)
theoretical_need   = effective_target − last_actual_quantity  (ignora produção já feita)
current_quantity   = last_actual + already_produced  (campo "Esperado agora" na UI)
```

---

## 9. Convenções

### React Query Keys
| Key | Rota |
|---|---|
| `["me"]` | GET /api/users/me |
| `["team"]` | GET /api/users |
| `["team-profiles"]` | GET /api/user-profiles (usado na team page) |
| `["user-profiles"]` | GET /api/user-profiles (usado na settings page) |
| `["stations"]` | GET /api/stations |
| `["station-prep-items", stationId]` | GET /api/stations/[id]/prep-items |
| `["all-prep-items"]` | GET /api/prep-items |
| `["production-dashboard"]` | GET /api/production/dashboard |
| `["production-history"]` | GET /api/production/log |
| `["production-theoretical"]` | GET /api/production/theoretical |
| `["handover-history"]` | GET /api/handovers |

### Timezone
Todas as datas usam `lib/timezone.ts` (America/Sao_Paulo):
- `nowSP()` — Date atual em SP
- `todayDowSP()` — dia da semana (0=Dom)
- `formatSP(date?)` — "Sáb, 05/04 — 19:32"
- `dateLabelSP(date)` — "15/04/2024"
- `timeLabelSP(date)` — "14:30"

### Design System
- **Fonte:** Plus Jakarta Sans via `next/font/google`
- **Primary:** laranja-âmbar `oklch(0.63 0.19 44)` (light) / `oklch(0.72 0.19 44)` (dark)
- **Variáveis semânticas Tailwind:** sempre usar `bg-background`, `text-foreground`, `text-muted-foreground`, etc. Nunca `slate-*`
- **Componentes UI:** `components/ui/` — base-ui primitivos via shadcn CLI
- **Animações:** tw-animate-css (`animate-in`, `fade-in`, `zoom-in-*`, `slide-in-from-*`)
- **Botão FAB mobile:** `fixed bottom-24 right-4 rounded-full h-14 w-14`

---

## 10. Segurança

- Nunca armazenar senhas (Clerk gerencia)
- Todo handler verifica `tenant_id` via middleware
- `allowed_modules` no perfil controla visibilidade da UI (não substitui middleware de API)
- Self-delete bloqueado: `req.ctx.user_id === id` → 400
- Perfil com usuários não pode ser excluído (proteção no DELETE)

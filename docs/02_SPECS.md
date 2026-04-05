# Technical Specifications (Specs)

## 1. Architecture
Arquitetura API-First com separação clara entre Frontend (Next.js) e Backend (API Routes / Serverless).
Multi-tenancy com isolamento lógico via `tenant_id` em todas as tabelas.
GitOps de 3 ambientes (Dev, Beta, Prod) com deploy automático via GitHub + Railway.

### Princípios
- **Zero Trust:** Todo request é autenticado (Clerk JWT) e autorizado (RBAC + tenant_id).
- **Mobile-First:** UI desenhada primariamente para telas de celular.
- **Modularidade:** Features controladas por `active_modules` no Tenant, permitindo Feature Gating.
- **Observabilidade:** Logger estruturado com contexto (user_id, tenant_id, request_id) e Error Handler global.

### GitOps (3 Tiers)
| Tier | Branch | Railway Env | Database | Clerk |
|------|--------|-------------|----------|-------|
| Dev (Local) | `feature/*`, `dev` | - | PostgreSQL Dev (Railway) | Development |
| Beta (Staging) | `beta` | Auto-deploy | PostgreSQL Beta (Railway) | Development |
| Production | `main` | Auto-deploy | PostgreSQL Prod (Railway) | Production |

## 2. Tech Stack
- **Frontend:** Next.js (App Router), React 18+
- **Backend:** Next.js API Routes (Node.js runtime)
- **Database:** PostgreSQL (Railway hosted, zero banco local)
- **ORM:** Prisma (type-safe, migrations)
- **Authentication:** Clerk (`@clerk/nextjs`)
- **Styling:** Tailwind CSS + shadcn/ui
- **Validation:** Zod (inputs e outputs da API)
- **State Management:** React Query (TanStack Query) para cache e sync
- **Logging:** Pino (structured JSON logs)

## 3. Data Model

### Entidades e Relacionamentos

#### Tenant (Restaurante)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | Identificador único |
| name | String | Nome do restaurante |
| slug | String (unique) | URL-friendly identifier |
| active_modules | JSONB | Módulos ativos (ex: `["handover", "production"]`) |
| max_employees | Int | Limite de funcionários (billing) |
| created_at | DateTime | Data de criação |

#### User (Funcionário)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | Identificador único |
| clerk_user_id | String (unique) | ID do Clerk |
| tenant_id | UUID (FK -> Tenant) | Restaurante ao qual pertence |
| role | Enum | ADMIN, LINE_COOK, PREP_KITCHEN |
| name | String | Nome completo |
| email | String | Email |
| status | Enum | ONBOARDING, ACTIVE, INACTIVE |
| created_at | DateTime | Data de criação |

#### Station (Praça)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | Identificador único |
| tenant_id | UUID (FK -> Tenant) | Restaurante |
| name | String | Nome da praça (ex: Grelha, Salada) |
| created_at | DateTime | Data de criação |

#### PrepItem (Insumo)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | Identificador único |
| tenant_id | UUID (FK -> Tenant) | Restaurante |
| station_id | UUID (FK -> Station) | Praça associada |
| name | String | Nome do insumo (ex: Tomate Fatiado) |
| unit | String | Unidade de medida (ex: kg, litros, un) |
| target_quantity | Float | Quantidade-alvo (Par Level) definida pelo gestor |
| created_at | DateTime | Data de criação |

#### ShiftHandover (Contagem de Troca de Turno)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | Identificador único |
| tenant_id | UUID (FK -> Tenant) | Restaurante |
| user_id | UUID (FK -> User) | Quem fez a contagem (accountability) |
| station_id | UUID (FK -> Station) | Praça contada |
| created_at | DateTime | Timestamp exato da contagem |

#### HandoverItemCount (Linha da Contagem)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | Identificador único |
| shift_handover_id | UUID (FK -> ShiftHandover) | Contagem pai |
| prep_item_id | UUID (FK -> PrepItem) | Insumo contado |
| actual_quantity | Float | Quantidade real encontrada na praça |

#### ProductionLog (Registro de Produção)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | Identificador único |
| tenant_id | UUID (FK -> Tenant) | Restaurante |
| prep_item_id | UUID (FK -> PrepItem) | Insumo produzido |
| user_id | UUID (FK -> User) | Quem produziu (accountability) |
| shift_handover_id | UUID (FK -> ShiftHandover) | Contagem que originou a demanda |
| produced_quantity | Float | Quantidade efetivamente produzida |
| created_at | DateTime | Timestamp da produção |

### Regras de Integridade
- Toda query DEVE incluir `WHERE tenant_id = ?` (isolamento multi-tenant).
- `clerk_user_id` é a ponte entre Clerk e nosso banco. Nunca armazenamos senhas.
- `to_produce_quantity` é calculado em runtime (`target_quantity - actual_quantity`, mínimo 0). Não é persistido no banco.

## 4. API Design

### Middleware Stack (ordem de execução)
1. **Auth Middleware (Clerk):** Valida JWT. Rejeita com `401` se inválido.
2. **Tenant Middleware:** Extrai `tenant_id` do token/banco e injeta no contexto do request.
3. **RBAC Middleware:** Verifica se a `role` do usuário tem permissão para a rota. Rejeita com `403`.
4. **Module Middleware:** Verifica se o módulo necessário está em `active_modules` do Tenant. Rejeita com `403`.

### Endpoints MVP

#### Tenant & Users
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| POST | `/api/tenants` | Public (signup) | Cria restaurante + admin |
| POST | `/api/users/invite` | ADMIN | Convida funcionário |
| GET | `/api/users/me` | Any | Retorna perfil, tenant e role |

#### Stations & PrepItems (Setup)
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| POST | `/api/stations` | ADMIN | Cria praça |
| GET | `/api/stations` | Any | Lista praças do tenant |
| POST | `/api/prep-items` | ADMIN | Cria insumo com unit e target_quantity |
| GET | `/api/stations/:id/prep-items` | Any | Lista insumos de uma praça |
| PATCH | `/api/prep-items/:id` | ADMIN | Atualiza par level ou unidade |

#### Handover (Contagem de Turno)
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| POST | `/api/handovers` | LINE_COOK | Submete contagem da praça |
| GET | `/api/handovers/latest/:stationId` | Any | Retorna última contagem de uma praça |

#### Production (Cozinha de Produção)
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/production/dashboard` | PREP_KITCHEN | Lista itens com delta > 0 (o que produzir) |
| POST | `/api/production/log` | PREP_KITCHEN | Registra quantidade produzida |

#### Integrações Futuras (Endpoints Reservados)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/roles` | Para o futuro sistema de Recrutamento IA |
| POST | `/api/v1/candidates/webhook` | Webhook do sistema de Recrutamento |
| GET | `/api/v1/menu-items` | Para o futuro sistema de Cardápio/Pedidos |

## 5. Security

### Autenticação (Clerk)
- Login via Clerk (email/password, social login).
- JWT validado em todo request pelo middleware.
- Instância Development (Dev + Beta) e Production (Prod) separadas.

### Autorização (RBAC)
| Role | Permissões |
|------|-----------|
| ADMIN | Tudo: setup de praças, insumos, convites, visualização de dashboards |
| LINE_COOK | Submeter contagens de turno, visualizar própria escala |
| PREP_KITCHEN | Visualizar dashboard de produção, registrar produção |

### Validação
- Zod em todos os payloads de entrada (request body, query params).
- Zod nos payloads de saída (response) para garantir contratos da API.

### Observabilidade
- Logger: Pino (JSON estruturado) com campos: `timestamp`, `level`, `message`, `user_id`, `tenant_id`, `request_id`.
- Error Handler Global: Captura exceções não tratadas, loga o stack trace e retorna `{ error: string, code: string, status: number }`.
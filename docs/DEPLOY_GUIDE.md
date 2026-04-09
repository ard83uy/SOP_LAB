# Guia de Deploy e Operação — SOP Mobile

> **Última atualização:** 2026-04-08

Este documento descreve a infraestrutura, fluxo GitOps e operações de manutenção da plataforma SOP Mobile.

---

## Capítulo 1: Visão Geral da Infraestrutura

### 3 Ambientes

| Tier | Branch Git | Railway Project | Banco | Clerk Instance |
|------|-----------|----------------|-------|----------------|
| **Dev (Local)** | `feature/*` | — | PostgreSQL Dev (Railway) | Development |
| **Beta (Staging)** | `beta` | `sop-beta` | PostgreSQL Beta | Development |
| **Production** | `main` | `sop-prod` | PostgreSQL Prod | Production |

### Componentes por ambiente
- **Web Service:** Next.js rodando no Railway (Node.js runtime)
- **Database:** PostgreSQL gerenciado pelo Railway (conexão via `DATABASE_URL`)
- **Auth:** Clerk (instâncias separadas Dev vs Prod)

---

## Capítulo 2: Pré-requisitos

- **GitHub:** repositório com branches `main` (protegida) e `beta`
- **Railway:** conta com dois projetos separados (beta e prod)
- **Clerk:** dois applications — Development (beta) e Production (prod)

---

## Capítulo 3: Setup Inicial — Ambiente Beta

1. **Novo projeto Railway** → Deploy from GitHub → selecionar repo → branch `beta`
2. **Adicionar PostgreSQL:** botão direito no canvas → Create Database → PostgreSQL
3. **Env vars no serviço web:**
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NODE_ENV=beta
   ```
4. **Rodar migrations:**
   ```bash
   railway link  # aponta para o projeto beta
   railway run npx prisma migrate deploy
   ```
5. **Seed de dados de teste:**
   ```bash
   railway run npx tsx scripts/seed-profiles.ts <tenant_id>
   ```
6. **Verificar:** `GET /api/health` deve retornar `{ healthy: true, environment: "beta" }`

---

## Capítulo 4: Setup Inicial — Ambiente Production

1. **Novo projeto Railway separado** → Deploy from GitHub → branch `main` (somente)
2. **Adicionar PostgreSQL** (banco físico separado)
3. **Env vars com chaves Production do Clerk:**
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   NODE_ENV=production
   ```
4. **Rodar migrations:**
   ```bash
   railway link  # aponta para o projeto prod
   railway run npx prisma migrate deploy
   ```
   ⚠️ **NUNCA rodar seed em produção.**

---

## Capítulo 5: Fluxo de Trabalho Diário (GitOps)

```
feature branch
     │
     ▼  PR + merge
   beta  ──────────────────→  Railway Beta (auto-deploy)
     │                              │
     │    QA OK                     │  testar em staging
     ▼  PR + merge                  ▼
   main  ──────────────────→  Railway Production (auto-deploy)
```

### Passo a passo

```bash
# 1. Criar feature branch a partir de beta
git checkout beta && git pull
git checkout -b feature/minha-feature

# 2. Desenvolver localmente
npm run dev  # conecta no banco de dev (Railway Dev)

# 3. Quando tiver migrations novas — NÃO usar migrate dev em modo não-interativo
#    Em vez disso, criar o arquivo SQL manualmente:
mkdir -p prisma/migrations/YYYYMMDDHHMMSS_nome_da_migration
# Escrever o SQL em prisma/migrations/.../migration.sql
# Aplicar com:
npx prisma migrate deploy
npx prisma generate

# 4. Abrir PR → beta
git push origin feature/minha-feature

# 5. Merge em beta → deploy automático Railway Beta
# Testar na URL de staging

# 6. Quando aprovado: PR beta → main
# Merge → deploy automático Railway Prod
```

> **Nota:** `prisma migrate dev` requer TTY interativo. Em ambientes não-interativos (CI, Railway run), use sempre `prisma migrate deploy` com arquivos SQL pré-criados.

---

## Capítulo 6: Migrations em Produção

Toda nova migration é aplicada automaticamente no deploy pelo Railway via:
```json
// railway.json
{ "deploy": { "startCommand": "npx prisma migrate deploy && node server.js" } }
```

Para migrations manuais de emergência:
```bash
railway link  # selecionar projeto prod
railway run npx prisma migrate deploy
```

### Histórico de migrações aplicadas

| Data | Migration | Descrição |
|------|-----------|-----------|
| 2026-04-05 | `20260405183933_init` | Schema completo MVP |
| 2026-04-05 | `20260405210000_day_targets_requests` | PrepItemDayTarget e PrepItemRequest |
| 2026-04-07 | `20260407002318_sync_schema` | Sincronização do schema |
| 2026-04-07 | `20260407022308_add_note_to_shift_handover` | Campo note no ShiftHandover |
| 2026-04-07 | `20260407123305_add_station_icon` | Campo icon na Station |
| 2026-04-08 | `20260408044601_add_recipe_models` | Recipe, RecipeIngredient, RecipeStep, RecipeComment |
| 2026-04-08 | `20260408141227_add_user_profiles` | Modelo UserProfile + profile_id no User |
| 2026-04-08 | `20260408143451_add_base_role_to_profiles` | Campo base_role no UserProfile |
| 2026-04-08 | `20260408145844_add_allowed_modules_to_profiles` | Campo allowed_modules no UserProfile |
| 2026-04-08 | `20260408155707_add_checklists_module` | Checklist, ChecklistTask, ChecklistCompletion |
| 2026-04-08 | `20260408200000_replace_allowed_roles_with_profile_ids` | Recipe: `allowed_roles` → `allowed_profile_ids String[]` |

---

## Capítulo 7: Seed de Perfis Padrão

Para ambientes de teste, criar perfis padrão para um tenant existente:

```bash
npx tsx scripts/seed-profiles.ts <tenant_id>
```

Perfis padrão e seus módulos:
| Perfil | base_role | Módulos |
|--------|-----------|---------|
| Admin | ADMIN | todos |
| Gerente | MANAGER | todos |
| Líder de Praça | STATION_LEADER | handover, fichas |
| Cozinheiro de Produção | STATION_LEADER | production, fichas |
| Funcionário | STAFF | handover, fichas |

---

## Capítulo 8: Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | PostgreSQL connection string (injetada pelo Railway) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Sim | Clerk publishable key |
| `CLERK_SECRET_KEY` | Sim | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sim | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sim | `/sign-up` |
| `NODE_ENV` | Recomendado | `beta` ou `production` |

---

## Capítulo 9: Troubleshooting

### Build falhou / Prisma error
```bash
railway run npx prisma generate
railway run npx prisma migrate deploy
```

### "Relation does not exist"
```bash
railway run npx prisma migrate deploy
```

### Rollback de emergência
**Opção 1 (Railway):** Dashboard → Deployments → encontrar o build anterior verde → Redeploy

**Opção 2 (Git):**
```bash
git revert HEAD
git push origin main
```

### Prisma Studio
```bash
railway run npx prisma studio
```

### Verificar saúde
```
GET /api/health
→ { healthy: true, timestamp: "...", environment: "production" }
```

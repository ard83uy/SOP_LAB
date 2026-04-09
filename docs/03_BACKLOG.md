# Project Backlog

> **Última atualização:** 2026-04-08

---

## ✅ Concluído

### Fundação (MVP)
- [x] Setup do projeto, Git, Clerk, Logger e Error Handler
- [x] Schema Prisma, migrações PostgreSQL (Railway)
- [x] API endpoints com Zod e RBAC
- [x] UI Mobile-First
- [x] railway.json, Deploy Guide e configuração GitOps
- [x] Multi-tenancy com isolamento por `tenant_id`
- [x] Feature gating via `tenant.active_modules`

### Operação
- [x] CRUD de Praças com ícone customizável
- [x] Catálogo de Insumos (many-to-many com praças)
- [x] Par Level por dia da semana (`PrepItemDayTarget`)
- [x] Contagem de Troca de Turno (Handover)
- [x] Dashboard de Produção com delta em tempo real
- [x] Necessidade Teórica
- [x] Registro de Produção com accountability
- [x] Histórico 30 dias (contagens + produções)
- [x] Solicitação de insumo por colaborador (`PrepItemRequest`)

### Gestão de Equipe
- [x] CRUD completo de Equipe (cria via Clerk API, edita, suspende, exclui)

### Fichas Técnicas
- [x] CRUD completo: ingredientes, passos, foto, categoria, escala de porções
- [x] Comentários por receita
- [x] **Controle de acesso por perfil** (`allowed_profile_ids`) — substituiu `allowed_roles`

### Sistema de Perfis de Usuário ⭐
- [x] Modelo `UserProfile` com `name`, `base_role`, `allowed_modules`
- [x] Gerente cria e gerencia perfis no menu Configurações
- [x] Accordion com usuários por perfil + edição inline de nome
- [x] Toggle de módulos visíveis por perfil (stations, handover, production, prep_items, fichas, settings)
- [x] BottomNav dinâmico pelos `allowed_modules` do perfil
- [x] Team page: dropdown de Perfil (não mais Role fixo)
- [x] Sincronização automática de `role` ao mudar `base_role` do perfil
- [x] `withTenant` injeta `profile_id` em `req.ctx` para todos os handlers
- [x] `/api/users/me` retorna `profile.allowed_modules`

### Checklists
- [x] CRUD de checklists com tarefas (frequência, time_slot, pontos)
- [x] Atribuição de checklists a perfis de usuário (M:M)
- [x] Registro de completions por tarefa/usuário/data (com deduplicação por dia)

### Configurações
- [x] Menu de Configurações (`/admin/settings`) como hub expansível
- [x] Gestão de Perfis em `/admin/settings/profiles`

---

## 🚧 Próximos Passos Imediatos

- [ ] **Praças por perfil:** quais praças o colaborador vê na contagem (atualmente vê todas)
- [ ] **Unificar `PREP_KITCHEN` → `STATION_LEADER`:** role legado ainda existe no enum
  - Migrar usuários PREP_KITCHEN → STATION_LEADER no banco
  - Remover enum do schema

---

## 📋 Backlog (Pós-MVP)

### UX / Produto
- [ ] Onboarding guiado para novos tenants (wizard de setup inicial)
- [ ] Perfis pré-definidos como template ao criar novo tenant
- [ ] Notificações push (ex: "produção abaixo do target")
- [ ] Modo offline (PWA com sync)
- [ ] Export de histórico para CSV/PDF

### Módulos Novos
- [ ] **Escalas de Trabalho:** calendário de turnos, alocação por praça
- [ ] **Gestão de Ponto:** registro de entrada/saída
- [ ] **Relatórios avançados:** consumo por período, eficiência de produção
- [ ] **Dashboard gerencial consolidado:** visão de todas as praças ao mesmo tempo

### Infraestrutura
- [ ] **Previsão de Demanda (IA):** Par Level automático baseado em histórico
- [ ] **Multi-unidade:** gestão de redes de restaurantes
- [ ] **API pública v1:** endpoints para integração com Cardápio/PDV e Recrutamento IA
- [ ] **Webhooks:** notificações para sistemas externos
- [ ] **Billing:** limites por plano, cobrança por número de usuários

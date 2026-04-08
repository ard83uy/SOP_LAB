# Project Backlog

> **Última atualização:** 2026-04-08

---

## ✅ Concluído

### Fundação (Fases 1–5 MVP)
- [x] Setup do projeto, Git, Clerk, Logger e Error Handler
- [x] Schema Prisma, migrações PostgreSQL (Railway)
- [x] API endpoints (Handover, Production, Setup) com Zod e RBAC
- [x] UI Mobile-First (Admin Setup, Handover, Production Dashboard)
- [x] railway.json, Deploy Guide e configuração GitOps
- [x] Multi-tenancy com isolamento por `tenant_id`
- [x] Feature gating via `tenant.active_modules`

### Operação
- [x] CRUD de Praças com ícone customizável
- [x] Catálogo de Insumos (many-to-many com praças)
- [x] Par Level por dia da semana (`PrepItemDayTarget`)
- [x] Contagem de Troca de Turno (Handover)
- [x] Dashboard de Produção com delta em tempo real
- [x] Necessidade Teórica (estimativa sem descontar produção)
- [x] Registro de Produção com accountability
- [x] Histórico 30 dias (contagens + produções)
- [x] Solicitação de insumo por colaborador (`PrepItemRequest`)

### Gestão
- [x] CRUD completo de Equipe (cria via Clerk API, edita, suspende, exclui)
- [x] Fichas Técnicas (receitas) com ingredientes, passos, foto, escala, comentários
- [x] Controle de acesso das fichas por role

### Sistema de Perfis de Usuário ⭐ (novo)
- [x] Modelo `UserProfile` com `name`, `base_role`, `allowed_modules`
- [x] Gerente cria e gerencia perfis no menu Configurações
- [x] Accordion com lista de usuários por perfil e edição inline do nome
- [x] Checkboxes de módulos visíveis por perfil (stations, handover, production, prep_items, fichas, settings)
- [x] BottomNav dinâmico: gerado pelos `allowed_modules` do perfil (não mais hardcoded por role)
- [x] Team page: dropdown de "Perfil" substituiu dropdown de "Role" fixo
- [x] Sincronização automática de `role` ao mudar `base_role` do perfil
- [x] `/api/users/me` retorna `profile.allowed_modules`

### Configurações
- [x] Menu de Configurações (`/admin/settings`) como hub expansível
- [x] Equipe acessível a partir de Configurações

---

## 🚧 Em Andamento / Próximos Passos Imediatos

- [ ] Unificar `PREP_KITCHEN` → `STATION_LEADER` (remover role obsoleto)
  - Migrar usuários PREP_KITCHEN → STATION_LEADER no banco
  - Atualizar enum no schema Prisma
  - Atualizar referências em fichas técnicas (`allowed_roles`)
- [ ] Configurar **praças visíveis por perfil** (quais praças o colaborador vê na contagem)
- [ ] Configurar **fichas visíveis por perfil** (substituir `allowed_roles` fixo por perfil)

---

## 📋 Backlog (Pós-MVP)

### UX / Produto
- [ ] Onboarding guiado para novos tenants (wizard de setup inicial)
- [ ] Notificações push (ex: "produção abaixo do target")
- [ ] Modo offline (PWA com sync)

### Módulos Novos
- [ ] **Escalas de Trabalho:** calendário de turnos, alocação por praça
- [ ] **Checklists Operacionais:** listas de abertura/fechamento por área
- [ ] **Gestão de Ponto:** registro de entrada/saída
- [ ] **Relatórios avançados:** consumo por período, eficiência de produção

### Infraestrutura
- [ ] **Previsão de Demanda (IA):** Par Level automático baseado em histórico
- [ ] **Multi-unidade:** gestão de redes de restaurantes
- [ ] **API pública v1:** endpoints para integração com Cardápio/PDV e Recrutamento IA
- [ ] **Webhooks:** notificações para sistemas externos
- [ ] **Billing:** limites por plano, cobrança por número de usuários

---

## 💡 Ideias em Avaliação

- Perfis pré-definidos como template ao criar novo tenant (seed automático baseado no tipo de restaurante)
- Dashboard gerencial consolidado (visão de todas as praças ao mesmo tempo)
- Export de histórico para CSV/PDF

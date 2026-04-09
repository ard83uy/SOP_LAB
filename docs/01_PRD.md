# Product Requirements Document (PRD)

> **Última atualização:** 2026-04-08
> **Status:** MVP entregue — Perfis, Fichas por Perfil e Checklists em produção

---

## 1. Overview

SaaS B2B multi-tenant para gestão operacional de restaurantes (Back-of-House).
O sistema centraliza a gestão de funcionários, praças, insumos, processos operacionais (SOPs, receitas) e escalas de trabalho.
A interface é Mobile-First, otimizada para uso em ambiente de cozinha (botões grandes, interações rápidas, touch-friendly).
Arquitetura API-First para futuras integrações com sistemas externos (Cardápio/Pedidos do Cliente e Recrutamento com IA).

---

## 2. Personas

| Role técnico | Persona | Descrição | Acesso |
|---|---|---|---|
| `ADMIN` | Dono / Administrador | Controle total do sistema | Tudo |
| `MANAGER` | Gerente | Controle operacional completo | Tudo (exceto billing) |
| `STATION_LEADER` | Líder de Praça / Área | Lidera uma área operacional | Definido pelo Perfil |
| `STAFF` | Colaborador | Executa tarefas operacionais básicas | Definido pelo Perfil |

> **Nota:** `ADMIN` e `MANAGER` controlam acesso ao sistema. Para colaboradores, o que define a visualização e funcionalidades disponíveis é o **Perfil de Usuário** configurado pelo gerente.

---

## 3. Conceito Central: Perfis de Usuário

O gerente cria **Perfis** customizados que definem:
- O nome da função (ex: "Barista", "Cozinheiro de Produção", "Garçom", "Copa")
- O nível de acesso base (`base_role`: STATION_LEADER ou STAFF)
- Os **módulos visíveis** na interface (`allowed_modules`)

Isso elimina roles hardcoded para funções operacionais — um perfil "Cozinheiro de Produção" com `production: true` vê o painel de produção; um perfil "Garçom" com `handover: true, fichas: true` vê apenas contagem e fichas.

**As Fichas Técnicas também usam o sistema de perfis:** cada ficha define quais perfis podem visualizá-la (`allowed_profile_ids`). ADMIN/MANAGER veem todas as fichas independentemente.

---

## 4. Goals

- **Eliminar o caos na troca de turno:** Digitalizar a contagem de estoque da praça, criando um registro auditável.
- **Dar previsibilidade à Cozinha de Produção:** Gerar automaticamente a lista do que precisa ser produzido.
- **Criar accountability:** Registrar quem contou (saída) e quem produziu (produção).
- **Flexibilidade operacional:** Perfis customizáveis pelo gerente, sem necessidade de desenvolvedor.
- **Nascer escalável:** Infraestrutura multi-tenant, API-First e modular desde o Dia 1.

---

## 5. User Stories

### Gestão de Equipe e Perfis

- Como Gestor, quero criar **Perfis de Usuário** com nome e módulos habilitados para refletir as funções reais do meu restaurante.
- Como Gestor, quero atribuir um perfil a cada funcionário para que ele veja apenas o que precisa.
- Como Gestor, quero renomear um perfil existente sem precisar reconfigurar cada usuário.
- Como Gestor, quero que ao mudar os módulos de um perfil, todos os usuários com aquele perfil vejam a mudança imediatamente.

### Fichas Técnicas

- Como Gestor, quero cadastrar receitas com ingredientes, passos e foto.
- Como Gestor, quero controlar **quais perfis** têm acesso a cada ficha técnica individualmente.
- Como Funcionário, quero ver as fichas das minhas receitas com escala de porções.

### Checklists

- Como Gestor, quero criar checklists operacionais (abertura, fechamento, etc.) e atribuí-los a perfis específicos.
- Como Colaborador, quero ver e completar os checklists do meu turno.

---

## 6. Features Implementadas

### Infraestrutura
- ✅ Multi-tenancy com isolamento por `tenant_id`
- ✅ Autenticação Clerk (email/senha, gestão de usuários via API)
- ✅ RBAC via middleware `withRole`
- ✅ Feature gating via `tenant.active_modules`
- ✅ GitOps 3 ambientes (local → beta → main/prod) via Railway

### Operação
- ✅ Gestão de Praças (CRUD com ícone)
- ✅ Gestão de Insumos (catálogo global, many-to-many com praças, par level por dia da semana)
- ✅ Contagem de Troca de Turno (Handover)
- ✅ Dashboard de Produção (delta real-time, registro de produção)
- ✅ Necessidade Teórica
- ✅ Histórico 30 dias (contagens + produções)
- ✅ Solicitação de novo insumo pelo colaborador

### Gestão de Equipe
- ✅ CRUD de usuários (cria via Clerk API, edita nome/perfil/senha, suspende/reativa/exclui)
- ✅ Perfis de Usuário: criação, renomeação, configuração de módulos, accordion na settings page

### Fichas Técnicas (Receitas)
- ✅ CRUD completo com ingredientes, passos, categoria, foto, escala de porções
- ✅ **Controle de acesso por perfil** (`allowed_profile_ids` — não mais por role)
- ✅ Comentários por receita
- ✅ ADMIN/MANAGER sempre veem todas as fichas

### Checklists
- ✅ CRUD de checklists com tarefas (frequência, time_slot, pontos)
- ✅ Atribuição de checklists a perfis de usuário
- ✅ Registro de completions por tarefa/usuário/data

### Configurações
- ✅ Menu de Configurações para Admin/Manager
- ✅ Gestão de Perfis: accordion com usuários, edição inline, toggle de módulos
- ✅ BottomNav dinâmico por `allowed_modules` do perfil

---

## 7. Módulos Futuros (Pós-MVP)

- [ ] Configurar praças visíveis por perfil (quais praças o colaborador vê na contagem)
- [ ] Unificar `PREP_KITCHEN` → `STATION_LEADER` (role legado)
- [ ] Módulo de Escalas de Trabalho
- [ ] Módulo de Gestão de Ponto
- [ ] Relatórios avançados (consumo, eficiência)
- [ ] Integração com Sistema de Recrutamento IA
- [ ] Integração com Cardápio/Pedidos
- [ ] Previsão de Demanda (IA para Par Level automático)
- [ ] Multi-unidade / Redes de Franquias
- [ ] Billing (limites por plano)

---

## 8. Non-Goals

- Gestão Fiscal e Tributária
- Cardápio para Cliente / PDV
- Sistema de Recrutamento com IA
- Controle de Estoque Complexo / ERP
- Cálculo Automático de Par Level (manual no MVP)
- Multi-unidade no MVP

---

## 9. Success Metrics

- **DAU:** % de funcionários com ≥1 contagem de turno/dia
- **Ciclo Completo:** % de contagens que geram registro de produção correspondente
- **Time-to-Value:** Tempo entre criação da conta e primeira contagem realizada
- **Adoção de Perfis:** % de funcionários com perfil configurado

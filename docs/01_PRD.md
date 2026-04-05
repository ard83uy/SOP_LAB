# Product Requirements Document (PRD)

## 1. Overview
SaaS B2B multi-tenant para gestão operacional de restaurantes (Back-of-House).
O sistema centraliza a gestão de funcionários, praças, insumos, processos operacionais (SOPs, receitas) e escalas de trabalho.
A interface é Mobile-First, otimizada para uso em ambiente de cozinha (botões grandes, interações rápidas, touch-friendly).
Arquitetura API-First para futuras integrações com sistemas externos (Cardápio/Pedidos do Cliente e Recrutamento com IA).

### Personas
1. **Gestor/Admin:** Dono ou gerente do restaurante. Configura praças, insumos, par levels, equipe e módulos.
2. **Cozinheiro de Linha (Line Cook):** Funcionário que opera uma praça. Realiza a contagem de estoque ao sair do turno.
3. **Cozinha de Produção (Prep Kitchen):** Equipe responsável por preparar os insumos. Visualiza o que precisa ser produzido e registra o que foi feito.

## 2. Goals
- **Eliminar o caos na troca de turno:** Digitalizar a contagem de estoque da praça, criando um registro auditável de quem contou, o quê e quando.
- **Dar previsibilidade à Cozinha de Produção:** Gerar automaticamente a lista do que precisa ser produzido com base no delta (Objetivo - Atual).
- **Criar accountability (responsabilidade):** Registrar quem contou (saída) e quem produziu (produção), eliminando conflitos entre turnos.
- **Nascer escalável:** Infraestrutura multi-tenant, API-First e modular desde o Dia 1.

## 3. User Stories

### MVP (Checklist de Troca de Turno & Produção)

**Gestor (Admin):**
- Como Gestor, quero criar a conta do meu restaurante para começar a usar o sistema.
- Como Gestor, quero convidar funcionários e definir seus papéis (Admin, Line Cook, Prep Kitchen) para controlar o acesso.
- Como Gestor, quero criar Praças (ex: Grelha, Salada, Bar) para organizar a operação da cozinha.
- Como Gestor, quero cadastrar Insumos (PrepItems) em cada Praça, definindo o nome, a unidade de medida (kg, litros, unidades) e a quantidade-alvo (Par Level) para que o sistema saiba o que calcular.

**Cozinheiro de Linha (Line Cook):**
- Como Cozinheiro, quero selecionar a Praça que estou deixando e ver a lista de insumos com a unidade de medida correta para fazer a contagem rápida.
- Como Cozinheiro, quero inserir a quantidade atual de cada insumo e salvar a contagem para que a Produção saiba o que falta.

**Cozinha de Produção (Prep Kitchen):**
- Como Produção, quero ver um painel em tempo real mostrando: Item, Unidade, Quantidade Atual, Quantidade Alvo e Quantidade a Produzir para saber exatamente o que preparar.
- Como Produção, quero registrar a quantidade que produzi de cada item para fechar o ciclo de responsabilidade.

### Critérios de Aceite (MVP)
- Toda contagem salva deve registrar o `user_id` de quem contou e o timestamp.
- Todo registro de produção deve registrar o `user_id` de quem produziu e o timestamp.
- O cálculo `to_produce = target_quantity - actual_quantity` deve retornar 0 se `actual >= target`.
- Nenhum usuário pode ver dados de outro restaurante (isolamento por `tenant_id`).
- A interface de contagem e produção deve ser utilizável com uma mão em tela de celular.

## 4. Features

### MVP (v1.0)
- **Autenticação e Multi-tenancy (Clerk):** Login seguro, isolamento por tenant, RBAC (Admin, Line Cook, Prep Kitchen).
- **Gestão de Praças e Insumos:** CRUD de Stations e PrepItems com unidade de medida e Par Level.
- **Checklist de Troca de Turno (Handover):** Interface mobile para contagem rápida de insumos ao sair do turno.
- **Painel de Produção:** Dashboard da cozinha de produção com cálculo automático do delta e registro de produção.
- **Gestão Básica de Equipe:** Convite de funcionários e atribuição de roles.

### Módulos Futuros (Pós-MVP)
- **Módulo de SOPs e Receitas:** Manuais de montagem de pratos, checklists operacionais.
- **Módulo de Escalas:** Calendário de turnos e alocação de funcionários por praça.
- **Módulo de Onboarding:** Fluxo guiado para novos funcionários.
- **Módulo de Gestão de Ponto:** Registro de entrada/saída de funcionários.
- **Módulo de Previsão de Demanda (IA):** Cálculo automático do Par Level baseado em histórico de vendas e sazonalidade.

## 5. Non-Goals
*(O que NÃO faremos neste MVP)*
- **Gestão Fiscal e Tributária:** Fora do escopo permanente deste produto.
- **Cardápio para Cliente / PDV:** Será um sistema separado que se conectará via API futuramente.
- **Sistema de Recrutamento com IA:** Será um sistema separado. Nossa API exporá endpoints para integração futura.
- **Controle de Estoque Complexo (ERP):** Não faremos compras, fornecedores ou baixa automática. O foco é no estoque operacional da praça.
- **Cálculo Automático de Par Level:** No MVP, o gestor define manualmente. A previsão por demanda será um módulo futuro.
- **Multi-unidade / Redes de Franquias:** Cada restaurante terá usuários independentes. Gestão de redes virá depois.

## 6. Success Metrics
- **Adoção Diária (DAU):** % de funcionários que fazem pelo menos 1 contagem de turno por dia.
- **Ciclo Completo:** % de contagens que resultam em um registro de produção correspondente (indica que a Produção está usando o sistema).
- **Time-to-Value (TTV):** Tempo entre criação da conta e a primeira contagem de turno realizada.
- **Redução de Desperdício:** Feedback qualitativo dos gestores sobre redução de desperdício e conflitos entre turnos.
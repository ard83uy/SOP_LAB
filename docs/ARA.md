# Architecture Records & Decisions (ARA)

> Registro das decisões arquiteturais tomadas no projeto, com contexto e raciocínio.
> **Última atualização:** 2026-04-08

---

## ARA-001: Multi-tenancy por isolamento lógico (tenant_id)

**Data:** 2026-04-05  
**Status:** Aceito

**Decisão:** Toda tabela inclui `tenant_id` e toda query Prisma filtra por ele. Não há schemas separados por tenant.

**Contexto:** Precisamos suportar múltiplos restaurantes em um único banco. Isolamento por schema seria mais seguro mas aumentaria a complexidade operacional.

**Consequências:**
- Positivo: Deploy único, migrations únicas, custo menor.
- Negativo: Um bug de query sem `tenant_id` poderia vazar dados. Mitigado pelo middleware `withTenant` e pela convenção no código.

---

## ARA-002: Autenticação via Clerk (não Auth.js / custom)

**Data:** 2026-04-05  
**Status:** Aceito

**Decisão:** Usar Clerk para auth completo (JWT, sessões, gestão de usuários). Bridge via `clerk_user_id` no modelo User.

**Contexto:** Precisamos criar usuários programaticamente (admin cria funcionário, não self-signup), o que o Clerk suporta via API.

**Consequências:**
- Positivo: Nunca armazenamos senhas. MFA, segurança e gestão de sessões delegados a especialistas.
- Negativo: Custo por usuário ativo acima de certo limite. Lock-in no Clerk.

---

## ARA-003: UserProfile como camada de configuração de função

**Data:** 2026-04-08  
**Status:** Aceito

**Decisão:** Criar o modelo `UserProfile` com `name`, `base_role` e `allowed_modules`. O `role` do User é derivado do `base_role` do perfil, nunca editado diretamente.

**Contexto:** Precisávamos flexibilidade para o gerente criar funções customizadas (ex: "Barista", "Copa") sem hardcodar roles no código. O enum `UserRole` define apenas os níveis de acesso técnico.

**Consequências:**
- Positivo: Gerente pode criar funções sem dev. Mudar um perfil atualiza todos os usuários.
- Negativo: Complexidade adicional: dois conceitos (role + perfil) que precisam estar sincronizados. Mitigado pelo PATCH de perfil que sincroniza automaticamente o `role` de todos os usuários.

---

## ARA-004: Fichas Técnicas com acesso por perfil (não por role)

**Data:** 2026-04-08  
**Status:** Aceito

**Decisão:** O campo `allowed_profile_ids String[]` na Recipe substitui `allowed_roles UserRole[]`. ADMIN/MANAGER sempre veem todas as fichas; outros usuários só veem fichas onde seu `profile_id` está na lista.

**Contexto:** O modelo de roles fixos (`allowed_roles: ["STATION_LEADER", "STAFF"]`) não tinha granularidade suficiente — um "Barista" e um "Cozinheiro de Produção" poderiam ter o mesmo `role` mas precisar ver fichas diferentes.

**Trade-offs avaliados:**
- **Perfil vs Role:** Perfil vence porque já é o eixo de configuração do sistema.
- **Lista de IDs vs relação M:M no banco:** Lista de UUIDs em array Postgres é mais simples de operar, sem tabela de junção extra. Desvantagem: sem FK constraint para integridade referencial — se um perfil for deletado, seus IDs permanecem na lista (comportamento seguro: o acesso simplesmente não é concedido).

**Consequências:**
- Positivo: Capilaridade máxima de controle de acesso sem proliferação de roles.
- Negativo: Usuários sem perfil (edge case: STAFF sem perfil atribuído) não veem nenhuma ficha.

---

## ARA-005: Middleware compose() para API routes

**Data:** 2026-04-05  
**Status:** Aceito

**Decisão:** Toda API route usa `compose(withAuth, withTenant, ...)` ao invés de chamar funções de auth manualmente.

**Contexto:** Garantir que nenhuma rota esqueça de validar auth ou tenant_id. O compose encadeia middlewares de forma declarativa.

**Consequências:**
- Positivo: Padrão consistente, difícil de esquecer. `req.ctx` é o contrato entre middlewares.
- Negativo: Overhead de um nível de abstração.

---

## ARA-006: prisma migrate deploy em produção (não migrate dev)

**Data:** 2026-04-08  
**Status:** Aceito

**Decisão:** `prisma migrate dev` é interativo e não funciona em ambientes CI/Railway. Migrations são criadas manualmente como SQL e aplicadas com `prisma migrate deploy`.

**Contexto:** `prisma migrate dev` detecta o ambiente não-interativo e recusa-se a executar mesmo com `--create-only`. A solução é criar os arquivos SQL diretamente em `prisma/migrations/TIMESTAMP_nome/migration.sql`.

**Como criar uma migration:**
```bash
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_nome_da_mudanca
# Editar o arquivo migration.sql com o SQL necessário
npx prisma migrate deploy
npx prisma generate
```

---

## ARA-007: React Query como camada de estado do servidor

**Data:** 2026-04-05  
**Status:** Aceito

**Decisão:** TanStack Query para cache, invalidação e sincronização de dados do servidor. Sem Redux ou Zustand para estado global.

**Contexto:** A maioria do estado é derivado do servidor (dados de praças, insumos, etc). Estado local de UI é gerenciado com `useState`.

**Query keys convencionadas:** ver `docs/02_SPECS.md` seção 10.

---

## ARA-008: Checklists com M:M entre Checklist e UserProfile

**Data:** 2026-04-08  
**Status:** Aceito

**Decisão:** Um checklist pode ser atribuído a múltiplos perfis e um perfil pode ter múltiplos checklists (relação M:M via tabela implícita Prisma).

**Contexto:** Checklists são por função (ex: "Abertura da Cozinha" atribuído ao perfil "Cozinheiro" e "Líder de Praça"), não por usuário individual.

**Consequências:** Ao mudar os perfis de um checklist, a mudança afeta imediatamente todos os usuários daquele perfil.

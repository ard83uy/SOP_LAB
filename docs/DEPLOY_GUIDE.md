# Guia de Deploy e Operação (SOP Mobile)

Este documento foi criado para guiar a configuração de infraestrutura, bancos de dados e domínios da plataforma SOP. Ele foca no fluxo **GitOps** com deploy automatizado via Railway e isolamento de ambientes (Beta staging e Production).

---

## Capítulo 1: Pré-requisitos

Para completar este guia sem impedimentos, valide que possui as seguintes contas criadas com permissões de administrador:

- **Conta no GitHub:** Para hospedar o repositório (`main` e `beta` branches).
- **Conta no Railway (`railway.app`):** Para rodar a aplicação em Cloud, gerenciar bancos PostgreSQL e auto-deploys.
- **Conta no Clerk (`clerk.com`):** Para autenticação e Single Sign On (SSO). O Clerk exige que você crie _pelo menos duas instâncias_ no Dashboard (ou separe Keys de Desenvolvimento vs. Keys de Produção Live).

---

## Capítulo 2: Configuração do GitHub

1. Inicialize ou empurre seu projeto em um repositório remoto:
   ```bash
   git add .
   git commit -m "feat: initial MVP setup"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/sop-mobile.git
   git push -u origin main
   ```

2. Crie a branch `beta` e faça o push:
   ```bash
   git checkout -b beta
   git push -u origin beta
   ```

3. **Branch Protection:**
   - Acesse Settings > Branches no repositório.
   - Adicione uma regra para proteger a branch `main`:
     - Exija no mínimo 1 aprovação em Pull Requests (PR).
     - Bloqueie push direto em `main` (força o time a enviar mudanças via `beta`).

---

## Capítulo 3: Configuração do Railway (Ambiente Beta / Staging)

Crieremos o ambiente onde a gerência valida e testa as modificações sem impactar as filiais.

1. Faça login no Railway, clique em **"New Project"**, selecione **"Deploy from GitHub repo"** e escolha o repositório `sop-mobile`.
2. Após o deploy inicial falhar (pois falta DB), clique com o botão direito no canvas do projeto > **"Create Database"** > **"Add PostgreSQL"**.
3. Associe o banco gerado ao serviço web. O Railway conectará os containers automaticamente e injetará a variável genérica `DATABASE_URL`.
4. Vá em **Project Settings > Deployments** no painel da aplicação NextJS. Confirme se a trigger source aponta **EXATAMENTE e SOMENTE** para a branch `beta`.
5. Colete as variáveis do `Clerk (Development)` e insira nas _Environment Variables_ do serviço Web no Railway:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
   - E configure: `NODE_ENV="beta"`

### 6. Executando as Migrations e Seeding do Staging
Por se tratar do primeiro deploy, o banco recém-criado está vazio.
- Instale a cli: `npm i -g @railway/cli`. Conecte na conta: `railway login`. Faça link com seu projeto Beta: `railway link`.
- Execute a migration apontando localmente a variável para a cloud do railway:
  ```bash
  # CUIDADO: você fará overwrite para fins de atalho, alternativamente:
  railway run npx prisma migrate deploy
  ```
- Logo após as tabelas subirem, alimente com os dados teste (incluindo o Tenant 'Restaurante Demo' e dezenas de insumos):
  ```bash
  railway run npx prisma db seed
  ```

7. **Testando:** Acesse a url provida pelo Railway finalizando com `/api/health`. Você deve receber JSON com data, healthy 200, e "environment: beta".

---

## Capítulo 4: Configuração do Railway (Ambiente Production)

Cria-se um **isolamento físico completo** para produção, impedindo cruzamento acidental de chaves, logs e tabelas.

1. Vá à tela inicial e crie um **NOVO PROJETO** Railway.
2. Selecione **"Deploy from GitHub Repo"** com o MESMO `sop-mobile`.
3. Configure a branch trigger _EXCLUSIVAMENTE_ para a `main`. Se houver commit na main, ela auto-sobe.
4. Conecte um novo PostgreSQL à lá carte da mesma maneira (isso gera um servidor fisicamente distinto com outra Connection String).
5. Defina nas variáveis web as strings copiadas do Clerk (Production):
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NODE_ENV="production"`
6. Na interface via cli digite `railway run npx prisma migrate deploy` no diretório lincado de prod.
   - **NUNCA DE ENTRADA NO SEED NESTE AMBIENTE.** Clientes preencherão seus próprios restaurantes manualmente após signup.

---

## Capítulo 5: Fluxo de Trabalho Diário (GitOps)

Este fluxo protege a camada produtiva automatizada contra downtime induzido por humanos.

1. **Desenvolvimento Local:**
   ```bash
   git checkout beta
   git checkout -b feature/minha-feature
   ```
   *Se quiser testar os inserts, você programa plugado em dev e executa npm run dev localmente.*
   
2. **Merge em Beta (Test):**
   - Suba o seu commit (`git push origin feature/minha-feature`).
   - Vá no GH e abra um Pull Request para a brach **beta**.
   - Assim que der o *Merge Pull Request* no GitHub, o gatilho da Webhook do Railway escuta e joga para Deploy automático no ambiente Staging. 

3. **Rollout (Production):**
   - O Time de qualidade testou na URL Beta e está polido?
   - Crie Novo Pull Request no GitHub da branch `beta` **PARA** `main`.
   - Após revisão e aprovação final da gerência, o Merge dispara o webHook de Produção. Downtime Zero via arquitetura nativa NIXPACKS do Railway. O front entra em ar na praça.

---

## Capítulo 6: Troubleshooting (Resolução Rápida)

- **Logs Estão Faltando ou Build Falhou?**
  Para logs do Build ou Aplicação Runtime, navegue até a UI do projeto web no Railway -> aba `Deployments` -> Clique no log output (View Logs).

- **O Deploy subiu legal, mas recebo Erro 500 no Banco (Prisma Init Error). O que houve?**
  Se as tabelas local e online perderam sync (geralmente caso de falta do trigger no build command extra `prisma generate`), certifieque-se se rodou as migrações mais recentes no banco alvo da web:
  ```bash
  # Na console local, forçando a var remoto (substitua URL_AQUI)
  DATABASE_URL="postgres://URL_AQUI" npx prisma migrate deploy
  ```
  Isso resolve "Relation X does not exist".

- **Como faço um Rollback de Desastre?**
  A feature na produção quebrou. 
  Opção 1: Railway Dashboard -> Encontre a caixa verde (build successful anterior que funcionava) -> Opções -> Revert to this Build.
  Opção 2: Pelo GH, dê um Revert do último commit merge no GH e faça Push. O webHook rodará a anterior e auto-limpará a má-decisão em <3min.

- **Acessando Prisma Studio (Editor visual visual SQL) no Ambiente em Nuvem:**
  Se o CEO quiser ver algum insumo bugado sem codar SQL:
  ```bash
  railway run npx prisma studio
  # Opcional caso use variavel direta exportando antes: DATABASE_URL=".." npx prisma studio
  ```

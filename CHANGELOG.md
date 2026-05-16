# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/), versionamento segue [SemVer](https://semver.org/).

Seções permitidas: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`, `Migration`.

---

## [Unreleased]

## [0.5.0] - 2026-05-16

### Added
- Etapa **Decoração** no layout DRINK: campo de texto livre para descrever acabamento do drink (enfeite, aro, raspas, frutas)
- Coluna `decoration TEXT?` em Recipe (nullable, usada apenas quando layout=DRINK)
- Seção "Decoração" no edit page entre Modo de Preparo e Ferramentas; ícone Sparkles; placeholder com exemplo prático

### Changed
- `createRecipeSchema` e `updateRecipeSchema` aceitam campo `decoration`
- Trocar layout DRINK para outro auto-limpa `decoration` (junto com `glass_type_id`)
- Server normaliza: `decoration` só é salva quando layout=DRINK (caso contrário força null)

### Migration
- `20260517010000_add_decoration_to_recipe` — adiciona coluna nullable `decoration`

## [0.4.0] - 2026-05-16

Introduz **layouts de ficha técnica**. Fundação para o gerente futuramente criar layouts customizados; nesta versão dois layouts fixos: **Comida** (padrão atual) e **Bebida/Drink** (com tipo de copo).

### Added
- Enum `RecipeLayout` com valores `FOOD` (default) e `DRINK`
- Campo `layout` em Recipe (default `FOOD`) e `glass_type_id` (FK opcional → GlassType, usado apenas quando layout=DRINK)
- Modelo `GlassType` (tenant-scoped, padrão similar ao KitchenTool): `id, tenant_id, name, photo_url, sort_order`
- Endpoints `GET /api/glass-types`, `POST /api/glass-types`, `PATCH /api/glass-types/[id]`, `DELETE /api/glass-types/[id]`
- Página admin `/admin/settings/glass-types`: CRUD de tipos de copo com preview de foto
- Card "Tipos de Copo" no hub `/admin/settings`
- Dialog de criar ficha agora em **2 passos**: 1) escolher layout (cards visuais com ícone+descrição), 2) preencher formulário. Para layout DRINK aparece picker visual de tipo de copo (grid 3x com foto + nome)
- Filtro horizontal de layout em `/admin/fichas-tecnicas` (Tudo / Comidas / Bebidas) com contadores por tipo
- Página de edição (`/admin/fichas-tecnicas/[id]`) mostra badge do layout no header e seção dedicada "Tipo de Copo" quando layout=DRINK; título da foto vira "Foto do Drink"
- Cards de fichas DRINK na lista exibem badge cyan "Bebida" para destaque rápido
- `GET /api/recipes` aceita query param `?layout=FOOD|DRINK` para filtragem server-side
- `glassType: { id, name, photo_url }` incluído no payload de Recipe quando layout=DRINK

### Changed
- Trocar layout de uma ficha existente para algo diferente de DRINK limpa automaticamente o `glass_type_id` (server-side)
- `createRecipeSchema` e `updateRecipeSchema` aceitam `layout` e `glass_type_id`
- Layout DRINK pre-seleciona "ml" como unidade de rendimento (vs "porções" para FOOD)

### Migration
- `20260517000000_recipe_layouts_and_glass_types` — Adiciona enum `RecipeLayout`, colunas `layout`/`glass_type_id` em Recipe, cria tabela `GlassType` com FK para Tenant (ON DELETE CASCADE) e Recipe (ON DELETE SET NULL)

## [0.3.0] - 2026-05-16

### Added
- Chip **"📖 Ficha Técnica"** agora também aparece na tela de Contagem (`/staff/handover`) ao lado do nome do insumo, quando ele é vinculado a uma receita.
- Para ADMIN/MANAGER, o chip é clicável e leva direto a `/admin/fichas-tecnicas/{recipe_id}` — permite revisar a ficha durante a contagem.
- Para STAFF, o chip é apenas visual (indica que é um produto manipulado), respeitando que rotas `/admin/*` são gated por role.

### Changed
- `GET /api/stations/[stationId]/prep-items` agora inclui `recipe: { id, name, category }` no payload de cada item (mesmo padrão já usado em `GET /api/prep-items`).

## [0.2.2] - 2026-05-16

### Changed
- Insumos vinculados a uma ficha técnica agora mostram um **chip clicável "📖 Ficha Técnica"** ao lado do nome no card de `/admin/prep-items`. Substitui o ícone discreto + texto que existiam antes. Clicar leva direto a `/admin/fichas-tecnicas/{recipe_id}` para o gerente revisar/editar a receita. O `e.stopPropagation()` evita que o clique também colapse/expanda o card.

## [0.2.1] - 2026-05-16

### Fixed
- Bloco duplicado de usuário (nome + "Online" + avatar) aparecia tanto no TopNav quanto no `PageHeader` de cada página. Removido do PageHeader — fonte única agora é o TopNav. Imports de `@clerk/nextjs` e `lucide-react/User` removidos do PageHeader também.

## [0.2.0] - 2026-05-16

Refinamento de UX para a visão do gerente e unificação conceitual entre Fichas Técnicas e Insumos. Esta versão estreia o badge de versão clicável no TopNav e a promoção de receitas para estoque contável.

### Added
- Badge de versão (`v0.2.0`) ao lado do logo SOP no TopNav — visível apenas para ADMIN/MANAGER (TopNav só é renderizado para gerentes)
- Modal "Novidades do SOP" abre ao clicar no badge — exibe as últimas 5 entradas do CHANGELOG com seções coloridas (Added/Changed/Fixed/etc.)
- Endpoint `GET /api/changelog` que parseia o arquivo `CHANGELOG.md` no servidor
- Sub-tabs por categoria em `/admin/prep-items` (Todos, Primários, Manipulados, Intermediários, Finais) com contadores
- Campo `category: RecipeCategory` em PrepItem (default `PRIMARY`)
- Campo `recipe_id` em PrepItem com FK opcional para Recipe (uma receita pode ser "promovida" a um insumo contável)
- Endpoint `POST /api/recipes/[id]/promote-to-inventory` — cria um PrepItem a partir de uma ficha técnica, opcionalmente vinculando-o a praças
- Botão "Estoque" em cada card de `/admin/fichas-tecnicas` que abre dialog para definir média padrão + praças
- Badge "No Estoque" em fichas já promovidas (idempotente)
- Vínculo visual entre PrepItem e sua Recipe na tela de Insumos (ícone 📖 leva à ficha)
- Headers de segurança em `next.config.ts` (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- `NEXT_PUBLIC_APP_VERSION` exposto via `next.config.ts` lendo de `package.json`
- `images.remotePatterns` configurado para permitir imagens externas em `next/image`

### Changed
- TopNav redesenhado: altura aumentada para 64px, logo em container com fundo `primary/10`, indicador de underline sob link ativo, avatar circular + nome + role do usuário, transições mais suaves
- `GET /api/prep-items` aceita query param `?category=PRIMARY|MANIPULATED|INTERMEDIATE|FINAL`
- `GET /api/recipes` retorna `promotedAs` (info do PrepItem vinculado, se promovida)
- Dialog de criar/editar insumo agora inclui seletor de categoria
- Placeholder do AppNav atualizado de h-14 para h-16 para acompanhar a nova altura do TopNav

### Migration
- `20260516000000_prep_item_category_and_recipe_link` — adiciona `category` e `recipe_id` em PrepItem com unique index e FK ON DELETE SET NULL

## [0.1.0] - 2026-05-16

Versão inicial documentada — MVP em produção (tenant La Barbara). Esta entrada consolida o estado atual e serve como ponto de partida para o histórico.

### Added
- Multi-tenancy com isolamento lógico (`tenant_id` em todas as tabelas)
- Autenticação via Clerk com middleware chain `compose(withAuth, withTenant, withRole, withModule, withValidation)`
- Sistema de Perfis de Usuário (`UserProfile` com `base_role` + `allowed_modules`)
- BottomNav dinâmico baseado em `profile.allowed_modules`
- Módulo Handover (`/staff/handover`): contagem de turno por praça
- Módulo Produção (`/staff/production`): dashboard com cálculo de `to_produce` e necessário teórico
- Módulo Fichas Técnicas (`/admin/fichas-tecnicas`): CRUD com DnD de ingredientes, ferramentas de cozinha, dica do chef, exportação PDF em 2 colunas, export bulk
- Módulo Checklists (`/admin/checklists`, `/staff/checklists`): tasks com frequência/time_slot, completions, ranking por pontos, reordenação DnD
- Gestão de Equipe (`/admin/team`): CRUD via Clerk API
- Ferramentas de Cozinha (`/admin/settings/kitchen-tools`)
- Insumos (`/admin/prep-items`): catálogo global, targets por dia da semana, solicitações via `PrepItemRequest`
- Estações/Praças (`/admin/stations`): CRUD com many-to-many de prep-items
- Proxy de imagens `/api/image-proxy` para geração de PDF (evita CORS)
- Deploy GitOps com 3 ambientes (dev/beta/prod) no Railway

### Migration
- `20260405183933_init` até `20260506000000_checklist_sort_order` (13 migrations consolidadas — ver `prisma/migrations/`)

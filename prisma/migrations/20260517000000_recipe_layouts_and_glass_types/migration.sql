-- Introduces RecipeLayout (FOOD/DRINK) and a GlassType library for DRINK recipes.
-- FOOD is the default layout — backwards compatible (existing recipes get FOOD).
-- Designed as a foundation for future user-defined layouts: nullable layout-specific fields
-- (glass_type_id) only used when relevant layout is selected.

CREATE TYPE "RecipeLayout" AS ENUM ('FOOD', 'DRINK');

ALTER TABLE "Recipe"
  ADD COLUMN "layout" "RecipeLayout" NOT NULL DEFAULT 'FOOD',
  ADD COLUMN "glass_type_id" UUID;

CREATE TABLE "GlassType" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"  UUID NOT NULL,
  "name"       TEXT NOT NULL,
  "photo_url"  TEXT,
  "sort_order" INT  NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GlassType_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "GlassType_tenant_name_unique" UNIQUE ("tenant_id", "name")
);

CREATE INDEX "GlassType_tenant_id_idx" ON "GlassType"("tenant_id");

ALTER TABLE "Recipe"
  ADD CONSTRAINT "Recipe_glass_type_id_fkey"
  FOREIGN KEY ("glass_type_id") REFERENCES "GlassType"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

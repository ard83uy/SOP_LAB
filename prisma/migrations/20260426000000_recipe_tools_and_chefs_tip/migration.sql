-- Add required_tools and chefs_tip to Recipe
ALTER TABLE "Recipe" ADD COLUMN "required_tools" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Recipe" ADD COLUMN "chefs_tip" TEXT;

-- Create KitchenTool table
CREATE TABLE "KitchenTool" (
    "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"  UUID        NOT NULL,
    "name"       TEXT        NOT NULL,
    "sort_order" INTEGER     NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KitchenTool_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KitchenTool_tenant_id_name_key" ON "KitchenTool"("tenant_id", "name");

ALTER TABLE "KitchenTool" ADD CONSTRAINT "KitchenTool_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

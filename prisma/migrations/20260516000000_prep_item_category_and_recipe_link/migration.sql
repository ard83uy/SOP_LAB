-- Unify PrepItem with Recipe categorization.
-- Adds a category (matching RecipeCategory enum) so the Insumos screen can
-- sub-tab between Primary / Manipulated / Intermediate / Final, and links a
-- PrepItem to a Recipe when the manager "promotes" a recipe into countable inventory.

ALTER TABLE "PrepItem"
  ADD COLUMN "category" "RecipeCategory" NOT NULL DEFAULT 'PRIMARY',
  ADD COLUMN "recipe_id" UUID;

-- One recipe can be promoted to at most one PrepItem
CREATE UNIQUE INDEX "PrepItem_recipe_id_key" ON "PrepItem"("recipe_id");

ALTER TABLE "PrepItem"
  ADD CONSTRAINT "PrepItem_recipe_id_fkey"
  FOREIGN KEY ("recipe_id") REFERENCES "Recipe"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

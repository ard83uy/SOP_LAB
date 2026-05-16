-- Adds an optional "decoration" text field to Recipe.
-- Only used by DRINK layout (e.g. "rodela de limão, raminho de hortelã, açúcar no aro").
-- Nullable; existing recipes are unaffected.

ALTER TABLE "Recipe"
  ADD COLUMN "decoration" TEXT;

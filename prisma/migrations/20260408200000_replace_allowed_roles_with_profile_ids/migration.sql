-- Drop the old allowed_roles column
ALTER TABLE "Recipe" DROP COLUMN "allowed_roles";

-- Add the new allowed_profile_ids column
ALTER TABLE "Recipe" ADD COLUMN "allowed_profile_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

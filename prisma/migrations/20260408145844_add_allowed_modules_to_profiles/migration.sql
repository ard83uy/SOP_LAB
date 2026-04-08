-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "allowed_modules" JSONB NOT NULL DEFAULT '{}';

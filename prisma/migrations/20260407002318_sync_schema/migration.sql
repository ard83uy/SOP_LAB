/*
  Warnings:

  - The values [LINE_COOK] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `station_id` on the `PrepItem` table. All the data in the column will be lost.
  - You are about to drop the column `reviewer_id` on the `PrepItemRequest` table. All the data in the column will be lost.
  - The `status` column on the `PrepItemRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[tenant_id,name]` on the table `PrepItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[prep_item_id]` on the table `PrepItemRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'MANAGER', 'STATION_LEADER', 'PREP_KITCHEN', 'STAFF');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "PrepItem" DROP CONSTRAINT "PrepItem_station_id_fkey";

-- DropForeignKey
ALTER TABLE "PrepItemRequest" DROP CONSTRAINT "PrepItemRequest_station_id_fkey";

-- DropIndex
DROP INDEX "PrepItem_station_id_name_key";

-- AlterTable
ALTER TABLE "PrepItem" DROP COLUMN "station_id";

-- AlterTable
ALTER TABLE "PrepItemRequest" DROP COLUMN "reviewer_id",
ADD COLUMN     "prep_item_id" UUID,
DROP COLUMN "status",
ADD COLUMN     "status" "RequestStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Tenant" ALTER COLUMN "active_modules" SET DEFAULT '{}';

-- DropEnum
DROP TYPE "PrepItemRequestStatus";

-- CreateTable
CREATE TABLE "_PrepItemToStation" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_PrepItemToStation_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PrepItemToStation_B_index" ON "_PrepItemToStation"("B");

-- CreateIndex
CREATE UNIQUE INDEX "PrepItem_tenant_id_name_key" ON "PrepItem"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PrepItemRequest_prep_item_id_key" ON "PrepItemRequest"("prep_item_id");

-- AddForeignKey
ALTER TABLE "PrepItemRequest" ADD CONSTRAINT "PrepItemRequest_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepItemRequest" ADD CONSTRAINT "PrepItemRequest_prep_item_id_fkey" FOREIGN KEY ("prep_item_id") REFERENCES "PrepItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PrepItemToStation" ADD CONSTRAINT "_PrepItemToStation_A_fkey" FOREIGN KEY ("A") REFERENCES "PrepItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PrepItemToStation" ADD CONSTRAINT "_PrepItemToStation_B_fkey" FOREIGN KEY ("B") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

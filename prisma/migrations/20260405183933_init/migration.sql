-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'LINE_COOK', 'PREP_KITCHEN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active_modules" JSONB NOT NULL DEFAULT '["handover", "production"]',
    "max_employees" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ONBOARDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Station" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepItem" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "station_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "target_quantity" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrepItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftHandover" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "station_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftHandover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandoverItemCount" (
    "id" UUID NOT NULL,
    "shift_handover_id" UUID NOT NULL,
    "prep_item_id" UUID NOT NULL,
    "actual_quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "HandoverItemCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionLog" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "prep_item_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "shift_handover_id" UUID NOT NULL,
    "produced_quantity" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_clerk_user_id_key" ON "User"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Station_tenant_id_name_key" ON "Station"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PrepItem_station_id_name_key" ON "PrepItem"("station_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "HandoverItemCount_shift_handover_id_prep_item_id_key" ON "HandoverItemCount"("shift_handover_id", "prep_item_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepItem" ADD CONSTRAINT "PrepItem_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepItem" ADD CONSTRAINT "PrepItem_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoverItemCount" ADD CONSTRAINT "HandoverItemCount_shift_handover_id_fkey" FOREIGN KEY ("shift_handover_id") REFERENCES "ShiftHandover"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoverItemCount" ADD CONSTRAINT "HandoverItemCount_prep_item_id_fkey" FOREIGN KEY ("prep_item_id") REFERENCES "PrepItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLog" ADD CONSTRAINT "ProductionLog_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLog" ADD CONSTRAINT "ProductionLog_prep_item_id_fkey" FOREIGN KEY ("prep_item_id") REFERENCES "PrepItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLog" ADD CONSTRAINT "ProductionLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLog" ADD CONSTRAINT "ProductionLog_shift_handover_id_fkey" FOREIGN KEY ("shift_handover_id") REFERENCES "ShiftHandover"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

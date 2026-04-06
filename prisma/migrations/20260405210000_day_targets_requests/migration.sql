-- CreateEnum
CREATE TYPE "PrepItemRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "PrepItemDayTarget" (
    "id" UUID NOT NULL,
    "prep_item_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "target_quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PrepItemDayTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepItemRequest" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "station_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "note" TEXT,
    "status" "PrepItemRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewer_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrepItemRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrepItemDayTarget_prep_item_id_day_of_week_key" ON "PrepItemDayTarget"("prep_item_id", "day_of_week");

-- AddForeignKey
ALTER TABLE "PrepItemDayTarget" ADD CONSTRAINT "PrepItemDayTarget_prep_item_id_fkey" FOREIGN KEY ("prep_item_id") REFERENCES "PrepItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepItemRequest" ADD CONSTRAINT "PrepItemRequest_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepItemRequest" ADD CONSTRAINT "PrepItemRequest_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepItemRequest" ADD CONSTRAINT "PrepItemRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withValidation } from "@/lib/middlewares/withValidation";
import { createPrepItemSchema } from "@/lib/validations/schemas";
import { prisma } from "@/lib/prisma";

async function createPrepItemHandler(req: AppRequest) {
  const { station_id, name, unit, target_quantity } = req.ctx.parsedBody;
  const tenant_id = req.ctx.tenant_id!;

  const station = await prisma.station.findUnique({
    where: { id: station_id, tenant_id }
  });

  if (!station) {
    return NextResponse.json({ error: "Station not found", code: "NOT_FOUND", status: 404 }, { status: 404 });
  }

  const existing = await prisma.prepItem.findUnique({
    where: { station_id_name: { station_id, name } }
  });

  if (existing) {
    return NextResponse.json({ error: "Item name already exists in this station", code: "CONFLICT", status: 409 }, { status: 409 });
  }

  const item = await prisma.prepItem.create({
    data: { tenant_id, station_id, name, unit, target_quantity }
  });

  req.logger.info({ item_id: item.id }, "PrepItem created");

  return NextResponse.json(item, { status: 201 });
}

export const POST = compose(withAuth, withTenant, withRole(["ADMIN"]), withValidation(createPrepItemSchema), createPrepItemHandler);

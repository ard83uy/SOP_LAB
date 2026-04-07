import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withValidation } from "@/lib/middlewares/withValidation";
import { createStationSchema } from "@/lib/validations/schemas";
import { prisma } from "@/lib/prisma";

async function createStationHandler(req: AppRequest) {
  const { name, icon } = req.ctx.parsedBody;
  const tenant_id = req.ctx.tenant_id!;

  const existing = await prisma.station.findUnique({
    where: { tenant_id_name: { tenant_id, name } }
  });

  if (existing) {
    return NextResponse.json({ error: "Station already exists", code: "CONFLICT", status: 409 }, { status: 409 });
  }

  const station = await prisma.station.create({
    data: { name, tenant_id, icon: icon || "UtensilsCrossed" }
  });

  req.logger.info({ station_id: station.id, name, icon: station.icon }, "Station created");

  return NextResponse.json(station, { status: 201 });
}

async function listStationsHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;

  const stations = await prisma.station.findMany({
    where: { tenant_id },
    orderBy: { created_at: "asc" }
  });

  return NextResponse.json(stations);
}

export const POST = compose(withAuth, withTenant, withRole(["ADMIN"]), withValidation(createStationSchema), createStationHandler);
export const GET = compose(withAuth, withTenant, listStationsHandler);

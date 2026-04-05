import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { prisma } from "@/lib/prisma";

async function listPrepItemsHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const tenant_id = req.ctx.tenant_id!;
  const station_id = params.id;

  const station = await prisma.station.findUnique({
    where: { id: station_id, tenant_id }
  });

  if (!station) {
    return NextResponse.json({ error: "Station not found", code: "NOT_FOUND", status: 404 }, { status: 404 });
  }

  const items = await prisma.prepItem.findMany({
    where: { tenant_id, station_id }
  });

  return NextResponse.json(items);
}

export const GET = compose(withAuth, withTenant, listPrepItemsHandler);

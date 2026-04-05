import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withModule } from "@/lib/middlewares/withModule";
import { prisma } from "@/lib/prisma";

async function getLatestHandoverHandler(req: AppRequest, { params }: { params: { stationId: string } }) {
  const tenant_id = req.ctx.tenant_id!;
  const station_id = params.stationId;

  const station = await prisma.station.findUnique({
    where: { id: station_id, tenant_id }
  });

  if (!station) {
    return NextResponse.json({ error: "Station not found", code: "NOT_FOUND", status: 404 }, { status: 404 });
  }

  const latest = await prisma.shiftHandover.findFirst({
    where: { station_id, tenant_id },
    orderBy: { created_at: "desc" },
    include: { items: true }
  });

  return NextResponse.json(latest || null);
}

export const GET = compose(withAuth, withTenant, withModule("handover"), getLatestHandoverHandler);

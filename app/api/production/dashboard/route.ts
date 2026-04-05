import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withModule } from "@/lib/middlewares/withModule";
import { prisma } from "@/lib/prisma";

async function getProductionDashboard(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;

  const stations = await prisma.station.findMany({
    where: { tenant_id }
  });

  const dashboardStations = [];

  for (const station of stations) {
    const latestHandover = await prisma.shiftHandover.findFirst({
      where: { station_id: station.id, tenant_id },
      orderBy: { created_at: "desc" },
      include: {
        items: {
          include: { prepItem: true }
        }
      }
    });

    if (!latestHandover) continue;

    const itemsToProduce = [];

    for (const hc of latestHandover.items) {
      const target = hc.prepItem.target_quantity;
      const actual = hc.actual_quantity;
      const to_produce = Math.max(0, target - actual);

      if (to_produce > 0) {
        itemsToProduce.push({
          prep_item_id: hc.prepItem.id,
          name: hc.prepItem.name,
          unit: hc.prepItem.unit,
          target_quantity: target,
          actual_quantity: actual,
          to_produce,
          shift_handover_id: latestHandover.id
        });
      }
    }

    if (itemsToProduce.length > 0) {
      dashboardStations.push({
        station_name: station.name,
        items: itemsToProduce
      });
    }
  }

  return NextResponse.json({ stations: dashboardStations });
}

export const GET = compose(withAuth, withTenant, withRole(["ADMIN", "PREP_KITCHEN"]), withModule("production"), getProductionDashboard);

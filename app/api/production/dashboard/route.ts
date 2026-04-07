import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withModule } from "@/lib/middlewares/withModule";
import { prisma } from "@/lib/prisma";
import { todayDowSP, formatSP, dateLabelSP, nowSP } from "@/lib/timezone";

function yesterdayLabelSP(): string {
  const d = nowSP();
  d.setDate(d.getDate() - 1);
  return dateLabelSP(d);
}

async function getProductionDashboard(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;
  const targetLabel = req.nextUrl.searchParams.get("date") ?? yesterdayLabelSP();

  const stations = await prisma.station.findMany({
    where: { tenant_id }
  });

  const dashboardStations = [];
  const theoreticalStations = [];

  const todayDow = todayDowSP();

  for (const station of stations) {
    // Fetch station prep items for theoretical needs
    const stationPrepItems = await prisma.prepItem.findMany({
      where: { stations: { some: { id: station.id } } },
      include: { dayTargets: true } as any,
    });

    // Fetch recent handovers and find the one matching the target date
    const recentHandovers = await prisma.shiftHandover.findMany({
      where: {
        station_id: station.id,
        tenant_id,
        created_at: { gte: new Date(nowSP().getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { created_at: "desc" },
      include: {
        items: {
          include: { prepItem: { include: { dayTargets: true } as any } }
        }
      }
    });

    const latestHandover = recentHandovers.find(
      (h) => dateLabelSP(h.created_at) === targetLabel
    ) ?? null;

    if (!latestHandover) {
      // No handover for this date — all items are theoretical
      const theoreticalItems = (stationPrepItems as any[])
        .map((item) => {
          const dayTarget = item.dayTargets?.find((dt: any) => dt.day_of_week === todayDow);
          const effective_target = dayTarget?.target_quantity ?? item.target_quantity;
          return {
            prep_item_id: item.id,
            name: item.name,
            unit: item.unit,
            effective_target,
          };
        })
        .filter((i) => i.effective_target > 0);

      if (theoreticalItems.length > 0) {
        theoreticalStations.push({ station_name: station.name, items: theoreticalItems });
      }
      continue;
    }

    const handover = latestHandover as any;
    const itemsToProduce = [];
    const countedIds = new Set(handover.items.map((hc: any) => hc.prep_item_id as string));

    const productionTotals = await prisma.productionLog.groupBy({
      by: ["prep_item_id"],
      where: { shift_handover_id: handover.id, tenant_id },
      _sum: { produced_quantity: true },
    });
    const producedByItem: Record<string, number> = Object.fromEntries(
      productionTotals.map((p: any) => [p.prep_item_id, p._sum.produced_quantity ?? 0])
    );

    for (const hc of handover.items) {
      const dayTarget = hc.prepItem.dayTargets.find((dt: any) => dt.day_of_week === todayDow);
      const target = dayTarget?.target_quantity ?? hc.prepItem.target_quantity;
      const actual = hc.actual_quantity;

      if (actual === null || actual === undefined) continue;

      const already_produced = producedByItem[hc.prepItem.id] ?? 0;
      const to_produce = Math.max(0, target - actual - already_produced);

      if (to_produce > 0) {
        itemsToProduce.push({
          prep_item_id: hc.prepItem.id,
          name: hc.prepItem.name,
          unit: hc.prepItem.unit,
          target_quantity: target,
          default_target: hc.prepItem.target_quantity,
          is_day_specific: !!dayTarget,
          actual_quantity: actual,
          already_produced,
          to_produce,
          shift_handover_id: handover.id,
        });
      }
    }

    // Uncounted items → theoretical needs
    const theoreticalItems = (stationPrepItems as any[])
      .filter((item) => !countedIds.has(item.id))
      .map((item) => {
        const dayTarget = item.dayTargets?.find((dt: any) => dt.day_of_week === todayDow);
        const effective_target = dayTarget?.target_quantity ?? item.target_quantity;
        return {
          prep_item_id: item.id,
          name: item.name,
          unit: item.unit,
          effective_target,
        };
      })
      .filter((i) => i.effective_target > 0);

    if (itemsToProduce.length > 0) {
      dashboardStations.push({
        station_name: station.name,
        note: handover.note ?? null,
        items: itemsToProduce
      });
    }

    if (theoreticalItems.length > 0) {
      theoreticalStations.push({ station_name: station.name, items: theoreticalItems });
    }
  }

  return NextResponse.json({ stations: dashboardStations, theoretical: theoreticalStations, server_time: formatSP(), date_label: targetLabel });
}

export const GET = compose(withAuth, withTenant, withRole(["ADMIN", "MANAGER", "PREP_KITCHEN"]), withModule("production"), getProductionDashboard);

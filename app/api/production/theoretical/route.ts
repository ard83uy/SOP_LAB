import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withModule } from "@/lib/middlewares/withModule";
import { prisma } from "@/lib/prisma";
import { todayDowSP, dateLabelSP, nowSP } from "@/lib/timezone";

async function getTheoreticalHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;
  const todayDow = todayDowSP();
  const todayLabel = dateLabelSP(nowSP());

  const stations = await prisma.station.findMany({
    where: { tenant_id },
    include: {
      prepItems: {
        include: { dayTargets: true } as any,
      },
      shiftHandovers: {
        orderBy: { created_at: "desc" },
        take: 1,
        include: { items: true },
      },
    },
  });

  const result = [];

  for (const station of stations as any[]) {
    const latestHandover = station.shiftHandovers[0] ?? null;

    // No handover ever recorded for this station — show full target as theoretical need
    if (!latestHandover) {
      const items = station.prepItems
        .map((item: any) => {
          const dayTarget = item.dayTargets?.find((dt: any) => dt.day_of_week === todayDow);
          const effective_target = dayTarget?.target_quantity ?? item.target_quantity;
          return {
            prep_item_id: item.id,
            name: item.name,
            unit: item.unit,
            effective_target,
            last_count: null,
            last_count_at: null,
            days_since: null,
            theoretical_need: effective_target,
          };
        })
        .filter((i: any) => i.theoretical_need > 0);

      if (items.length > 0) {
        result.push({ station_name: station.name, items, handover_is_today: false });
      }
      continue;
    }

    const handoverDateLabel = dateLabelSP(latestHandover.created_at);
    const handoverIsToday = handoverDateLabel === todayLabel;

    // Calculate days since last handover
    const diffMs = nowSP().getTime() - new Date(latestHandover.created_at).getTime();
    const days_since = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const countByItem: Record<string, number> = Object.fromEntries(
      latestHandover.items.map((hc: any) => [hc.prep_item_id, hc.actual_quantity])
    );

    const items = station.prepItems
      .map((item: any) => {
        const dayTarget = item.dayTargets?.find((dt: any) => dt.day_of_week === todayDow);
        const effective_target = dayTarget?.target_quantity ?? item.target_quantity;
        const last_count = countByItem[item.id] ?? null;

        // If item was never counted in any handover, assume 0
        const baseline = last_count ?? 0;
        const theoretical_need = effective_target - baseline;

        return {
          prep_item_id: item.id,
          name: item.name,
          unit: item.unit,
          effective_target,
          last_count,
          last_count_at: latestHandover.created_at,
          days_since,
          theoretical_need,
        };
      })
      .filter((i: any) => i.theoretical_need > 0);

    if (items.length > 0) {
      result.push({ station_name: station.name, items, handover_is_today: handoverIsToday });
    }
  }

  return NextResponse.json({ stations: result });
}

export const GET = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER", "PREP_KITCHEN"]),
  withModule("production"),
  getTheoreticalHandler
);

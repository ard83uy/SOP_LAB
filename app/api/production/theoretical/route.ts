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

    const handoverDateLabel = latestHandover ? dateLabelSP(latestHandover.created_at) : null;
    const handoverIsToday = handoverDateLabel === todayLabel;

    // We only want to show items that DON'T have a count TODAY
    // If a station was partially counted today, we only show the uncounted items here.
    
    // 1. Find all items counted today in this station
    const itemsCountedToday = await prisma.handoverItemCount.findMany({
      where: {
        prepItem: { stations: { some: { id: station.id } } },
        shiftHandover: {
          station_id: station.id,
          created_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      },
      select: { prep_item_id: true },
    });
    
    // Better today check using the same timezone logic
    const todayHandovers = await prisma.shiftHandover.findMany({
      where: { 
        station_id: station.id,
        tenant_id,
        created_at: { gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000) } // Safety margin
      }
    });

    const actuallyTodayIds = todayHandovers
      .filter((h: any) => dateLabelSP(h.created_at) === todayLabel)
      .map((h: any) => h.id);

    const countedTodayIds = await prisma.handoverItemCount.findMany({
      where: { shift_handover_id: { in: actuallyTodayIds } },
      select: { prep_item_id: true }
    }).then((items: { prep_item_id: string }[]) => new Set(items.map(i => i.prep_item_id)));

    const items = station.prepItems
      .filter((item: any) => !countedTodayIds.has(item.id)) // Only uncounted items
      .map((item: any) => {
        const dayTarget = item.dayTargets?.find((dt: any) => dt.day_of_week === todayDow);
        const effective_target = dayTarget?.target_quantity ?? item.target_quantity;
        
        // Since it wasn't counted today, we don't have a reliable baseline.
        // We show the full target as the "Theoretical Need".
        
        const last_count = (latestHandover as any)?.items?.find((i: any) => i.prep_item_id === item.id)?.actual_quantity ?? null;
        const diffMs = latestHandover ? nowSP().getTime() - new Date(latestHandover.created_at).getTime() : 0;
        const days_since = latestHandover ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : null;

        return {
          prep_item_id: item.id,
          name: item.name,
          unit: item.unit,
          effective_target,
          last_count,
          last_count_at: latestHandover?.created_at ?? null,
          days_since,
          theoretical_need: effective_target,
        };
      })
      .filter((i: any) => i.theoretical_need > 0);

    if (items.length > 0) {
      result.push({ station_name: station.name, items, handover_is_today: false });
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

import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { prisma } from "@/lib/prisma";
import { dateLabelSP, timeLabelSP, todayDowSP } from "@/lib/timezone";

async function handler(req: AppRequest, { params }: { params: { stationId: string } }) {
  const tenant_id = req.ctx.tenant_id!;
  const station_id = params.stationId;

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const handovers = await prisma.shiftHandover.findMany({
    where: { station_id, tenant_id, created_at: { gte: since } },
    orderBy: { created_at: "desc" },
    include: {
      user: { select: { name: true } },
      items: {
        include: { prepItem: { include: { dayTargets: true } as any } },
      },
    },
  });

  const handoverIds = handovers.map((h) => h.id);

  const productionLogs = handoverIds.length > 0
    ? await prisma.productionLog.findMany({
        where: { shift_handover_id: { in: handoverIds }, tenant_id },
        include: {
          user: { select: { name: true } },
          prepItem: { select: { name: true, unit: true } },
        },
      })
    : [];

  // Group production logs by handover
  const logsByHandover = new Map<string, typeof productionLogs>();
  for (const log of productionLogs) {
    const key = log.shift_handover_id;
    if (!logsByHandover.has(key)) logsByHandover.set(key, []);
    logsByHandover.get(key)!.push(log);
  }

  // Group production logs by handover+item (totals and individual details)
  const producedByHandoverItem = new Map<string, number>();
  const logsByHandoverItem = new Map<string, { user_name: string; time: string; quantity: number }[]>();
  for (const log of productionLogs) {
    const key = `${log.shift_handover_id}:${log.prep_item_id}`;
    producedByHandoverItem.set(key, (producedByHandoverItem.get(key) ?? 0) + log.produced_quantity);
    if (!logsByHandoverItem.has(key)) logsByHandoverItem.set(key, []);
    logsByHandoverItem.get(key)!.push({
      user_name: (log as any).user.name,
      time: timeLabelSP(log.created_at),
      quantity: log.produced_quantity,
    });
  }

  const todayDow = todayDowSP();

  // Build grouped response
  const byDate = new Map<string, any[]>();
  for (const h of handovers) {
    const dateLabel = dateLabelSP(h.created_at);
    if (!byDate.has(dateLabel)) byDate.set(dateLabel, []);

    const items = (h as any).items.map((hc: any) => {
      const dayTarget = hc.prepItem.dayTargets?.find((dt: any) => dt.day_of_week === todayDow);
      const target = dayTarget?.target_quantity ?? hc.prepItem.target_quantity;
      const requested = Math.max(0, target - hc.actual_quantity);
      const itemKey = `${h.id}:${hc.prep_item_id}`;
      const produced = producedByHandoverItem.get(itemKey) ?? 0;
      const production_logs = logsByHandoverItem.get(itemKey) ?? [];

      return {
        name: hc.prepItem.name,
        unit: hc.prepItem.unit,
        target,
        counted: hc.actual_quantity,
        requested,
        produced,
        production_logs,
      };
    });

    byDate.get(dateLabel)!.push({
      id: h.id,
      time: timeLabelSP(h.created_at),
      user_name: (h as any).user.name,
      note: h.note ?? null,
      items,
    });
  }

  const groups = Array.from(byDate.entries()).map(([date, handovers]) => ({
    date,
    handovers,
  }));

  return NextResponse.json({ groups });
}

export const GET = compose(withAuth, withTenant, handler);

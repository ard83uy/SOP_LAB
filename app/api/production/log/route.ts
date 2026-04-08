import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withModule } from "@/lib/middlewares/withModule";
import { withValidation } from "@/lib/middlewares/withValidation";
import { submitProductionLogSchema } from "@/lib/validations/schemas";
import { prisma } from "@/lib/prisma";
import { dateLabelSP, timeLabelSP, todayDowSP } from "@/lib/timezone";

// ── GET /api/production/log ───────────────────────────────────────────────────

async function listProductionLogsHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const logs = await prisma.productionLog.findMany({
    where: { tenant_id, created_at: { gte: since } },
    orderBy: { created_at: "asc" },
    include: {
      prepItem: { select: { name: true, unit: true } },
      user: { select: { name: true } },
      shiftHandover: {
        include: {
          station: { select: { name: true } },
          items: {
            include: {
              prepItem: { include: { dayTargets: true } as any },
            },
          },
        },
      },
    },
  });

  // Group by production date → handover
  type ItemEntry = { name: string; unit: string; requested: number; produced: number; production_logs: { user_name: string; time: string; quantity: number }[] };
  type HandoverEntry = { handover_id: string; station_name: string; items: Map<string, ItemEntry> };

  const byDate = new Map<string, Map<string, HandoverEntry>>();

  for (const log of logs) {
    const dateLabel = dateLabelSP(log.created_at);
    if (!byDate.has(dateLabel)) byDate.set(dateLabel, new Map());
    const handoverMap = byDate.get(dateLabel)!;

    const handoverId = log.shift_handover_id;
    if (!handoverMap.has(handoverId)) {
      handoverMap.set(handoverId, {
        handover_id: handoverId,
        station_name: (log as any).shiftHandover.station.name,
        items: new Map(),
      });
    }

    const handoverEntry = handoverMap.get(handoverId)!;
    const itemKey = log.prep_item_id;

    if (!handoverEntry.items.has(itemKey)) {
      const handoverItem = (log as any).shiftHandover.items.find((i: any) => i.prep_item_id === log.prep_item_id);
      let requested = 0;
      if (handoverItem) {
        const handoverDate = (log as any).shiftHandover.created_at;
        const dow = new Date(new Date(handoverDate).toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getDay();
        const dayTarget = handoverItem.prepItem?.dayTargets?.find((dt: any) => dt.day_of_week === dow);
        const target = dayTarget?.target_quantity ?? handoverItem.prepItem?.target_quantity ?? 0;
        requested = Math.max(0, target - handoverItem.actual_quantity);
      }
      handoverEntry.items.set(itemKey, {
        name: (log as any).prepItem.name,
        unit: (log as any).prepItem.unit,
        requested,
        produced: 0,
        production_logs: [],
      });
    }

    const itemEntry = handoverEntry.items.get(itemKey)!;
    itemEntry.produced += log.produced_quantity;
    itemEntry.production_logs.push({
      user_name: (log as any).user.name,
      time: timeLabelSP(log.created_at),
      quantity: log.produced_quantity,
    });
  }

  const groups = Array.from(byDate.entries())
    .reverse()
    .map(([date, handovers]) => ({
      date,
      handovers: Array.from(handovers.values()).map((h) => ({
        handover_id: h.handover_id,
        station_name: h.station_name,
        items: Array.from(h.items.values()),
      })),
    }));

  return NextResponse.json({ groups });
}

// ── POST /api/production/log ──────────────────────────────────────────────────

async function logProductionHandler(req: AppRequest) {
  const { prep_item_id, shift_handover_id, produced_quantity } = req.ctx.parsedBody;
  const tenant_id = req.ctx.tenant_id!;
  const user_id = req.ctx.user_id!;

  const prepItem = await prisma.prepItem.findUnique({
    where: { id: prep_item_id, tenant_id },
  });

  if (!prepItem) {
    return NextResponse.json({ error: "Item not found", code: "NOT_FOUND", status: 404 }, { status: 404 });
  }

  const handover = await prisma.shiftHandover.findUnique({
    where: { id: shift_handover_id, tenant_id },
  });

  if (!handover) {
    return NextResponse.json({ error: "Handover not found", code: "NOT_FOUND", status: 404 }, { status: 404 });
  }

  const log = await prisma.$transaction(async (tx: any) => {
    return tx.productionLog.create({
      data: { tenant_id, user_id, prep_item_id, shift_handover_id, produced_quantity },
    });
  });

  req.logger.info(
    { item_name: prepItem.name, produced_quantity, unit: prepItem.unit, user_id },
    `Produção registrada: ${produced_quantity} ${prepItem.unit} de ${prepItem.name}`
  );

  return NextResponse.json(log, { status: 201 });
}

export const GET = compose(withAuth, withTenant, listProductionLogsHandler);
export const POST = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER", "PREP_KITCHEN"]),
  withModule("production"),
  withValidation(submitProductionLogSchema),
  logProductionHandler
);

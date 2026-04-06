import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withModule } from "@/lib/middlewares/withModule";
import { withValidation } from "@/lib/middlewares/withValidation";
import { submitProductionLogSchema } from "@/lib/validations/schemas";
import { prisma } from "@/lib/prisma";
import { dateLabelSP, timeLabelSP } from "@/lib/timezone";

// ── GET /api/production/log ───────────────────────────────────────────────────

async function listProductionLogsHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const logs = await prisma.productionLog.findMany({
    where: { tenant_id, created_at: { gte: since } },
    orderBy: { created_at: "desc" },
    include: {
      prepItem: { select: { name: true, unit: true } },
      user: { select: { name: true } },
      shiftHandover: {
        include: { station: { select: { name: true } } },
      },
    },
  });

  // Group by date in SP timezone
  const byDate = new Map<string, typeof logs>();
  for (const l of logs) {
    const label = dateLabelSP(l.created_at);
    if (!byDate.has(label)) byDate.set(label, []);
    byDate.get(label)!.push(l);
  }

  const groups = Array.from(byDate.entries()).map(([date, entries]) => ({
    date,
    logs: entries.map((l) => ({
      id: l.id,
      item_name: (l as any).prepItem.name,
      unit: (l as any).prepItem.unit,
      produced_quantity: l.produced_quantity,
      user_name: (l as any).user.name,
      station_name: (l as any).shiftHandover.station.name,
      time: timeLabelSP(l.created_at),
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

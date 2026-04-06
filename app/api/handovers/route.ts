import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withModule } from "@/lib/middlewares/withModule";
import { withValidation } from "@/lib/middlewares/withValidation";
import { submitHandoverSchema } from "@/lib/validations/schemas";
import { prisma } from "@/lib/prisma";
import { dateLabelSP, timeLabelSP } from "@/lib/timezone";

// ── GET /api/handovers ────────────────────────────────────────────────────────

async function listHandoversHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const handovers = await prisma.shiftHandover.findMany({
    where: { tenant_id, created_at: { gte: since } },
    orderBy: { created_at: "desc" },
    include: {
      station: { select: { name: true } },
      user: { select: { name: true } },
      items: {
        include: { prepItem: { select: { name: true, unit: true } } },
      },
    },
  });

  // Group by date in SP timezone
  const byDate = new Map<string, typeof handovers>();
  for (const h of handovers) {
    const label = dateLabelSP(h.created_at);
    if (!byDate.has(label)) byDate.set(label, []);
    byDate.get(label)!.push(h);
  }

  const groups = Array.from(byDate.entries()).map(([date, entries]) => ({
    date,
    handovers: entries.map((h) => ({
      id: h.id,
      station_name: (h as any).station.name,
      user_name: (h as any).user.name,
      time: timeLabelSP(h.created_at),
      items: (h as any).items.map((i: any) => ({
        name: i.prepItem.name,
        unit: i.prepItem.unit,
        actual_quantity: i.actual_quantity,
      })),
    })),
  }));

  return NextResponse.json({ groups });
}

// ── POST /api/handovers ───────────────────────────────────────────────────────

async function submitHandoverHandler(req: AppRequest) {
  const { station_id, items } = req.ctx.parsedBody;
  const tenant_id = req.ctx.tenant_id!;
  const user_id = req.ctx.user_id!;

  const station = await prisma.station.findUnique({
    where: { id: station_id, tenant_id },
    include: { prepItems: true },
  });

  if (!station) {
    return NextResponse.json({ error: "Station not found", code: "NOT_FOUND", status: 404 }, { status: 404 });
  }

  const validItemIds = new Set(station.prepItems.map((i) => i.id));
  const invalidItems = items.filter((i: any) => !validItemIds.has(i.prep_item_id));

  if (invalidItems.length > 0) {
    return NextResponse.json(
      { error: "Some items do not belong to this station", code: "BAD_REQUEST", status: 400 },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx: any) => {
    return tx.shiftHandover.create({
      data: {
        tenant_id,
        user_id,
        station_id,
        items: {
          create: items.map((i: any) => ({
            prep_item_id: i.prep_item_id,
            actual_quantity: i.actual_quantity,
          })),
        },
      },
      include: { items: true },
    });
  });

  req.logger.info({ user_id, station_id, handover_id: result.id }, "Contagem registrada");
  return NextResponse.json(result, { status: 201 });
}

export const GET = compose(withAuth, withTenant, listHandoversHandler);
export const POST = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER", "STATION_LEADER", "STAFF"]),
  withModule("handover"),
  withValidation(submitHandoverSchema),
  submitHandoverHandler
);

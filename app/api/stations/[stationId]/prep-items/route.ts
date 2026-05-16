import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { prisma } from "@/lib/prisma";
import { todayDowSP, formatSP } from "@/lib/timezone";

// GET: list items linked to this station, enriched with effective_target + current_quantity
async function listPrepItemsHandler(req: AppRequest, { params }: { params: { stationId: string } }) {
  const tenant_id = req.ctx.tenant_id!;
  const station_id = params.stationId;

  const items = await prisma.prepItem.findMany({
    where: { tenant_id, stations: { some: { id: station_id } } } as any,
    include: {
      dayTargets: true,
      recipe: { select: { id: true, name: true, category: true } },
    } as any,
    orderBy: { name: "asc" },
  });

  const todayDow = todayDowSP();
  const itemsWithEffectiveTarget = (items as any[]).map((item: any) => {
    const dayTarget = item.dayTargets?.find((dt: any) => dt.day_of_week === todayDow);
    return { ...item, effective_target: dayTarget?.target_quantity ?? item.target_quantity };
  });

  const latestHandover = await prisma.shiftHandover.findFirst({
    where: { station_id, tenant_id },
    orderBy: { created_at: "desc" },
    include: { items: true },
  });

  if (!latestHandover) {
    return NextResponse.json({
      items: itemsWithEffectiveTarget.map((item) => ({ ...item, current_quantity: null, produced_quantity: 0 })),
      server_time: formatSP(),
    });
  }

  const productionTotals = await prisma.productionLog.groupBy({
    by: ["prep_item_id"],
    where: { shift_handover_id: latestHandover.id, tenant_id },
    _sum: { produced_quantity: true },
  });
  const producedByItem: Record<string, number> = Object.fromEntries(
    productionTotals.map((p) => [p.prep_item_id, p._sum.produced_quantity ?? 0])
  );

  return NextResponse.json({
    items: itemsWithEffectiveTarget.map((item) => {
      const handoverCount = latestHandover.items.find((hc) => hc.prep_item_id === item.id);
      const produced = producedByItem[item.id] ?? 0;
      if (!handoverCount) return { ...item, current_quantity: null, produced_quantity: produced };
      return {
        ...item,
        current_quantity: handoverCount.actual_quantity + produced,
        produced_quantity: produced,
      };
    }),
    server_time: formatSP(),
  });
}

// POST: link an existing prep item to this station
async function linkPrepItemHandler(req: AppRequest, { params }: { params: { stationId: string } }) {
  const tenant_id = req.ctx.tenant_id!;
  const station_id = params.stationId;
  const body = await req.json();
  const { prep_item_id } = body;

  if (!prep_item_id) {
    return NextResponse.json({ error: "prep_item_id é obrigatório" }, { status: 400 });
  }

  const item = await prisma.prepItem.findUnique({ where: { id: prep_item_id, tenant_id } });
  if (!item) {
    return NextResponse.json({ error: "Insumo não encontrado" }, { status: 404 });
  }

  const alreadyLinked = await prisma.prepItem.findFirst({
    where: { id: prep_item_id, stations: { some: { id: station_id } } } as any,
  });
  if (alreadyLinked) {
    return NextResponse.json({ error: "Insumo já vinculado a esta praça", code: "CONFLICT" }, { status: 409 });
  }

  await prisma.station.update({
    where: { id: station_id },
    data: { prepItems: { connect: { id: prep_item_id } } } as any,
  });

  return NextResponse.json({ success: true });
}

export const GET = compose(withAuth, withTenant, listPrepItemsHandler);
export const POST = compose(withAuth, withTenant, withRole(["ADMIN", "MANAGER"]), linkPrepItemHandler);

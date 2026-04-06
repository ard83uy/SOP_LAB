import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withValidation } from "@/lib/middlewares/withValidation";
import { upsertDayTargetsSchema } from "@/lib/validations/schemas";
import { prisma } from "@/lib/prisma";

async function getDayTargetsHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const tenant_id = req.ctx.tenant_id!;
  const prep_item_id = params.id;

  const item = await prisma.prepItem.findUnique({ where: { id: prep_item_id, tenant_id } });
  if (!item) {
    return NextResponse.json({ error: "Item not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const targets = await prisma.prepItemDayTarget.findMany({ where: { prep_item_id } });
  return NextResponse.json(targets);
}

async function upsertDayTargetsHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const tenant_id = req.ctx.tenant_id!;
  const prep_item_id = params.id;
  const { targets } = req.ctx.parsedBody;

  const item = await prisma.prepItem.findUnique({ where: { id: prep_item_id, tenant_id } });
  if (!item) {
    return NextResponse.json({ error: "Item not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const results = await prisma.$transaction(
    targets.map((t: { day_of_week: number; target_quantity: number }) =>
      prisma.prepItemDayTarget.upsert({
        where: { prep_item_id_day_of_week: { prep_item_id, day_of_week: t.day_of_week } },
        update: { target_quantity: t.target_quantity },
        create: { prep_item_id, day_of_week: t.day_of_week, target_quantity: t.target_quantity },
      })
    )
  );

  return NextResponse.json(results);
}

export const GET = compose(withAuth, withTenant, withRole(["ADMIN"]), getDayTargetsHandler);
export const PUT = compose(withAuth, withTenant, withRole(["ADMIN"]), withValidation(upsertDayTargetsSchema), upsertDayTargetsHandler);

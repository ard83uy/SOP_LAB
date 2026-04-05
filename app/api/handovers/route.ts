import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withModule } from "@/lib/middlewares/withModule";
import { withValidation } from "@/lib/middlewares/withValidation";
import { submitHandoverSchema } from "@/lib/validations/schemas";
import { prisma } from "@/lib/prisma";

async function submitHandoverHandler(req: AppRequest) {
  const { station_id, items } = req.ctx.parsedBody;
  const tenant_id = req.ctx.tenant_id!;
  const user_id = req.ctx.user_id!;

  const station = await prisma.station.findUnique({
    where: { id: station_id, tenant_id },
    include: { prepItems: true }
  });

  if (!station) {
    return NextResponse.json({ error: "Station not found", code: "NOT_FOUND", status: 404 }, { status: 404 });
  }

  const validItemIds = new Set(station.prepItems.map(i => i.id));
  const invalidItems = items.filter((i: any) => !validItemIds.has(i.prep_item_id));

  if (invalidItems.length > 0) {
    return NextResponse.json({ error: "Some items do not belong to this station", code: "BAD_REQUEST", status: 400 }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx: any) => {
    const handover = await tx.shiftHandover.create({
      data: {
        tenant_id,
        user_id,
        station_id,
        items: {
          create: items.map((i: any) => ({
            prep_item_id: i.prep_item_id,
            actual_quantity: i.actual_quantity
          }))
        }
      },
      include: { items: true }
    });

    return handover;
  });

  req.logger.info({ user_id, station_id, handover_id: result.id }, "Contagem realizada por " + user_id + " na praça " + station_id);

  return NextResponse.json(result, { status: 201 });
}

export const POST = compose(withAuth, withTenant, withRole(["ADMIN", "LINE_COOK"]), withModule("handover"), withValidation(submitHandoverSchema), submitHandoverHandler);

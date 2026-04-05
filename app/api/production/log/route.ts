import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withModule } from "@/lib/middlewares/withModule";
import { withValidation } from "@/lib/middlewares/withValidation";
import { submitProductionLogSchema } from "@/lib/validations/schemas";
import { prisma } from "@/lib/prisma";

async function logProductionHandler(req: AppRequest) {
  const { prep_item_id, shift_handover_id, produced_quantity } = req.ctx.parsedBody;
  const tenant_id = req.ctx.tenant_id!;
  const user_id = req.ctx.user_id!;

  const prepItem = await prisma.prepItem.findUnique({
    where: { id: prep_item_id, tenant_id }
  });

  if (!prepItem) {
    return NextResponse.json({ error: "Item not found", code: "NOT_FOUND", status: 404 }, { status: 404 });
  }

  const handover = await prisma.shiftHandover.findUnique({
    where: { id: shift_handover_id, tenant_id }
  });

  if (!handover) {
    return NextResponse.json({ error: "Handover not found", code: "NOT_FOUND", status: 404 }, { status: 404 });
  }

  const log = await prisma.$transaction(async (tx: any) => {
    return await tx.productionLog.create({
      data: {
        tenant_id,
        user_id,
        prep_item_id,
        shift_handover_id,
        produced_quantity
      }
    });
  });

  req.logger.info({ item_name: prepItem.name, produced_quantity, unit: prepItem.unit, user_id }, `Produção registrada: ${produced_quantity} ${prepItem.unit} de ${prepItem.name} por ${user_id}`);

  return NextResponse.json(log, { status: 201 });
}

export const POST = compose(withAuth, withTenant, withRole(["ADMIN", "PREP_KITCHEN"]), withModule("production"), withValidation(submitProductionLogSchema), logProductionHandler);

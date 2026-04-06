import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withValidation } from "@/lib/middlewares/withValidation";
import { reviewPrepItemRequestSchema } from "@/lib/validations/schemas";
import { prisma } from "@/lib/prisma";

async function reviewRequestHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const { action, target_quantity } = req.ctx.parsedBody;
  const tenant_id = req.ctx.tenant_id!;
  const request_id = params.id;

  const request = await prisma.prepItemRequest.findUnique({
    where: { id: request_id, tenant_id },
  });

  if (!request) {
    return NextResponse.json({ error: "Request not found", code: "NOT_FOUND" }, { status: 404 });
  }
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Request already reviewed", code: "CONFLICT" }, { status: 409 });
  }

  const updated = await prisma.$transaction(async (tx: any) => {
    if (action === "APPROVED") {
      if (!target_quantity) {
        throw new Error("target_quantity é obrigatório para aprovar");
      }
      // Create the PrepItem and link to the request
      const item = await tx.prepItem.create({
        data: {
          tenant_id,
          name: request.name,
          unit: request.unit,
          target_quantity,
          stations: { connect: { id: request.station_id } },
        },
      });
      return tx.prepItemRequest.update({
        where: { id: request_id },
        data: { status: "APPROVED", prep_item_id: item.id },
      });
    }

    return tx.prepItemRequest.update({
      where: { id: request_id },
      data: { status: "REJECTED" },
    });
  });

  req.logger.info({ request_id, action }, `PrepItemRequest ${action}`);
  return NextResponse.json(updated);
}

export const POST = compose(withAuth, withTenant, withRole(["ADMIN", "MANAGER"]), withValidation(reviewPrepItemRequestSchema), reviewRequestHandler);

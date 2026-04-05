import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withValidation } from "@/lib/middlewares/withValidation";
import { updatePrepItemSchema } from "@/lib/validations/schemas";
import { prisma } from "@/lib/prisma";

async function updatePrepItemHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const data = req.ctx.parsedBody;
  const tenant_id = req.ctx.tenant_id!;
  const id = params.id;

  const item = await prisma.prepItem.findUnique({
    where: { id, tenant_id }
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found", code: "NOT_FOUND", status: 404 }, { status: 404 });
  }

  const updated = await prisma.prepItem.update({
    where: { id },
    data
  });

  req.logger.info({ item_id: id, updates: data }, "PrepItem updated");

  return NextResponse.json(updated);
}

export const PATCH = compose(withAuth, withTenant, withRole(["ADMIN"]), withValidation(updatePrepItemSchema), updatePrepItemHandler);

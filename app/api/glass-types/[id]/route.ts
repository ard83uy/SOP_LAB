import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withValidation } from "@/lib/middlewares/withValidation";
import { updateGlassTypeSchema } from "@/lib/validations/schemas";
import { prisma } from "@/lib/prisma";

async function updateHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const tenant_id = req.ctx.tenant_id!;
  const glass = await prisma.glassType.findUnique({
    where: { id: params.id, tenant_id },
  });
  if (!glass) {
    return NextResponse.json({ error: "Tipo de copo não encontrado" }, { status: 404 });
  }

  const data = req.ctx.parsedBody as { name?: string; photo_url?: string | null; sort_order?: number };
  const updated = await prisma.glassType.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(updated);
}

async function deleteHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const tenant_id = req.ctx.tenant_id!;

  const glass = await prisma.glassType.findUnique({
    where: { id: params.id, tenant_id },
  });
  if (!glass) {
    return NextResponse.json({ error: "Tipo de copo não encontrado" }, { status: 404 });
  }

  await prisma.glassType.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export const PATCH = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withValidation(updateGlassTypeSchema),
  updateHandler,
);

export const DELETE = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  deleteHandler,
);

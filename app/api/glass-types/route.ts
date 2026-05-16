import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withValidation } from "@/lib/middlewares/withValidation";
import { createGlassTypeSchema } from "@/lib/validations/schemas";
import { prisma } from "@/lib/prisma";

async function listHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;

  const glasses = await prisma.glassType.findMany({
    where: { tenant_id },
    orderBy: [{ sort_order: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(glasses);
}

async function createHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;
  const { name, photo_url, sort_order } = req.ctx.parsedBody;

  const existing = await prisma.glassType.findUnique({
    where: { tenant_id_name: { tenant_id, name } } as any,
  });

  if (existing) {
    return NextResponse.json(
      { error: "Já existe um tipo de copo com este nome" },
      { status: 409 },
    );
  }

  const glass = await prisma.glassType.create({
    data: {
      tenant_id,
      name,
      photo_url: photo_url ?? null,
      sort_order: sort_order ?? 0,
    },
  });

  return NextResponse.json(glass, { status: 201 });
}

export const GET = compose(withAuth, withTenant, listHandler);
export const POST = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withValidation(createGlassTypeSchema),
  createHandler,
);

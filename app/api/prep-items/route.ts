import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withValidation } from "@/lib/middlewares/withValidation";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createPrepItemSchema = z.object({
  name: z.string().min(2).max(100),
  unit: z.string().min(1).max(20),
  target_quantity: z.number().positive().max(99999),
});

async function listPrepItemsHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;

  const items = await prisma.prepItem.findMany({
    where: { tenant_id },
    include: {
      dayTargets: true,
      stations: { select: { id: true, name: true } },
    } as any,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(items);
}

async function createPrepItemHandler(req: AppRequest) {
  const { name, unit, target_quantity } = req.ctx.parsedBody;
  const tenant_id = req.ctx.tenant_id!;

  const existing = await prisma.prepItem.findUnique({
    where: { tenantId_name: { tenant_id, name } } as any,
  });

  if (existing) {
    return NextResponse.json(
      { error: "Já existe um insumo com este nome.", code: "CONFLICT" },
      { status: 409 }
    );
  }

  const item = await prisma.prepItem.create({
    data: { tenant_id, name, unit, target_quantity } as any,
  });

  req.logger.info({ item_id: item.id }, "PrepItem created");
  return NextResponse.json(item, { status: 201 });
}

export const GET = compose(withAuth, withTenant, listPrepItemsHandler);
export const POST = compose(withAuth, withTenant, withRole(["ADMIN", "MANAGER"]), withValidation(createPrepItemSchema), createPrepItemHandler);

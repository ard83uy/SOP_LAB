import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compose, type AppRequest } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { z } from "zod";

const updateSchema = z.object({
  target_quantity: z.number().positive().optional(),
  name: z.string().min(2).max(100).optional(),
  unit: z.string().min(1).max(20).optional(),
});

export const PATCH = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  async (req: AppRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    const tenant_id = req.ctx.tenant_id!;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parsed.error.issues }, { status: 400 });
    }

    const item = await prisma.prepItem.findUnique({ where: { id, tenant_id } });
    if (!item) {
      return NextResponse.json({ error: "Insumo não encontrado" }, { status: 404 });
    }

    const updated = await prisma.prepItem.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(updated);
  }
);

export const DELETE = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  async (req: AppRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    const tenant_id = req.ctx.tenant_id!;

    const item = await prisma.prepItem.findUnique({ where: { id, tenant_id } });
    if (!item) {
      return NextResponse.json({ error: "Insumo não encontrado" }, { status: 404 });
    }

    await prisma.prepItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }
);

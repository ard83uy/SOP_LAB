import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compose, type AppRequest } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withModule } from "@/lib/middlewares/withModule";
import { z } from "zod";

const schema = z.object({ order: z.array(z.string().uuid()).min(1) });

async function handler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  // Verify all checklists belong to tenant
  const count = await prisma.checklist.count({
    where: { id: { in: body.data.order }, tenant_id },
  });
  if (count !== body.data.order.length)
    return NextResponse.json({ error: "Checklist não encontrado" }, { status: 404 });

  await prisma.$transaction(
    body.data.order.map((id, index) =>
      prisma.checklist.update({ where: { id }, data: { sort_order: index } }),
    ),
  );
  return NextResponse.json({ success: true });
}

export const POST = compose(withAuth, withTenant, withRole(["ADMIN", "MANAGER"]), withModule("checklists"), handler);

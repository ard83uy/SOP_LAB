import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compose, type AppRequest } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withModule } from "@/lib/middlewares/withModule";
import { z } from "zod";

const reorderSchema = z.object({
  order: z.array(z.string().uuid()).min(1),
});

// ── POST /api/checklists/[id]/tasks/reorder ──────────────────────────────────

async function reorderTasksHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const tenant_id = req.ctx.tenant_id!;

  const body = reorderSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const checklist = await prisma.checklist.findUnique({ where: { id: params.id, tenant_id } });
  if (!checklist) {
    return NextResponse.json({ error: "Checklist não encontrado" }, { status: 404 });
  }

  await prisma.$transaction(
    body.data.order.map((taskId, index) =>
      prisma.checklistTask.updateMany({
        where: { id: taskId, checklist_id: params.id },
        data: { sort_order: index },
      }),
    ),
  );

  req.logger.info({ checklist_id: params.id }, "Tasks reordenadas");
  return NextResponse.json({ success: true });
}

export const POST = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withModule("checklists"),
  reorderTasksHandler,
);

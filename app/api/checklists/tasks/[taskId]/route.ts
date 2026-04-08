import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compose, type AppRequest } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withModule } from "@/lib/middlewares/withModule";
import { withValidation } from "@/lib/middlewares/withValidation";
import { updateChecklistTaskSchema } from "@/lib/validations/schemas";

// ── PATCH /api/checklists/tasks/[taskId] ────────────────────────────────────

async function updateTaskHandler(req: AppRequest, { params }: { params: { taskId: string } }) {
  const tenant_id = req.ctx.tenant_id!;
  const body = req.ctx.parsedBody;

  const task = await prisma.checklistTask.findFirst({
    where: { id: params.taskId, checklist: { tenant_id } },
  });

  if (!task) {
    return NextResponse.json({ error: "Task não encontrada" }, { status: 404 });
  }

  const updated = await prisma.checklistTask.update({
    where: { id: params.taskId },
    data: body,
  });

  req.logger.info({ id: params.taskId }, "Task atualizada");
  return NextResponse.json(updated);
}

// ── DELETE /api/checklists/tasks/[taskId] ───────────────────────────────────

async function deleteTaskHandler(req: AppRequest, { params }: { params: { taskId: string } }) {
  const tenant_id = req.ctx.tenant_id!;

  const task = await prisma.checklistTask.findFirst({
    where: { id: params.taskId, checklist: { tenant_id } },
  });

  if (!task) {
    return NextResponse.json({ error: "Task não encontrada" }, { status: 404 });
  }

  await prisma.checklistTask.delete({ where: { id: params.taskId } });
  req.logger.info({ id: params.taskId }, "Task excluída");
  return NextResponse.json({ success: true });
}

export const PATCH = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withModule("checklists"),
  withValidation(updateChecklistTaskSchema),
  updateTaskHandler,
);

export const DELETE = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withModule("checklists"),
  deleteTaskHandler,
);

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compose, type AppRequest } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withModule } from "@/lib/middlewares/withModule";
import { withValidation } from "@/lib/middlewares/withValidation";
import { createChecklistTaskSchema } from "@/lib/validations/schemas";

// ── POST /api/checklists/[id]/tasks ─────────────────────────────────────────

async function addTaskHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const tenant_id = req.ctx.tenant_id!;
  const body = req.ctx.parsedBody;

  const checklist = await prisma.checklist.findUnique({ where: { id: params.id, tenant_id } });
  if (!checklist) {
    return NextResponse.json({ error: "Checklist não encontrado" }, { status: 404 });
  }

  // Get current max sort_order
  const lastTask = await prisma.checklistTask.findFirst({
    where: { checklist_id: params.id },
    orderBy: { sort_order: "desc" },
    select: { sort_order: true },
  });

  const task = await prisma.checklistTask.create({
    data: {
      checklist_id: params.id,
      title: body.title,
      description: body.description ?? null,
      frequency: body.frequency ?? "DAILY",
      days_of_week: body.days_of_week ?? [],
      time_slot: body.time_slot ?? "ALL_DAY",
      sort_order: body.sort_order ?? (lastTask ? lastTask.sort_order + 1 : 0),
      points: body.points ?? 1,
    },
  });

  req.logger.info({ id: task.id, checklist_id: params.id }, "Task adicionada ao checklist");
  return NextResponse.json(task, { status: 201 });
}

export const POST = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withModule("checklists"),
  withValidation(createChecklistTaskSchema),
  addTaskHandler,
);

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compose, type AppRequest } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withModule } from "@/lib/middlewares/withModule";
import { withValidation } from "@/lib/middlewares/withValidation";
import { checklistCompletionSchema, deleteChecklistCompletionSchema } from "@/lib/validations/schemas";

// ── POST /api/checklists/completions ────────────────────────────────────────

async function completeTaskHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;
  const user_id = req.ctx.user_id!;
  const { task_id, date, note } = req.ctx.parsedBody;

  // Verify task belongs to this tenant
  const task = await prisma.checklistTask.findFirst({
    where: { id: task_id, checklist: { tenant_id } },
  });

  if (!task) {
    return NextResponse.json({ error: "Task não encontrada" }, { status: 404 });
  }

  const completion = await prisma.checklistCompletion.upsert({
    where: { task_id_user_id_date: { task_id, user_id, date } },
    create: { task_id, user_id, tenant_id, date, note: note ?? null },
    update: { note: note ?? null },
  });

  return NextResponse.json(completion, { status: 201 });
}

// ── DELETE /api/checklists/completions ──────────────────────────────────────

async function uncompleteTaskHandler(req: AppRequest) {
  const user_id = req.ctx.user_id!;
  const tenant_id = req.ctx.tenant_id!;

  // Parse body from request (DELETE with body)
  let body;
  try {
    body = deleteChecklistCompletionSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { task_id, date } = body;

  const completion = await prisma.checklistCompletion.findUnique({
    where: { task_id_user_id_date: { task_id, user_id, date } },
  });

  if (!completion || completion.tenant_id !== tenant_id) {
    return NextResponse.json({ error: "Conclusão não encontrada" }, { status: 404 });
  }

  await prisma.checklistCompletion.delete({
    where: { task_id_user_id_date: { task_id, user_id, date } },
  });

  return NextResponse.json({ success: true });
}

export const POST = compose(
  withAuth,
  withTenant,
  withModule("checklists"),
  withValidation(checklistCompletionSchema),
  completeTaskHandler,
);

export const DELETE = compose(
  withAuth,
  withTenant,
  withModule("checklists"),
  uncompleteTaskHandler,
);

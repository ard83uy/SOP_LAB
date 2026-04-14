import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withModule } from "@/lib/middlewares/withModule";
import { withValidation } from "@/lib/middlewares/withValidation";
import { createChecklistSchema } from "@/lib/validations/schemas";
import { prisma } from "@/lib/prisma";

// ── GET /api/checklists ─────────────────────────────────────────────────────

async function listChecklistsHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;

  const checklists = await prisma.checklist.findMany({
    where: { tenant_id },
    orderBy: { created_at: "desc" },
    include: {
      profiles: { select: { id: true, name: true } },
      tasks: {
        where: { is_active: true },
        select: { id: true, title: true, description: true, time_slot: true },
        orderBy: { sort_order: "asc" },
      },
      _count: { select: { tasks: true } },
      creator: { select: { name: true } },
    },
  });

  return NextResponse.json(checklists);
}

// ── POST /api/checklists ────────────────────────────────────────────────────

async function createChecklistHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;
  const user_id = req.ctx.user_id!;
  const { name, description, profile_ids, tasks } = req.ctx.parsedBody;

  const existing = await prisma.checklist.findUnique({
    where: { tenant_id_name: { tenant_id, name } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Já existe um checklist com este nome", code: "CONFLICT" },
      { status: 409 },
    );
  }

  const checklist = await prisma.checklist.create({
    data: {
      tenant_id,
      name,
      description: description ?? null,
      created_by: user_id,
      profiles: { connect: profile_ids.map((id: string) => ({ id })) },
      tasks: tasks?.length
        ? {
            create: tasks.map((t: any, idx: number) => ({
              title: t.title,
              description: t.description ?? null,
              frequency: t.frequency ?? "DAILY",
              days_of_week: t.days_of_week ?? [],
              time_slot: t.time_slot ?? "ALL_DAY",
              sort_order: t.sort_order ?? idx,
              points: t.points ?? 1,
            })),
          }
        : undefined,
    },
    include: {
      profiles: { select: { id: true, name: true } },
      tasks: { orderBy: { sort_order: "asc" } },
    },
  });

  req.logger.info({ id: checklist.id, name }, "Checklist criado");
  return NextResponse.json(checklist, { status: 201 });
}

export const GET = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withModule("checklists"),
  listChecklistsHandler,
);

export const POST = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withModule("checklists"),
  withValidation(createChecklistSchema),
  createChecklistHandler,
);

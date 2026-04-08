import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compose, type AppRequest } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withModule } from "@/lib/middlewares/withModule";
import { withValidation } from "@/lib/middlewares/withValidation";
import { updateChecklistSchema } from "@/lib/validations/schemas";

// ── GET /api/checklists/[id] ────────────────────────────────────────────────

async function getChecklistHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const tenant_id = req.ctx.tenant_id!;

  const checklist = await prisma.checklist.findUnique({
    where: { id: params.id, tenant_id },
    include: {
      profiles: { select: { id: true, name: true } },
      tasks: { orderBy: { sort_order: "asc" } },
      creator: { select: { name: true } },
    },
  });

  if (!checklist) {
    return NextResponse.json({ error: "Checklist não encontrado" }, { status: 404 });
  }

  return NextResponse.json(checklist);
}

// ── PATCH /api/checklists/[id] ──────────────────────────────────────────────

async function updateChecklistHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const tenant_id = req.ctx.tenant_id!;
  const { profile_ids, ...data } = req.ctx.parsedBody;

  const checklist = await prisma.checklist.findUnique({ where: { id: params.id, tenant_id } });
  if (!checklist) {
    return NextResponse.json({ error: "Checklist não encontrado" }, { status: 404 });
  }

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  if (profile_ids !== undefined) {
    updateData.profiles = { set: profile_ids.map((id: string) => ({ id })) };
  }

  const updated = await prisma.checklist.update({
    where: { id: params.id },
    data: updateData,
    include: {
      profiles: { select: { id: true, name: true } },
      tasks: { orderBy: { sort_order: "asc" } },
    },
  });

  req.logger.info({ id: params.id }, "Checklist atualizado");
  return NextResponse.json(updated);
}

// ── DELETE /api/checklists/[id] ─────────────────────────────────────────────

async function deleteChecklistHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const tenant_id = req.ctx.tenant_id!;

  const checklist = await prisma.checklist.findUnique({ where: { id: params.id, tenant_id } });
  if (!checklist) {
    return NextResponse.json({ error: "Checklist não encontrado" }, { status: 404 });
  }

  await prisma.checklist.delete({ where: { id: params.id } });
  req.logger.info({ id: params.id, name: checklist.name }, "Checklist excluído");
  return NextResponse.json({ success: true });
}

export const GET = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withModule("checklists"),
  getChecklistHandler,
);

export const PATCH = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withModule("checklists"),
  withValidation(updateChecklistSchema),
  updateChecklistHandler,
);

export const DELETE = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withModule("checklists"),
  deleteChecklistHandler,
);

import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withValidation } from "@/lib/middlewares/withValidation";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getTargetUser(id: string, tenant_id: string) {
  return prisma.user.findFirst({ where: { id, tenant_id } });
}

// ── PATCH /api/users/[id] ────────────────────────────────────────────────────

const updateUserSchema = z
  .object({
    name: z.string().min(2).optional(),
    role: z.enum(["ADMIN", "MANAGER", "STATION_LEADER", "PREP_KITCHEN", "STAFF"]).optional(),
    password: z.string().min(8).optional(),
    suspended: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Nenhum campo enviado" });

async function updateUserHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const tenant_id = req.ctx.tenant_id!;
  const { name, role, password, suspended } = req.ctx.parsedBody;

  const target = await getTargetUser(id, tenant_id);
  if (!target) {
    return NextResponse.json({ error: "Usuário não encontrado", code: "NOT_FOUND" }, { status: 404 });
  }

  const clerk = await clerkClient();

  // Update name / password in Clerk
  if (name !== undefined || password !== undefined) {
    const [firstName, ...rest] = (name ?? target.name).trim().split(" ");
    const lastName = rest.join(" ") || undefined;
    try {
      await clerk.users.updateUser(target.clerk_user_id, {
        firstName,
        lastName,
        ...(password !== undefined ? { password } : {}),
      });
    } catch (err: any) {
      const clerkError = err?.errors?.[0];
      const message = clerkError?.longMessage || clerkError?.message || "Erro ao atualizar no Clerk";
      req.logger.error({ err }, "Clerk updateUser failed");
      return NextResponse.json({ error: message, code: "CLERK_ERROR" }, { status: 422 });
    }
  }

  // Suspend / unsuspend
  if (suspended !== undefined) {
    try {
      if (suspended) {
        await clerk.users.banUser(target.clerk_user_id);
      } else {
        await clerk.users.unbanUser(target.clerk_user_id);
      }
    } catch (err: any) {
      req.logger.error({ err }, "Clerk ban/unban failed");
      return NextResponse.json({ error: "Erro ao suspender usuário", code: "CLERK_ERROR" }, { status: 422 });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(suspended !== undefined ? { status: suspended ? "INACTIVE" : "ACTIVE" } : {}),
    },
  });

  req.logger.info({ user_id: id, name, role, suspended }, "User updated");
  return NextResponse.json(updated);
}

// ── DELETE /api/users/[id] ───────────────────────────────────────────────────

async function deleteUserHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const tenant_id = req.ctx.tenant_id!;

  if (req.ctx.user_id === id) {
    return NextResponse.json({ error: "Você não pode se excluir", code: "FORBIDDEN" }, { status: 400 });
  }

  const target = await getTargetUser(id, tenant_id);
  if (!target) {
    return NextResponse.json({ error: "Usuário não encontrado", code: "NOT_FOUND" }, { status: 404 });
  }

  const clerk = await clerkClient();

  try {
    await clerk.users.deleteUser(target.clerk_user_id);
  } catch (err: any) {
    req.logger.error({ err }, "Clerk deleteUser failed");
    return NextResponse.json({ error: "Erro ao excluir do Clerk", code: "CLERK_ERROR" }, { status: 422 });
  }

  await prisma.user.delete({ where: { id } });

  req.logger.info({ user_id: id }, "User deleted");
  return NextResponse.json({ success: true });
}

export const PATCH = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withValidation(updateUserSchema),
  updateUserHandler
);

export const DELETE = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  deleteUserHandler
);

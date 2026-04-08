import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withValidation } from "@/lib/middlewares/withValidation";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const VALID_ROLES = ["ADMIN", "MANAGER", "STATION_LEADER", "PREP_KITCHEN", "STAFF"] as const;

const VALID_MODULES = ["stations", "handover", "production", "prep_items", "fichas", "checklists", "settings"] as const;

// Accept full or partial module updates
const modulesSchema = z.record(z.string(), z.boolean()).refine(
  (obj) => Object.keys(obj).every((k) => VALID_MODULES.includes(k as any)),
  { message: "Módulo inválido" }
);

const updateProfileSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(50).optional(),
  base_role: z.enum(VALID_ROLES).optional(),
  allowed_modules: modulesSchema.optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Nenhum campo enviado" });

async function updateProfileHandler(
  req: AppRequest,
  { params }: { params: { id: string } }
) {
  const { name, base_role, allowed_modules } = req.ctx.parsedBody;
  const tenant_id = req.ctx.tenant_id!;
  const { id } = params;

  const profile = await prisma.userProfile.findFirst({
    where: { id, tenant_id },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Perfil não encontrado", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (name !== undefined) {
    const duplicate = await prisma.userProfile.findFirst({
      where: { tenant_id, name, NOT: { id } },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Já existe um perfil com este nome", code: "CONFLICT" },
        { status: 409 }
      );
    }
  }

  // Merge allowed_modules with existing ones (partial update support)
  let mergedModules = allowed_modules;
  if (allowed_modules !== undefined) {
    const currentModules = (typeof profile.allowed_modules === 'object' && profile.allowed_modules !== null && !Array.isArray(profile.allowed_modules))
      ? profile.allowed_modules as Record<string, boolean>
      : {};
    mergedModules = { ...currentModules, ...allowed_modules };
  }

  const updated = await prisma.userProfile.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(base_role !== undefined ? { base_role } : {}),
      ...(mergedModules !== undefined ? { allowed_modules: mergedModules } : {}),
    },
  });

  // Sync role on all users with this profile when base_role changes
  if (base_role !== undefined) {
    await prisma.user.updateMany({
      where: { profile_id: id },
      data: { role: base_role },
    });
  }

  req.logger.info({ profile_id: id, name, base_role, allowed_modules }, "UserProfile updated");
  return NextResponse.json(updated);
}

async function deleteProfileHandler(
  req: AppRequest,
  { params }: { params: { id: string } }
) {
  const tenant_id = req.ctx.tenant_id!;
  const { id } = params;

  const profile = await prisma.userProfile.findFirst({
    where: { id, tenant_id },
    include: { _count: { select: { users: true } } },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Perfil não encontrado", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (profile._count.users > 0) {
    return NextResponse.json(
      {
        error: `Este perfil está atribuído a ${profile._count.users} usuário(s). Remova a atribuição antes de excluir.`,
        code: "IN_USE",
      },
      { status: 400 }
    );
  }

  await prisma.userProfile.delete({ where: { id } });

  req.logger.info({ profile_id: id }, "UserProfile deleted");
  return NextResponse.json({ success: true });
}

export const PATCH = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withValidation(updateProfileSchema),
  updateProfileHandler
);

export const DELETE = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  deleteProfileHandler
);

import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withValidation } from "@/lib/middlewares/withValidation";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const VALID_ROLES = ["ADMIN", "MANAGER", "STATION_LEADER", "PREP_KITCHEN", "STAFF"] as const;

const createProfileSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(50),
  base_role: z.enum(VALID_ROLES).default("STAFF"),
});

async function listProfilesHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;

  const profiles = await prisma.userProfile.findMany({
    where: { tenant_id },
    include: {
      users: { select: { id: true, name: true, email: true, role: true, status: true } },
      _count: { select: { users: true } },
    },
    orderBy: { created_at: "asc" },
  });

  return NextResponse.json(profiles);
}

async function createProfileHandler(req: AppRequest) {
  const { name, base_role } = req.ctx.parsedBody;
  const tenant_id = req.ctx.tenant_id!;

  const existing = await prisma.userProfile.findUnique({
    where: { tenant_id_name: { tenant_id, name } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Já existe um perfil com este nome", code: "CONFLICT" },
      { status: 409 }
    );
  }

  const profile = await prisma.userProfile.create({
    data: { name, base_role, tenant_id },
  });

  req.logger.info({ profile_id: profile.id, name }, "UserProfile created");
  return NextResponse.json(profile, { status: 201 });
}

export const GET = compose(withAuth, withTenant, withRole(["ADMIN", "MANAGER"]), listProfilesHandler);
export const POST = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withValidation(createProfileSchema),
  createProfileHandler
);

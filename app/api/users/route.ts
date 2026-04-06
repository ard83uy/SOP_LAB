import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withValidation } from "@/lib/middlewares/withValidation";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function listUsersHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;

  const users = await prisma.user.findMany({
    where: { tenant_id },
    orderBy: { created_at: "asc" },
  });

  return NextResponse.json(users);
}

const createUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  role: z.enum(["ADMIN", "MANAGER", "STATION_LEADER", "PREP_KITCHEN", "STAFF"]),
});

async function createUserHandler(req: AppRequest) {
  const { name, email, password, role } = req.ctx.parsedBody;
  const tenant_id = req.ctx.tenant_id!;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenant_id },
    include: { _count: { select: { users: true } } },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found", code: "NOT_FOUND" }, { status: 404 });
  }

  if (tenant._count.users >= tenant.max_employees) {
    return NextResponse.json(
      { error: "Limite de funcionários atingido", code: "LIMIT_REACHED" },
      { status: 400 }
    );
  }

  const [firstName, ...rest] = name.trim().split(" ");
  const lastName = rest.join(" ") || undefined;

  const clerk = await clerkClient();

  let clerkUser;
  try {
    clerkUser = await clerk.users.createUser({
      emailAddress: [email],
      password,
      firstName,
      lastName,
    });
  } catch (err: any) {
    const clerkError = err?.errors?.[0];
    const message = clerkError?.longMessage || clerkError?.message || "Erro ao criar usuário no Clerk";
    req.logger.error({ err }, "Clerk createUser failed");
    return NextResponse.json({ error: message, code: "CLERK_ERROR" }, { status: 422 });
  }

  const user = await prisma.user.create({
    data: {
      clerk_user_id: clerkUser.id,
      tenant_id,
      role,
      name,
      email,
      status: "ACTIVE",
    },
  });

  req.logger.info({ new_user_id: user.id, email, role }, "User created");
  return NextResponse.json(user, { status: 201 });
}

export const GET = compose(withAuth, withTenant, listUsersHandler);
export const POST = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withValidation(createUserSchema),
  createUserHandler
);

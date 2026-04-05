import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withValidation } from "@/lib/middlewares/withValidation";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const inviteUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(["ADMIN", "LINE_COOK", "PREP_KITCHEN"]),
});

async function inviteUserHandler(req: AppRequest) {
  const { email, name, role } = req.ctx.parsedBody;
  const tenant_id = req.ctx.tenant_id!;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenant_id },
    include: { _count: { select: { users: true } } }
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found", code: "NOT_FOUND", status: 404 }, { status: 404 });
  }

  if (tenant._count.users >= tenant.max_employees) {
    return NextResponse.json(
      { error: "Employee limit reached", code: "LIMIT_REACHED", status: 400 },
      { status: 400 }
    );
  }

  const dummyClerkId = "invite_" + crypto.randomUUID();

  const user = await prisma.user.create({
    data: {
      clerk_user_id: dummyClerkId,
      tenant_id,
      role,
      name,
      email,
      status: "ONBOARDING",
    }
  });

  req.logger.info({ new_user_id: user.id, email, role }, "User invited / created");

  return NextResponse.json(user, { status: 201 });
}

export const POST = compose(withAuth, withTenant, withRole(["ADMIN"]), withValidation(inviteUserSchema), inviteUserHandler);

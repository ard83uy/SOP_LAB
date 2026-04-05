import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withValidation } from "@/lib/middlewares/withValidation";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createTenantSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
});

async function createTenantHandler(req: AppRequest) {
  const { name, slug } = req.ctx.parsedBody;
  const clerk_user_id = req.ctx.clerk_user_id!;

  const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
  if (existingTenant) {
    return NextResponse.json({ error: "Slug already in use", code: "CONFLICT", status: 409 }, { status: 409 });
  }

  const existingUser = await prisma.user.findUnique({ where: { clerk_user_id } });
  if (existingUser) {
    return NextResponse.json({ error: "User already exists", code: "CONFLICT", status: 409 }, { status: 409 });
  }

  const result = await prisma.$transaction(async (tx: any) => {
    const tenant = await tx.tenant.create({
      data: { name, slug }
    });

    const user = await tx.user.create({
      data: {
        clerk_user_id,
        tenant_id: tenant.id,
        role: "ADMIN",
        name: "Admin Default",
        email: "admin@example.com",
        status: "ACTIVE"
      }
    });

    return { tenant, user };
  });

  req.logger.info({ tenant_id: result.tenant.id, user_id: result.user.id }, "Tenant and ADMIN created");

  return NextResponse.json(result, { status: 201 });
}

export const POST = compose(withAuth, withValidation(createTenantSchema), createTenantHandler);

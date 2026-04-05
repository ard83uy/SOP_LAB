import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { prisma } from "@/lib/prisma";

async function getMeHandler(req: AppRequest) {
  const user_id = req.ctx.user_id!;
  const tenant_id = req.ctx.tenant_id!;

  const user = await prisma.user.findUnique({
    where: { id: user_id, tenant_id },
    include: { tenant: true }
  });

  return NextResponse.json(user);
}

export const GET = compose(withAuth, withTenant, getMeHandler);

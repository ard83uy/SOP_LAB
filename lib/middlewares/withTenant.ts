import { NextResponse } from "next/server";
import { AppRequest, Middleware } from "./compose";
import { prisma } from "../prisma";

export const withTenant: Middleware = async (req, next) => {
  const clerk_user_id = req.ctx.clerk_user_id;

  if (!clerk_user_id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED", status: 401 }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerk_user_id },
    select: { id: true, tenant_id: true, role: true, profile_id: true }
  });

  if (!user) {
    req.logger.warn({ clerk_user_id }, "User not found in database");
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN", status: 403 },
      { status: 403 }
    );
  }

  req.ctx.tenant_id = user.tenant_id;
  req.ctx.user_id = user.id;
  req.ctx.role = user.role;
  req.ctx.profile_id = user.profile_id;

  req.logger = req.logger.child({ tenant_id: user.tenant_id, user_id: user.id });

  return next();
};

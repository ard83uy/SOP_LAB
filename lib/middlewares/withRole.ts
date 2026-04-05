import { NextResponse } from "next/server";
import { Middleware } from "./compose";

export const withRole = (allowedRoles: string[]): Middleware => {
  return async (req, next) => {
    if (!req.ctx.role || !allowedRoles.includes(req.ctx.role)) {
      req.logger.warn({ role: req.ctx.role, allowedRoles }, "User role not authorized");
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN", status: 403 },
        { status: 403 }
      );
    }
    return next();
  };
};

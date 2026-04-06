import { NextResponse } from "next/server";
import { Middleware } from "./compose";
import { prisma } from "../prisma";

export const withModule = (moduleName: string): Middleware => {
  return async (req, next) => {
    const tenant_id = req.ctx.tenant_id;

    if (!tenant_id) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN", status: 403 }, { status: 403 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenant_id },
      select: { active_modules: true }
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found", code: "NOT_FOUND", status: 404 }, { status: 404 });
    }

    const raw = tenant.active_modules;
    // Support both array format ["handover"] and object format {"handover": true}
    const isActive = Array.isArray(raw)
      ? raw.includes(moduleName)
      : typeof raw === "object" && raw !== null && (raw as Record<string, unknown>)[moduleName] === true;

    if (!isActive) {
      req.logger.warn({ tenant_id, module: moduleName }, "Module not active for tenant");
      return NextResponse.json(
        { error: "Módulo não disponível no seu plano", code: "FORBIDDEN_MODULE", status: 403 },
        { status: 403 }
      );
    }

    return next();
  };
};

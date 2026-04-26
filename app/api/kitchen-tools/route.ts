import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withValidation } from "@/lib/middlewares/withValidation";
import { createKitchenToolSchema } from "@/lib/validations/schemas";
import { prisma } from "@/lib/prisma";

// ── GET /api/kitchen-tools ───────────────────────────────────────────────────

async function listHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;

  const tools = await prisma.kitchenTool.findMany({
    where: { tenant_id },
    orderBy: [{ sort_order: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(tools);
}

// ── POST /api/kitchen-tools ──────────────────────────────────────────────────

async function createHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;
  const { name, sort_order } = req.ctx.parsedBody;

  const existing = await prisma.kitchenTool.findUnique({
    where: { tenant_id_name: { tenant_id, name } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Já existe uma ferramenta com este nome" },
      { status: 409 },
    );
  }

  const tool = await prisma.kitchenTool.create({
    data: { tenant_id, name, sort_order: sort_order ?? 0 },
  });

  return NextResponse.json(tool, { status: 201 });
}

export const GET = compose(withAuth, withTenant, listHandler);
export const POST = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withValidation(createKitchenToolSchema),
  createHandler,
);

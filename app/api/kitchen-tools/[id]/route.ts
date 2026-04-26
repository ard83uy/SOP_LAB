import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { prisma } from "@/lib/prisma";

// ── DELETE /api/kitchen-tools/[id] ──────────────────────────────────────────

async function deleteHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const tenant_id = req.ctx.tenant_id!;

  const tool = await prisma.kitchenTool.findUnique({
    where: { id: params.id, tenant_id },
  });

  if (!tool) {
    return NextResponse.json({ error: "Ferramenta não encontrada" }, { status: 404 });
  }

  await prisma.kitchenTool.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export const DELETE = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  deleteHandler,
);

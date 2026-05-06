import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { compose, type AppRequest } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withModule } from "@/lib/middlewares/withModule";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { ChecklistPdfDocument } from "@/components/checklists/ChecklistPdfDocument";
import { z } from "zod";

const exportSchema = z.object({
  profile_id: z.string().uuid(),
  checklist_ids: z.array(z.string().uuid()).min(1),
  task_ids: z.array(z.string().uuid()).optional(),
});

// ── POST /api/checklists/export-pdf ──────────────────────────────────────────

async function exportPdfHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;

  const body = exportSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const { profile_id, checklist_ids, task_ids } = body.data;

  // Fetch profile
  const profile = await prisma.userProfile.findUnique({
    where: { id: profile_id, tenant_id },
    select: { name: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
  }

  // Fetch tenant name
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenant_id },
    select: { name: true },
  });

  // Fetch checklists with tasks ordered by sort_order
  const checklists = await prisma.checklist.findMany({
    where: {
      id: { in: checklist_ids },
      tenant_id,
      is_active: true,
    },
    include: {
      tasks: {
        where: { is_active: true },
        orderBy: { sort_order: "asc" },
      },
    },
    orderBy: { created_at: "asc" },
  });

  // Filter tasks if specific task_ids provided
  const filteredChecklists = checklists.map((cl) => ({
    id: cl.id,
    name: cl.name,
    description: cl.description,
    tasks: task_ids
      ? cl.tasks.filter((t) => task_ids.includes(t.id))
      : cl.tasks,
  }));

  // Generate PDF — cast needed: renderToBuffer expects DocumentProps ReactElement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(
    createElement(ChecklistPdfDocument, {
      checklists: filteredChecklists,
      profileName: profile.name,
      restaurantName: tenant?.name,
    }) as any,
  );

  const fileName = `checklist-${profile.name.toLowerCase().replace(/\s+/g, "-")}-${
    new Date().toISOString().split("T")[0]
  }.pdf`;

  req.logger.info(
    { profile_id, checklist_ids, tenant_id },
    "PDF de checklist exportado",
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": pdfBuffer.length.toString(),
    },
  });
}

export const POST = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withModule("checklists"),
  exportPdfHandler,
);

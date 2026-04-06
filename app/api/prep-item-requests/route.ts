import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withValidation } from "@/lib/middlewares/withValidation";
import { createPrepItemRequestSchema } from "@/lib/validations/schemas";
import { prisma } from "@/lib/prisma";

// GET: Admin lists all PENDING requests for the tenant
async function listRequestsHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;

  const requests = await prisma.prepItemRequest.findMany({
    where: { tenant_id, status: "PENDING" },
    include: { station: { select: { name: true } }, user: { select: { name: true } } },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json(requests);
}

// POST: Any staff submits a request for a new prep item in a station
async function createRequestHandler(req: AppRequest) {
  const { station_id, name, unit, note } = req.ctx.parsedBody;
  const tenant_id = req.ctx.tenant_id!;
  const user_id = req.ctx.user_id!;

  const station = await prisma.station.findUnique({ where: { id: station_id, tenant_id } });
  if (!station) {
    return NextResponse.json({ error: "Station not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const existing = await prisma.prepItemRequest.findFirst({
    where: { tenant_id, station_id, name, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Já existe uma solicitação pendente para este insumo nesta praça.", code: "CONFLICT" },
      { status: 409 }
    );
  }

  const request = await prisma.prepItemRequest.create({
    data: { tenant_id, station_id, user_id, name, unit, note },
  });

  req.logger.info({ request_id: request.id }, "PrepItemRequest created");
  return NextResponse.json(request, { status: 201 });
}

export const GET = compose(withAuth, withTenant, withRole(["ADMIN"]), listRequestsHandler);
export const POST = compose(withAuth, withTenant, withValidation(createPrepItemRequestSchema), createRequestHandler);

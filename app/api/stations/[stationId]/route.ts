import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compose, type AppRequest } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withValidation } from "@/lib/middlewares/withValidation";
import { updateStationSchema } from "@/lib/validations/schemas";

export const PATCH = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withValidation(updateStationSchema),
  async (req: AppRequest, { params }: { params: { stationId: string } }) => {
    const { stationId } = params;
    const { name, icon } = req.ctx.parsedBody;
    const tenant_id = req.ctx.tenant_id!;

    const existing = await prisma.station.findFirst({
      where: { tenant_id, name, NOT: { id: stationId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Já existe uma praça com este nome" }, { status: 409 });
    }

    const station = await prisma.station.update({
      where: { id: stationId },
      data: { name, ...(icon && { icon }) },
    });

    return NextResponse.json(station);
  }
);

export const DELETE = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  async (req: AppRequest, { params }: { params: { stationId: string } }) => {
    const { stationId } = params;

    try {
      await prisma.station.delete({
        where: { id: stationId },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json(
        { error: "Falha ao excluir praça" },
        { status: 500 }
      );
    }
  }
);

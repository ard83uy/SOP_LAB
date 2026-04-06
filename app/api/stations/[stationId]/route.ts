import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compose, type AppRequest } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";

export const DELETE = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN"]),
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

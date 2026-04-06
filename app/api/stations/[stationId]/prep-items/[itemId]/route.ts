import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compose, type AppRequest } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";

// DELETE: Desvincula um insumo específico apenas desta praça
export const DELETE = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN"]),
  async (req: AppRequest, { params }: { params: { stationId: string; itemId: string } }) => {
    const { stationId, itemId } = await params;

    try {
      await prisma.station.update({
        where: { id: stationId },
        data: {
          prepItems: {
            disconnect: { id: itemId }
          }
        }
      });

      return NextResponse.json({ success: true, message: "Insumo removido desta praça" });
    } catch (error) {
      console.error("Erro ao desvincular insumo:", error);
      return NextResponse.json(
        { error: "Falha ao remover insumo da praça" },
        { status: 500 }
      );
    }
  }
);

import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withValidation } from "@/lib/middlewares/withValidation";
import { prisma } from "@/lib/prisma";
import { promoteRecipeSchema } from "@/lib/validations/schemas";

async function promoteHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const tenant_id = req.ctx.tenant_id!;
  const recipe_id = params.id;
  const { target_quantity, station_ids } = req.ctx.parsedBody as {
    target_quantity: number;
    station_ids?: string[];
  };

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipe_id, tenant_id },
    include: { promotedAs: true } as any,
  });

  if (!recipe) {
    return NextResponse.json({ error: "Ficha não encontrada", code: "NOT_FOUND" }, { status: 404 });
  }

  // Idempotent: if already promoted, return existing PrepItem and optionally update stations
  if ((recipe as any).promotedAs) {
    const existing = (recipe as any).promotedAs;
    if (station_ids) {
      await prisma.prepItem.update({
        where: { id: existing.id },
        data: { stations: { set: station_ids.map((id) => ({ id })) } } as any,
      });
    }
    return NextResponse.json(
      { ...existing, alreadyPromoted: true },
      { status: 200 }
    );
  }

  // Name collision: PrepItem with same name already exists for this tenant
  const conflict = await prisma.prepItem.findUnique({
    where: { tenantId_name: { tenant_id, name: recipe.name } } as any,
  });
  if (conflict) {
    return NextResponse.json(
      {
        error: `Já existe um insumo chamado "${recipe.name}". Renomeie a ficha ou o insumo antes de promover.`,
        code: "CONFLICT",
      },
      { status: 409 }
    );
  }

  const prepItem = await prisma.prepItem.create({
    data: {
      tenant_id,
      name: recipe.name,
      unit: recipe.yield_unit,
      target_quantity,
      category: recipe.category,
      recipe_id: recipe.id,
      ...(station_ids?.length
        ? { stations: { connect: station_ids.map((id) => ({ id })) } }
        : {}),
    } as any,
    include: {
      stations: { select: { id: true, name: true } },
    } as any,
  });

  req.logger.info(
    { recipe_id, prep_item_id: prepItem.id, station_count: station_ids?.length ?? 0 },
    "Recipe promoted to inventory"
  );

  return NextResponse.json(prepItem, { status: 201 });
}

export const POST = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withValidation(promoteRecipeSchema),
  promoteHandler
);

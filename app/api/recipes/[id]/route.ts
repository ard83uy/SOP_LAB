import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compose, type AppRequest } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withValidation } from "@/lib/middlewares/withValidation";
import { updateRecipeSchema } from "@/lib/validations/schemas";

// ── GET /api/recipes/[id] ────────────────────────────────────────────────────

async function getRecipeHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const tenant_id = req.ctx.tenant_id!;
  const role = req.ctx.role!;
  const profile_id = req.ctx.profile_id;

  const recipe = await prisma.recipe.findUnique({
    where: { id: params.id, tenant_id },
    include: {
      ingredients: {
        orderBy: { sort_order: "asc" },
        include: {
          prepItem: { select: { name: true, unit: true } },
          sourceRecipe: { select: { id: true, name: true, category: true } },
        },
      },
      steps: { orderBy: { step_number: "asc" } },
      comments: {
        orderBy: { created_at: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!recipe) {
    return NextResponse.json({ error: "Ficha técnica não encontrada" }, { status: 404 });
  }

  const isAdminOrManager = role === "ADMIN" || role === "MANAGER";
  if (!isAdminOrManager && profile_id && !recipe.allowed_profile_ids.includes(profile_id)) {
    return NextResponse.json({ error: "Sem permissão para acessar esta ficha" }, { status: 403 });
  }

  return NextResponse.json(recipe);
}

// ── PATCH /api/recipes/[id] ──────────────────────────────────────────────────

async function updateRecipeHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const tenant_id = req.ctx.tenant_id!;
  const { ingredients, steps, ...data } = req.ctx.parsedBody;

  const recipe = await prisma.recipe.findUnique({ where: { id: params.id, tenant_id } });
  if (!recipe) {
    return NextResponse.json({ error: "Ficha técnica não encontrada" }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx: any) => {
    // Replace ingredients if provided
    if (ingredients) {
      await tx.recipeIngredient.deleteMany({ where: { recipe_id: params.id } });
      if (ingredients.length > 0) {
        await tx.recipeIngredient.createMany({
          data: ingredients.map((ing: any, idx: number) => ({
            recipe_id: params.id,
            prep_item_id: ing.prep_item_id ?? null,
            source_recipe_id: ing.source_recipe_id ?? null,
            quantity: ing.quantity,
            unit: ing.unit,
            sort_order: ing.sort_order ?? idx,
          })),
        });
      }
    }

    // Replace steps if provided
    if (steps) {
      await tx.recipeStep.deleteMany({ where: { recipe_id: params.id } });
      if (steps.length > 0) {
        await tx.recipeStep.createMany({
          data: steps.map((s: any) => ({
            recipe_id: params.id,
            step_number: s.step_number,
            instruction: s.instruction,
          })),
        });
      }
    }

    // Update recipe fields (only those provided)
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.base_yield !== undefined) updateData.base_yield = data.base_yield;
    if (data.yield_unit !== undefined) updateData.yield_unit = data.yield_unit;
    if (data.photo_url !== undefined) updateData.photo_url = data.photo_url;
    if (data.allowed_profile_ids !== undefined) updateData.allowed_profile_ids = data.allowed_profile_ids;

    return tx.recipe.update({
      where: { id: params.id },
      data: updateData,
      include: {
        ingredients: {
          orderBy: { sort_order: "asc" },
          include: {
            prepItem: { select: { name: true, unit: true } },
            sourceRecipe: { select: { id: true, name: true, category: true } },
          },
        },
        steps: { orderBy: { step_number: "asc" } },
      },
    });
  });

  req.logger.info({ id: params.id }, "Ficha técnica atualizada");
  return NextResponse.json(updated);
}

// ── DELETE /api/recipes/[id] ─────────────────────────────────────────────────

async function deleteRecipeHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const tenant_id = req.ctx.tenant_id!;

  const recipe = await prisma.recipe.findUnique({ where: { id: params.id, tenant_id } });
  if (!recipe) {
    return NextResponse.json({ error: "Ficha técnica não encontrada" }, { status: 404 });
  }

  await prisma.recipe.delete({ where: { id: params.id } });
  req.logger.info({ id: params.id, name: recipe.name }, "Ficha técnica excluída");
  return NextResponse.json({ success: true });
}

export const GET = compose(withAuth, withTenant, getRecipeHandler);

export const PATCH = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withValidation(updateRecipeSchema),
  updateRecipeHandler,
);

export const DELETE = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  deleteRecipeHandler,
);

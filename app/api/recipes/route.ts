import { NextResponse } from "next/server";
import { AppRequest, compose } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withRole } from "@/lib/middlewares/withRole";
import { withValidation } from "@/lib/middlewares/withValidation";
import { createRecipeSchema } from "@/lib/validations/schemas";
import { prisma } from "@/lib/prisma";

// ── GET /api/recipes ─────────────────────────────────────────────────────────

async function listRecipesHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;
  const role = req.ctx.role!;
  const profile_id = req.ctx.profile_id;

  const isAdminOrManager = role === "ADMIN" || role === "MANAGER";

  const recipes = await prisma.recipe.findMany({
    where: {
      tenant_id,
      ...(!isAdminOrManager && profile_id
        ? { allowed_profile_ids: { has: profile_id } }
        : {}),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      ingredients: {
        orderBy: { sort_order: "asc" },
        include: {
          prepItem: { select: { name: true, unit: true } },
          sourceRecipe: { select: { id: true, name: true, category: true } },
        },
      },
      steps: { orderBy: { step_number: "asc" } },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json(recipes);
}

// ── POST /api/recipes ────────────────────────────────────────────────────────

async function createRecipeHandler(req: AppRequest) {
  const tenant_id = req.ctx.tenant_id!;
  const { name, description, category, base_yield, yield_unit, photo_url, allowed_profile_ids, ingredients, steps } = req.ctx.parsedBody;

  const existing = await prisma.recipe.findUnique({
    where: { tenant_id_name: { tenant_id, name } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Já existe uma ficha técnica com este nome", code: "CONFLICT" },
      { status: 409 },
    );
  }

  const recipe = await prisma.recipe.create({
    data: {
      tenant_id,
      name,
      description: description ?? null,
      category,
      base_yield,
      yield_unit,
      photo_url: photo_url ?? null,
      allowed_profile_ids: allowed_profile_ids ?? [],
      ingredients: ingredients?.length
        ? { create: ingredients.map((ing: any, idx: number) => ({
            prep_item_id: ing.prep_item_id ?? null,
            source_recipe_id: ing.source_recipe_id ?? null,
            quantity: ing.quantity,
            unit: ing.unit,
            sort_order: ing.sort_order ?? idx,
          })) }
        : undefined,
      steps: steps?.length
        ? { create: steps.map((s: any) => ({
            step_number: s.step_number,
            instruction: s.instruction,
          })) }
        : undefined,
    },
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

  req.logger.info({ id: recipe.id, name }, "Ficha técnica criada");
  return NextResponse.json(recipe, { status: 201 });
}

export const GET = compose(withAuth, withTenant, listRecipesHandler);
export const POST = compose(
  withAuth,
  withTenant,
  withRole(["ADMIN", "MANAGER"]),
  withValidation(createRecipeSchema),
  createRecipeHandler,
);

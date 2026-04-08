import { NextResponse } from "next/server";
import { compose, type AppRequest } from "@/lib/middlewares/compose";
import { withAuth } from "@/lib/middlewares/withAuth";
import { withTenant } from "@/lib/middlewares/withTenant";
import { withValidation } from "@/lib/middlewares/withValidation";
import { createRecipeCommentSchema } from "@/lib/validations/schemas";
import { prisma } from "@/lib/prisma";

async function addCommentHandler(req: AppRequest, { params }: { params: { id: string } }) {
  const tenant_id = req.ctx.tenant_id!;
  const user_id = req.ctx.user_id!;
  const { text } = req.ctx.parsedBody;

  const recipe = await prisma.recipe.findUnique({ where: { id: params.id, tenant_id } });
  if (!recipe) {
    return NextResponse.json({ error: "Ficha técnica não encontrada" }, { status: 404 });
  }

  const comment = await prisma.recipeComment.create({
    data: { recipe_id: params.id, user_id, text },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}

export const POST = compose(
  withAuth,
  withTenant,
  withValidation(createRecipeCommentSchema),
  addCommentHandler,
);

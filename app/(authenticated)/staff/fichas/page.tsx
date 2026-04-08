"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { RecipeListTab } from "@/components/recipes/RecipeListTab";

export default function StaffFichasPage() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-32">
      <PageHeader title="Catálogo de Fichas Técnicas" />
      <RecipeListTab />
    </div>
  );
}

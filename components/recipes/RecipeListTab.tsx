"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ChefHat, MessageSquare } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/EmptyState";
import { RecipeViewDialog } from "./RecipeViewDialog";

const CATEGORY_LABELS: Record<string, string> = {
  PRIMARY: "Primário",
  MANIPULATED: "Manipulado",
  INTERMEDIATE: "Intermediário",
  FINAL: "Final",
};

const CATEGORY_COLORS: Record<string, string> = {
  PRIMARY: "bg-emerald-100 text-emerald-800",
  MANIPULATED: "bg-blue-100 text-blue-800",
  INTERMEDIATE: "bg-amber-100 text-amber-800",
  FINAL: "bg-purple-100 text-purple-800",
};

export function RecipeListTab() {
  const [search, setSearch] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);

  const { data: recipes, isLoading, error } = useQuery({
    queryKey: ["recipes-staff"],
    queryFn: async () => {
      const res = await fetch("/api/recipes");
      if (!res.ok) throw new Error("Falha ao carregar fichas técnicas");
      return res.json();
    },
  });

  const filtered = (recipes ?? []).filter((r: any) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500 font-medium">{(error as Error).message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="relative group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Buscar ficha técnica..."
          className="pl-11 h-12 text-lg rounded-xl border-2 border-transparent bg-muted/50 focus-visible:bg-background focus-visible:border-primary transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState 
          icon={ChefHat} 
          title="Nenhuma ficha encontrada" 
          description={search ? "Tente buscar por outro nome." : "Você ainda não possui fichas técnicas atribuídas ao seu perfil."} 
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((recipe: any) => (
            <Card 
              key={recipe.id} 
              className="group cursor-pointer hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 active:scale-[0.98] rounded-2xl overflow-hidden"
              onClick={() => setSelectedRecipe(recipe)}
            >
              <CardContent className="p-5 flex flex-col h-full gap-3">
                <div className="flex justify-between items-start">
                  <Badge variant="secondary" className={`${CATEGORY_COLORS[recipe.category] || ""} text-[10px] font-bold tracking-wider uppercase px-2 py-0.5`}>
                    {CATEGORY_LABELS[recipe.category] || recipe.category}
                  </Badge>
                  {recipe._count?.comments > 0 && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">{recipe._count.comments}</span>
                    </div>
                  )}
                </div>
                
                <h3 className="text-xl font-black text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2">
                  {recipe.name}
                </h3>
                
                {recipe.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-auto">
                    {recipe.description}
                  </p>
                )}
                
                <div className="pt-2 flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest mt-auto">
                  <span>Rendimento:</span>
                  <span className="text-foreground">{recipe.base_yield} {recipe.yield_unit}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RecipeViewDialog 
        recipe={selectedRecipe} 
        open={!!selectedRecipe} 
        onClose={() => setSelectedRecipe(null)} 
      />
    </div>
  );
}

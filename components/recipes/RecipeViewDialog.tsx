"use client";

import { useState } from "react";
import { 
  ChefHat, 
  ListOrdered, 
  PackagePlus, 
  Minus, 
  Plus, 
  X,
  Target
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DecimalInput } from "@/components/decimal-input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Ingredient {
  id: string;
  prep_item_id: string | null;
  source_recipe_id: string | null;
  quantity: number;
  unit: string;
  prepItem?: { name: string; unit: string } | null;
  sourceRecipe?: { id: string; name: string; category: string } | null;
}

interface Step {
  id: string;
  step_number: number;
  instruction: string;
}

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  category: string;
  base_yield: number;
  yield_unit: string;
  photo_url: string | null;
  ingredients: Ingredient[];
  steps: Step[];
}

interface RecipeViewDialogProps {
  recipe: Recipe | null;
  open: boolean;
  onClose: () => void;
}

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

export function RecipeViewDialog({ recipe, open, onClose }: RecipeViewDialogProps) {
  const [customYield, setCustomYield] = useState<string>("");

  // Sync customYield when recipe changes or dialog opens
  const [lastRecipeId, setLastRecipeId] = useState<string | null>(null);

  if (recipe && recipe.id !== lastRecipeId) {
    setCustomYield(String(recipe.base_yield));
    setLastRecipeId(recipe.id);
  }

  if (!recipe) return null;

  const currentYieldNum = parseFloat(customYield) || recipe.base_yield;
  const scale = currentYieldNum / recipe.base_yield;

  const scaledQty = (qty: number) => {
    const val = qty * scale;
    return parseFloat(val.toFixed(3));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <div className="sticky top-0 bg-background z-10 p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-2.5 rounded-xl">
              <ChefHat className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">{recipe.name}</DialogTitle>
              <Badge variant="secondary" className={`${CATEGORY_COLORS[recipe.category]} mt-1`}>
                {CATEGORY_LABELS[recipe.category] || recipe.category}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-8">
          {recipe.description && (
            <p className="text-muted-foreground text-lg leading-relaxed">{recipe.description}</p>
          )}

          {recipe.photo_url && (
            <div className="rounded-2xl overflow-hidden border aspect-video bg-muted relative">
              <img
                src={recipe.photo_url}
                alt={recipe.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Scale Control */}
          <Card className="bg-primary/5 border-primary/10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <Target className="w-4 h-4" />
                    <span>Ajustar Rendimento</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Combine as quantidades para o volume desejado
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline" size="icon" className="h-12 w-12 bg-background border-primary/20 hover:border-primary transition-colors"
                    onClick={() => {
                      const v = Math.max(0.1, (parseFloat(customYield) || recipe.base_yield) - 1);
                      setCustomYield(String(parseFloat(v.toFixed(1))));
                    }}
                  >
                    <Minus className="w-5 h-5" />
                  </Button>
                  <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-xl border-2 border-primary/10 min-w-[120px] justify-center">
                    <DecimalInput
                      className="h-8 text-2xl font-extrabold text-center w-20 border-0 bg-transparent p-0 focus-visible:ring-0"
                      value={customYield}
                      onChange={(e) => setCustomYield(e.target.value)}
                    />
                    <span className="text-lg text-muted-foreground font-bold">{recipe.yield_unit}</span>
                  </div>
                  <Button
                    variant="outline" size="icon" className="h-12 w-12 bg-background border-primary/20 hover:border-primary transition-colors"
                    onClick={() => {
                      const v = (parseFloat(customYield) || recipe.base_yield) + 1;
                      setCustomYield(String(parseFloat(v.toFixed(1))));
                    }}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ingredients */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-primary" /> 
              Ingredientes
            </h2>
            <div className="rounded-2xl border overflow-hidden bg-card">
              <div className="grid grid-cols-[1fr_auto] gap-x-4 px-6 py-3 bg-muted/50 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                <span>Item</span>
                <span className="text-right">Quantidade</span>
              </div>
              <div className="divide-y">
                {recipe.ingredients.map((ing, idx) => {
                  const displayName = ing.prepItem?.name ?? ing.sourceRecipe?.name ?? "—";
                  return (
                    <div key={idx} className="grid grid-cols-[1fr_auto] gap-x-4 px-6 py-4 items-center">
                      <div className="min-w-0">
                        <span className="font-bold text-lg block truncate">{displayName}</span>
                        {ing.sourceRecipe && (
                          <Badge variant="outline" className={`${CATEGORY_COLORS[ing.sourceRecipe.category]} text-[10px] h-5 mt-1`}>
                            {CATEGORY_LABELS[ing.sourceRecipe.category]}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-xl tabular-nums">
                          {scaledQty(ing.quantity)}
                        </span>
                        <span className="text-muted-foreground font-bold ml-1.5 uppercase text-sm">
                          {ing.unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Preparation Steps */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-primary" /> 
              Modo de Preparo
            </h2>
            <div className="space-y-4">
              {recipe.steps.length === 0 ? (
                <p className="text-muted-foreground italic">Nenhum passo cadastrado.</p>
              ) : (
                recipe.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4 items-start group">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-black text-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
                      {idx + 1}
                    </div>
                    <div className="flex-1 pt-1.5 border-b pb-4 group-last:border-0">
                      <p className="text-lg leading-relaxed font-medium whitespace-pre-wrap">
                        {step.instruction}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

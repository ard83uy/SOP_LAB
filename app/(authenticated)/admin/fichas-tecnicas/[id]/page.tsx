"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, GripVertical, Save,
  ChefHat, MessageSquare, ImageIcon, ListOrdered,
  Minus, PackagePlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DecimalInput } from "@/components/decimal-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Types ────────────────────────────────────────────────────────────────────

type Ingredient = {
  id?: string;
  prep_item_id: string | null;
  source_recipe_id: string | null;
  quantity: number;
  unit: string;
  sort_order: number;
  prepItem?: { name: string; unit: string } | null;
  sourceRecipe?: { id: string; name: string; category: string } | null;
};

type Step = {
  id?: string;
  step_number: number;
  instruction: string;
};

type Comment = {
  id: string;
  text: string;
  created_at: string;
  user: { name: string };
};

type Recipe = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  base_yield: number;
  yield_unit: string;
  photo_url: string | null;
  allowed_roles: string[];
  ingredients: Ingredient[];
  steps: Step[];
  comments: Comment[];
};

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

const UNITS = ["kg", "g", "L", "ml", "un", "porções", "colher(es)", "xícara(s)", "pitada(s)"];

const ALL_ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Gerente" },
  { value: "STATION_LEADER", label: "Líder de Praça" },
  { value: "PREP_KITCHEN", label: "Cozinha" },
  { value: "STAFF", label: "Funcionário" },
];

// ── Ingredient source picker ─────────────────────────────────────────────────

type IngredientSource = { type: "prep_item"; id: string; name: string; unit: string }
  | { type: "recipe"; id: string; name: string; category: string };

function IngredientPickerDialog({
  open,
  onClose,
  onSelect,
  currentRecipeId,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (source: IngredientSource) => void;
  currentRecipeId: string;
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"insumos" | "receitas">("insumos");

  const { data: prepItems } = useQuery({
    queryKey: ["all-prep-items"],
    queryFn: async () => {
      const res = await fetch("/api/prep-items");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const { data: recipes } = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const res = await fetch("/api/recipes");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const term = search.toLowerCase();
  const filteredItems = (prepItems ?? []).filter((i: any) =>
    i.name.toLowerCase().includes(term)
  );
  const filteredRecipes = (recipes ?? [])
    .filter((r: any) => r.id !== currentRecipeId && r.name.toLowerCase().includes(term));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar Ingrediente</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Buscar..."
          className="h-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex border-b border-border mb-2">
          {(["insumos", "receitas"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              {t === "insumos" ? "Insumos" : "Receitas"}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {tab === "insumos" && (
            filteredItems.length === 0
              ? <p className="text-sm text-muted-foreground text-center py-4">Nenhum insumo encontrado</p>
              : filteredItems.map((item: any) => (
                <button
                  key={item.id}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-between"
                  onClick={() => {
                    onSelect({ type: "prep_item", id: item.id, name: item.name, unit: item.unit });
                    onClose();
                    setSearch("");
                  }}
                >
                  <span className="font-medium">{item.name}</span>
                  <Badge variant="outline" className="text-xs">{item.unit}</Badge>
                </button>
              ))
          )}
          {tab === "receitas" && (
            filteredRecipes.length === 0
              ? <p className="text-sm text-muted-foreground text-center py-4">Nenhuma receita encontrada</p>
              : filteredRecipes.map((recipe: any) => (
                <button
                  key={recipe.id}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-between"
                  onClick={() => {
                    onSelect({ type: "recipe", id: recipe.id, name: recipe.name, category: recipe.category });
                    onClose();
                    setSearch("");
                  }}
                >
                  <span className="font-medium">{recipe.name}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[recipe.category] ?? ""}`}>
                    {CATEGORY_LABELS[recipe.category] ?? recipe.category}
                  </span>
                </button>
              ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  // State
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [customYield, setCustomYield] = useState<string>("");
  const [dirty, setDirty] = useState(false);

  const { data: recipe, isLoading } = useQuery<Recipe>({
    queryKey: ["recipe", id],
    queryFn: async () => {
      const res = await fetch(`/api/recipes/${id}`);
      if (!res.ok) throw new Error("Ficha não encontrada");
      return res.json();
    },
  });

  // Sync state from fetched data
  const [initialized, setInitialized] = useState(false);
  if (recipe && !initialized) {
    setIngredients(recipe.ingredients);
    setSteps(recipe.steps);
    setPhotoUrl(recipe.photo_url ?? "");
    setAllowedRoles(recipe.allowed_roles);
    setCustomYield(String(recipe.base_yield));
    setInitialized(true);
  }

  // Scaling
  const scale = recipe ? (parseFloat(customYield) || recipe.base_yield) / recipe.base_yield : 1;
  const scaledQty = (qty: number) => {
    const val = qty * scale;
    return parseFloat(val.toFixed(3));
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/recipes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo_url: photoUrl.trim() || null,
          allowed_roles: allowedRoles,
          ingredients: ingredients.map((ing, idx) => ({
            prep_item_id: ing.prep_item_id || undefined,
            source_recipe_id: ing.source_recipe_id || undefined,
            quantity: ing.quantity,
            unit: ing.unit,
            sort_order: idx,
          })),
          steps: steps.map((s, idx) => ({
            step_number: idx + 1,
            instruction: s.instruction,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao salvar");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Ficha técnica salva!");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["recipe", id] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/recipes/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      if (!res.ok) throw new Error("Erro ao comentar");
      return res.json();
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["recipe", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Ingredient helpers
  const addIngredient = (source: IngredientSource) => {
    const newIng: Ingredient = {
      prep_item_id: source.type === "prep_item" ? source.id : null,
      source_recipe_id: source.type === "recipe" ? source.id : null,
      quantity: 0,
      unit: source.type === "prep_item" ? source.unit : recipe?.yield_unit ?? "un",
      sort_order: ingredients.length,
      prepItem: source.type === "prep_item" ? { name: source.name, unit: source.unit } : null,
      sourceRecipe: source.type === "recipe" ? { id: source.id, name: source.name, category: source.category } : null,
    };
    setIngredients([...ingredients, newIng]);
    setDirty(true);
  };

  const updateIngredient = (idx: number, field: string, value: any) => {
    setIngredients((ings) => ings.map((ing, i) => i === idx ? { ...ing, [field]: value } : ing));
    setDirty(true);
  };

  const removeIngredient = (idx: number) => {
    setIngredients((ings) => ings.filter((_, i) => i !== idx));
    setDirty(true);
  };

  // Step helpers
  const addStep = () => {
    setSteps([...steps, { step_number: steps.length + 1, instruction: "" }]);
    setDirty(true);
  };

  const updateStep = (idx: number, instruction: string) => {
    setSteps((s) => s.map((st, i) => i === idx ? { ...st, instruction } : st));
    setDirty(true);
  };

  const removeStep = (idx: number) => {
    setSteps((s) => s.filter((_, i) => i !== idx).map((st, i) => ({ ...st, step_number: i + 1 })));
    setDirty(true);
  };

  const toggleRole = (role: string) => {
    setAllowedRoles((r) =>
      r.includes(role) ? r.filter((v) => v !== role) : [...r, role]
    );
    setDirty(true);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 pb-32">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto text-center py-20">
        <p className="text-muted-foreground">Ficha técnica não encontrada.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/admin/fichas-tecnicas")}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-32 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/fichas-tecnicas")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{recipe.name}</h1>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[recipe.category] ?? ""}`}>
              {CATEGORY_LABELS[recipe.category]}
            </span>
          </div>
          {recipe.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{recipe.description}</p>
          )}
        </div>
      </div>

      {/* Yield scaler */}
      <Card>
        <CardContent className="p-4">
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Rendimento</label>
          <div className="flex items-center gap-3 mt-2">
            <Button
              variant="outline" size="icon" className="h-10 w-10"
              onClick={() => {
                const v = Math.max(1, (parseFloat(customYield) || recipe.base_yield) - 1);
                setCustomYield(String(v));
              }}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <DecimalInput
                className="h-12 text-2xl font-bold text-center w-24"
                value={customYield}
                onChange={(e) => setCustomYield(e.target.value)}
              />
              <span className="text-lg text-muted-foreground font-medium">{recipe.yield_unit}</span>
            </div>
            <Button
              variant="outline" size="icon" className="h-10 w-10"
              onClick={() => {
                const v = (parseFloat(customYield) || recipe.base_yield) + 1;
                setCustomYield(String(v));
              }}
            >
              <Plus className="w-4 h-4" />
            </Button>
            {scale !== 1 && (
              <Badge variant="secondary" className="ml-2 text-sm">
                {scale.toFixed(2)}x
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Ingredients ─────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-primary" /> Ingredientes
          </h2>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setPickerOpen(true)}>
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        </div>

        {ingredients.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Nenhum ingrediente adicionado.</p>
              <Button variant="outline" className="mt-3" onClick={() => setPickerOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar ingrediente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Ingrediente</span>
              <span className="text-right">Qtd. base</span>
              <span className="text-right">{scale !== 1 ? "Ajustado" : "Und."}</span>
              <span></span>
            </div>
            {ingredients.map((ing, idx) => {
              const displayName = ing.prepItem?.name ?? ing.sourceRecipe?.name ?? "—";
              return (
                <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-3 border-t items-center">
                  <div className="flex items-center gap-2 min-w-0">
                    <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="font-medium text-sm truncate block">{displayName}</span>
                      {ing.sourceRecipe && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[ing.sourceRecipe.category] ?? ""}`}>
                          {CATEGORY_LABELS[ing.sourceRecipe.category]}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <DecimalInput
                      className="h-9 w-20 text-center text-sm font-semibold"
                      value={String(ing.quantity)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) updateIngredient(idx, "quantity", val);
                        else if (e.target.value === "") updateIngredient(idx, "quantity", 0);
                      }}
                    />
                    <Select
                      value={ing.unit}
                      onValueChange={(v) => updateIngredient(idx, "unit", v)}
                    >
                      <SelectTrigger className="h-9 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-right font-bold text-sm tabular-nums whitespace-nowrap">
                    {scale !== 1 ? `${scaledQty(ing.quantity)} ${ing.unit}` : ing.unit}
                  </span>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeIngredient(idx)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Steps ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-primary" /> Modo de Preparo
          </h2>
          <Button variant="outline" size="sm" className="gap-1" onClick={addStep}>
            <Plus className="w-4 h-4" /> Passo
          </Button>
        </div>

        {steps.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Nenhum passo adicionado.</p>
              <Button variant="outline" className="mt-3" onClick={addStep}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar passo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <Card key={idx}>
                <CardContent className="p-4 flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center flex-shrink-0 mt-1">
                    {idx + 1}
                  </div>
                  <Textarea
                    className="flex-1 resize-none min-h-[60px] text-base"
                    placeholder={`Descreva o passo ${idx + 1}...`}
                    value={step.instruction}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateStep(idx, e.target.value)}
                  />
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0 mt-1"
                    onClick={() => removeStep(idx)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Photo ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" /> Foto do Produto
        </h2>
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="URL da imagem (ex: https://...)"
              className="h-10"
              value={photoUrl}
              onChange={(e) => { setPhotoUrl(e.target.value); setDirty(true); }}
            />
            {photoUrl && (
              <div className="rounded-lg overflow-hidden border bg-muted aspect-video flex items-center justify-center">
                <img
                  src={photoUrl}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Access control ──────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Permissões de Acesso</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_ROLES.map((role) => (
            <button
              key={role.value}
              type="button"
              onClick={() => toggleRole(role.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                allowedRoles.includes(role.value)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {role.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Comments ────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" /> Comentários
        </h2>

        <Card>
          <CardContent className="p-4 space-y-3">
            <Textarea
              className="resize-none min-h-[60px] text-base"
              placeholder="Adicione um comentário..."
              value={commentText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCommentText(e.target.value)}
            />
            <Button
              size="sm"
              disabled={!commentText.trim() || commentMutation.isPending}
              onClick={() => commentMutation.mutate()}
            >
              {commentMutation.isPending ? "Enviando..." : "Comentar"}
            </Button>
          </CardContent>
        </Card>

        {recipe.comments.length > 0 && (
          <div className="space-y-2">
            {recipe.comments.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{comment.user.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{comment.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Save FAB ────────────────────────────────────────────────────────── */}
      {dirty && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent z-10 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="max-w-3xl mx-auto">
            <Button
              size="lg"
              className="w-full h-14 text-lg font-bold rounded-xl shadow-xl gap-2"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              <Save className="w-5 h-5" />
              {saveMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      )}

      {/* Ingredient picker dialog */}
      <IngredientPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addIngredient}
        currentRecipeId={id}
      />
    </div>
  );
}

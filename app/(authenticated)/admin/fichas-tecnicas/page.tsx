"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, Plus, Egg, Utensils, Layers, ChefHat, Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/EmptyState";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DecimalInput } from "@/components/decimal-input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Types & constants ────────────────────────────────────────────────────────

type RecipeCategory = "PRIMARY" | "MANIPULATED" | "INTERMEDIATE" | "FINAL";

type Recipe = {
  id: string;
  name: string;
  description: string | null;
  category: RecipeCategory;
  base_yield: number;
  yield_unit: string;
  photo_url: string | null;
  allowed_roles: string[];
  ingredients: any[];
  steps: any[];
  _count: { comments: number };
};

const CATEGORIES: { id: RecipeCategory | "ALL"; label: string; icon: any }[] = [
  { id: "ALL", label: "Todos", icon: BookOpen },
  { id: "PRIMARY", label: "Primários", icon: Egg },
  { id: "MANIPULATED", label: "Manipulados", icon: Utensils },
  { id: "INTERMEDIATE", label: "Intermediários", icon: Layers },
  { id: "FINAL", label: "Finais", icon: ChefHat },
];

const CATEGORY_LABELS: Record<RecipeCategory, string> = {
  PRIMARY: "Primário",
  MANIPULATED: "Manipulado",
  INTERMEDIATE: "Intermediário",
  FINAL: "Final",
};

const CATEGORY_COLORS: Record<RecipeCategory, string> = {
  PRIMARY: "bg-emerald-100 text-emerald-800",
  MANIPULATED: "bg-blue-100 text-blue-800",
  INTERMEDIATE: "bg-amber-100 text-amber-800",
  FINAL: "bg-purple-100 text-purple-800",
};

const UNITS = [
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "L", label: "L" },
  { value: "ml", label: "ml" },
  { value: "un", label: "un" },
  { value: "porções", label: "porções" },
];

const ALL_ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Gerente" },
  { value: "STATION_LEADER", label: "Líder de Praça" },
  { value: "PREP_KITCHEN", label: "Cozinha de Produção" },
  { value: "STAFF", label: "Funcionário" },
];

// ── Create Dialog ────────────────────────────────────────────────────────────

function CreateRecipeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "PRIMARY" as RecipeCategory,
    base_yield: "",
    yield_unit: "porções",
    allowed_roles: ["ADMIN", "MANAGER"] as string[],
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: "", description: "", category: "PRIMARY",
        base_yield: "", yield_unit: "porções",
        allowed_roles: ["ADMIN", "MANAGER"],
      });
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const yieldNum = parseFloat(form.base_yield);
      if (!form.name.trim() || !yieldNum || yieldNum <= 0) {
        throw new Error("Preencha nome e rendimento.");
      }
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          category: form.category,
          base_yield: yieldNum,
          yield_unit: form.yield_unit,
          allowed_roles: form.allowed_roles,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao criar");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Ficha técnica criada!");
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      onClose();
      router.push(`/admin/fichas-tecnicas/${data.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleRole = (role: string) => {
    setForm((f) => ({
      ...f,
      allowed_roles: f.allowed_roles.includes(role)
        ? f.allowed_roles.filter((r) => r !== role)
        : [...f.allowed_roles, role],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Ficha Técnica</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome</label>
            <Input
              className="h-12 text-lg"
              placeholder="Ex: Massa de Pizza"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrição (opcional)</label>
            <Textarea
              className="resize-none min-h-[60px] text-base"
              placeholder="Breve descrição da receita..."
              value={form.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Categoria</label>
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as RecipeCategory }))}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIMARY">Produto Primário</SelectItem>
                <SelectItem value="MANIPULATED">Produto Manipulado</SelectItem>
                <SelectItem value="INTERMEDIATE">Produto Intermediário</SelectItem>
                <SelectItem value="FINAL">Produto Final</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rendimento base</label>
              <DecimalInput
                className="h-12 text-lg"
                placeholder="Ex: 10"
                value={form.base_yield}
                onChange={(e) => setForm((f) => ({ ...f, base_yield: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unidade</label>
              <Select value={form.yield_unit} onValueChange={(v) => setForm((f) => ({ ...f, yield_unit: v }))}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Quem pode visualizar</label>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => toggleRole(role.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    form.allowed_roles.includes(role.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name.trim() || !form.base_yield || form.allowed_roles.length === 0}
          >
            {mutation.isPending ? "Criando..." : "Criar e Editar Receita"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function FichasTecnicasPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<RecipeCategory | "ALL">("ALL");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: recipes, isLoading, error } = useQuery<Recipe[]>({
    queryKey: ["recipes"],
    queryFn: async () => {
      const res = await fetch("/api/recipes");
      if (!res.ok) throw new Error("Falha ao carregar fichas técnicas");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir");
    },
    onSuccess: () => {
      toast.success("Ficha excluída!");
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = filter === "ALL"
    ? recipes
    : recipes?.filter((r) => r.category === filter);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Fichas Técnicas</h1>
        <Button onClick={() => setCreateOpen(true)} className="h-10 gap-2">
          <Plus className="w-4 h-4" /> Nova Ficha
        </Button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px -mb-px">
        {CATEGORIES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap -mb-px ${
              filter === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Recipe list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : error ? (
        <div className="p-4 text-red-500 bg-red-50 rounded-md text-sm">{(error as Error).message}</div>
      ) : !filtered?.length ? (
        <EmptyState
          icon={BookOpen}
          title={filter === "ALL" ? "Nenhuma ficha técnica" : `Nenhum produto ${CATEGORY_LABELS[filter as RecipeCategory]?.toLowerCase()}`}
          description="Crie fichas técnicas para padronizar suas receitas."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((recipe) => (
            <Card
              key={recipe.id}
              className="overflow-hidden cursor-pointer hover:border-primary/40 transition-colors active:scale-[0.99]"
              onClick={() => router.push(`/admin/fichas-tecnicas/${recipe.id}`)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                {recipe.photo_url ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img src={recipe.photo_url} alt={recipe.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-lg truncate">{recipe.name}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[recipe.category]}`}>
                      {CATEGORY_LABELS[recipe.category]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {recipe.base_yield} {recipe.yield_unit}
                    {recipe.ingredients.length > 0 && ` · ${recipe.ingredients.length} ingredientes`}
                    {recipe.steps.length > 0 && ` · ${recipe.steps.length} passos`}
                    {recipe._count.comments > 0 && ` · ${recipe._count.comments} comentários`}
                  </p>
                  {recipe.description && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{recipe.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost" size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Excluir "${recipe.name}"?`)) {
                      deleteMutation.mutate(recipe.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateRecipeDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

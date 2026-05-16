"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, Plus, Egg, Utensils, Layers, ChefHat, Trash2,
  CheckSquare, Square, FileDown, X, Check, Package, PackageCheck,
  GlassWater, UtensilsCrossed,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { usePdfExport } from "@/components/recipes/pdf/usePdfExport";

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
import { PageHeader } from "@/components/layout/PageHeader";

// ── Types & constants ────────────────────────────────────────────────────────

type RecipeCategory = "PRIMARY" | "MANIPULATED" | "INTERMEDIATE" | "FINAL";
type RecipeLayout = "FOOD" | "DRINK";

type GlassRef = { id: string; name: string; photo_url: string | null };

type Recipe = {
  id: string;
  name: string;
  description: string | null;
  category: RecipeCategory;
  layout: RecipeLayout;
  base_yield: number;
  yield_unit: string;
  photo_url: string | null;
  allowed_profile_ids: string[];
  glassType: GlassRef | null;
  ingredients: any[];
  steps: any[];
  promotedAs: { id: string; target_quantity: number; stations: { id: string; name: string }[] } | null;
  _count: { comments: number };
};

type Station = { id: string; name: string };
type GlassType = { id: string; name: string; photo_url: string | null };

const LAYOUT_TABS: { id: RecipeLayout | "ALL"; label: string; icon: any }[] = [
  { id: "ALL", label: "Tudo", icon: BookOpen },
  { id: "FOOD", label: "Comidas", icon: UtensilsCrossed },
  { id: "DRINK", label: "Bebidas", icon: GlassWater },
];

const LAYOUT_INFO: Record<RecipeLayout, { label: string; icon: any; description: string }> = {
  FOOD: {
    label: "Comida",
    icon: UtensilsCrossed,
    description: "Layout padrão: ingredientes, passos, ferramentas e dica do chef.",
  },
  DRINK: {
    label: "Bebida / Drink",
    icon: GlassWater,
    description: "Layout para bebidas: tudo do layout Comida + seleção de tipo de copo.",
  },
};

type UserProfile = {
  id: string;
  name: string;
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

// ── Promote-to-inventory Dialog ──────────────────────────────────────────────

function PromoteDialog({
  recipe, open, onClose,
}: {
  recipe: Recipe | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [targetQty, setTargetQty] = useState("");
  const [selectedStations, setSelectedStations] = useState<Set<string>>(new Set());

  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ["stations"],
    queryFn: async () => {
      const res = await fetch("/api/stations");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  useEffect(() => {
    if (open && recipe) {
      setTargetQty(String(recipe.base_yield));
      setSelectedStations(new Set());
    }
  }, [open, recipe]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!recipe) throw new Error("Ficha não selecionada");
      const qty = parseFloat(targetQty);
      if (!qty || qty <= 0) throw new Error("Informe uma média padrão válida.");
      const res = await fetch(`/api/recipes/${recipe.id}/promote-to-inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_quantity: qty,
          station_ids: Array.from(selectedStations),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao promover");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Ficha adicionada ao estoque! Agora pode ser contada nas praças selecionadas.");
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["all-prep-items"] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleStation = (id: string) => {
    setSelectedStations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!recipe) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Adicionar &ldquo;{recipe.name}&rdquo; ao Estoque
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Isso cria um insumo contável a partir desta ficha técnica. Ele aparecerá em <strong>Insumos</strong> e poderá ser contado nas praças selecionadas durante a troca de turno.
          </p>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Média padrão ({recipe.yield_unit})</label>
            <DecimalInput
              className="h-12 text-lg"
              placeholder="0"
              value={targetQty}
              onChange={(e) => setTargetQty(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Praças onde será contado</label>
            {stations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma praça cadastrada. Crie em Config → Praças.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {stations.map((s) => {
                  const active = selectedStations.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleStation(s.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Opcional — pode adicionar depois em Insumos.</p>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !targetQty}
          >
            {mutation.isPending ? "Adicionando..." : "Adicionar ao Estoque"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Dialog ────────────────────────────────────────────────────────────

function CreateRecipeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [step, setStep] = useState<"layout" | "form">("layout");
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "PRIMARY" as RecipeCategory,
    layout: "FOOD" as RecipeLayout,
    base_yield: "",
    yield_unit: "porções",
    glass_type_id: null as string | null,
    allowed_profile_ids: [] as string[],
  });

  const { data: profiles = [] } = useQuery<UserProfile[]>({
    queryKey: ["user-profiles"],
    queryFn: async () => {
      const res = await fetch("/api/user-profiles");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const { data: glasses = [] } = useQuery<GlassType[]>({
    queryKey: ["glass-types"],
    queryFn: async () => {
      const res = await fetch("/api/glass-types");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open && form.layout === "DRINK",
  });

  useEffect(() => {
    if (open) {
      setStep("layout");
      setForm({
        name: "", description: "",
        category: "PRIMARY", layout: "FOOD",
        base_yield: "", yield_unit: "porções",
        glass_type_id: null,
        allowed_profile_ids: [],
      });
    }
  }, [open]);

  const pickLayout = (layout: RecipeLayout) => {
    setForm((f) => ({
      ...f,
      layout,
      yield_unit: layout === "DRINK" ? "ml" : "porções",
      glass_type_id: layout === "DRINK" ? f.glass_type_id : null,
    }));
    setStep("form");
  };

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
          layout: form.layout,
          base_yield: yieldNum,
          yield_unit: form.yield_unit,
          glass_type_id: form.layout === "DRINK" ? form.glass_type_id : null,
          allowed_profile_ids: form.allowed_profile_ids,
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

  const toggleProfile = (profileId: string) => {
    setForm((f) => ({
      ...f,
      allowed_profile_ids: f.allowed_profile_ids.includes(profileId)
        ? f.allowed_profile_ids.filter((id) => id !== profileId)
        : [...f.allowed_profile_ids, profileId],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "layout" ? "Escolha o tipo de ficha técnica" : `Nova ficha — ${LAYOUT_INFO[form.layout].label}`}
          </DialogTitle>
        </DialogHeader>

        {step === "layout" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              O layout define quais campos aparecem na ficha. Você pode trocar depois.
            </p>
            <div className="grid gap-3">
              {(Object.keys(LAYOUT_INFO) as RecipeLayout[]).map((key) => {
                const Info = LAYOUT_INFO[key];
                const Icon = Info.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pickLayout(key)}
                    className="flex items-start gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base">{Info.label}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{Info.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Mais layouts (customizados pelo gerente) virão em versões futuras.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome</label>
                <Input
                  className="h-12 text-lg"
                  placeholder={form.layout === "DRINK" ? "Ex: Caipirinha, Negroni" : "Ex: Massa de Pizza"}
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
                  <Select value={form.yield_unit} onValueChange={(v) => v && setForm((f) => ({ ...f, yield_unit: v }))}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.layout === "DRINK" && (
                <div className="space-y-2 p-3 rounded-xl border border-primary/20 bg-primary/5">
                  <label className="text-sm font-bold flex items-center gap-2">
                    <GlassWater className="w-4 h-4 text-primary" />
                    Tipo de copo
                  </label>
                  {glasses.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhum tipo de copo cadastrado. Cadastre em <strong>Config → Tipos de Copo</strong> e selecione aqui depois.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {glasses.map((g) => {
                        const active = form.glass_type_id === g.id;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, glass_type_id: active ? null : g.id }))}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                              active
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            {g.photo_url ? (
                              <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted">
                                <img src={g.photo_url} alt={g.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-muted/50 flex items-center justify-center">
                                <GlassWater className="w-5 h-5 text-muted-foreground/50" />
                              </div>
                            )}
                            <span className={`text-[11px] font-semibold text-center leading-tight line-clamp-2 ${active ? "text-primary" : "text-foreground"}`}>
                              {g.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Quem pode visualizar</label>
                {profiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum perfil cadastrado ainda.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profiles.map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => toggleProfile(profile.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          form.allowed_profile_ids.includes(profile.id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {profile.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("layout")}>← Trocar layout</Button>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !form.name.trim() || !form.base_yield}
              >
                {mutation.isPending ? "Criando..." : "Criar e Editar"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function FichasTecnicasPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<RecipeCategory | "ALL">("ALL");
  const [layoutFilter, setLayoutFilter] = useState<RecipeLayout | "ALL">("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState<Recipe | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { exportPdf, isExporting } = usePdfExport();

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const selectAll = () => {
    if (!filtered) return;
    setSelectedIds(new Set(filtered.map((r) => r.id)));
  };

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

  const filtered = (recipes ?? []).filter((r) => {
    if (layoutFilter !== "ALL" && r.layout !== layoutFilter) return false;
    if (filter !== "ALL" && r.category !== filter) return false;
    return true;
  });

  const layoutCounts: Record<RecipeLayout | "ALL", number> = {
    ALL: recipes?.length ?? 0,
    FOOD: recipes?.filter((r) => r.layout === "FOOD").length ?? 0,
    DRINK: recipes?.filter((r) => r.layout === "DRINK").length ?? 0,
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 pb-32">
      <PageHeader title={selectionMode ? `${selectedIds.size} selecionada${selectedIds.size !== 1 ? "s" : ""}` : "Fichas Técnicas"}>
        {selectionMode ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={selectAll}>
              <CheckSquare className="w-4 h-4" /> Todas
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exitSelectionMode}>
              <X className="w-4 h-4" /> Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 gap-2"
              onClick={() => setSelectionMode(true)}
              disabled={!recipes?.length}
            >
              <Square className="w-4 h-4" /> Exportar
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="h-10 gap-2">
              <Plus className="w-4 h-4" /> Nova Ficha
            </Button>
          </div>
        )}
      </PageHeader>

      {/* Layout filter (chips) */}
      <div className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-1">
        {LAYOUT_TABS.map(({ id, label, icon: Icon }) => {
          const active = layoutFilter === id;
          const count = layoutCounts[id];
          return (
            <button
              key={id}
              onClick={() => setLayoutFilter(id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-accent/60 text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-primary-foreground/20" : "bg-foreground/10"}`}>
                {count}
              </span>
            </button>
          );
        })}
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
          {filtered.map((recipe) => {
            const isSelected = selectedIds.has(recipe.id);
            return (
              <Card
                key={recipe.id}
                className={`overflow-hidden cursor-pointer transition-all active:scale-[0.99] ${
                  selectionMode && isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : "hover:border-primary/40"
                }`}
                onClick={() => {
                  if (selectionMode) {
                    toggleSelection(recipe.id);
                  } else {
                    router.push(`/admin/fichas-tecnicas/${recipe.id}`);
                  }
                }}
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
                      {recipe.layout === "DRINK" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300">
                          <GlassWater className="w-3 h-3" />
                          Bebida
                        </span>
                      )}
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

                  {selectionMode ? (
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? "border-primary bg-primary" : "border-border"
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {recipe.promotedAs ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wide"
                          title={`Já no estoque · ${recipe.promotedAs.stations.length} praça(s)`}
                        >
                          <PackageCheck className="w-3 h-3" />
                          No Estoque
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 gap-1.5 text-primary hover:bg-primary/10"
                          onClick={() => setPromoteTarget(recipe)}
                          title="Adicionar ao estoque para contagem"
                        >
                          <Package className="w-4 h-4" />
                          <span className="hidden sm:inline">Estoque</span>
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Excluir "${recipe.name}"?`)) {
                            deleteMutation.mutate(recipe.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateRecipeDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <PromoteDialog
        recipe={promoteTarget}
        open={!!promoteTarget}
        onClose={() => setPromoteTarget(null)}
      />

      {/* ── PDF export bar ── */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-20 p-4 bg-gradient-to-t from-background via-background to-transparent pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="max-w-3xl mx-auto">
            <Button
              size="lg"
              className="w-full h-14 text-base font-bold rounded-xl shadow-xl gap-2"
              disabled={isExporting}
              onClick={() => exportPdf(Array.from(selectedIds)).then(exitSelectionMode)}
            >
              <FileDown className="w-5 h-5" />
              {isExporting
                ? "Gerando PDF..."
                : `Exportar ${selectedIds.size} ficha${selectedIds.size !== 1 ? "s" : ""} em PDF`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

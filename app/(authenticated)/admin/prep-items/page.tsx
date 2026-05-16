"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package, ChevronDown, ChevronUp, CheckCircle2, XCircle,
  Clock, Plus, Pencil, Trash2, BookOpen, Egg, Utensils, Layers, ChefHat,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/decimal-input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/EmptyState";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const UNITS = [
  { value: "kg", label: "Quilogramas (kg)" },
  { value: "g", label: "Gramas (g)" },
  { value: "L", label: "Litros (L)" },
  { value: "ml", label: "Mililitros (ml)" },
  { value: "un", label: "Unidades (un)" },
  { value: "porc", label: "Porções" },
];

type RecipeCategory = "PRIMARY" | "MANIPULATED" | "INTERMEDIATE" | "FINAL";
type CategoryFilter = RecipeCategory | "ALL";

const CATEGORY_TABS: { id: CategoryFilter; label: string; icon: any }[] = [
  { id: "ALL", label: "Todos", icon: Package },
  { id: "PRIMARY", label: "Primários", icon: Egg },
  { id: "MANIPULATED", label: "Manipulados", icon: Utensils },
  { id: "INTERMEDIATE", label: "Intermediários", icon: Layers },
  { id: "FINAL", label: "Finais", icon: ChefHat },
];

const CATEGORY_COLORS: Record<RecipeCategory, string> = {
  PRIMARY: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  MANIPULATED: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  INTERMEDIATE: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  FINAL: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300",
};

const CATEGORY_LABELS: Record<RecipeCategory, string> = {
  PRIMARY: "Primário",
  MANIPULATED: "Manipulado",
  INTERMEDIATE: "Intermediário",
  FINAL: "Final",
};

type DayTarget = { day_of_week: number; target_quantity: number };
type Station = { id: string; name: string };
type RecipeRef = { id: string; name: string; category: RecipeCategory };
type PrepItem = {
  id: string;
  name: string;
  unit: string;
  target_quantity: number;
  category: RecipeCategory;
  recipe_id: string | null;
  recipe: RecipeRef | null;
  dayTargets: DayTarget[];
  stations: Station[];
};

// ── Day targets accordion ──────────────────────────────────────────────────

function DayTargetGrid({ item, onClose }: { item: PrepItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<number, string>>(() => {
    const m: Record<number, string> = {};
    item.dayTargets.forEach((dt) => { m[dt.day_of_week] = String(dt.target_quantity); });
    return m;
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const targets = DAYS.map((_, dow) => ({
        day_of_week: dow,
        target_quantity: parseFloat(values[dow] ?? String(item.target_quantity)) || item.target_quantity,
      }));
      const res = await fetch(`/api/prep-items/${item.id}/day-targets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao salvar");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Médias salvas!");
      queryClient.invalidateQueries({ queryKey: ["all-prep-items"] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const getVal = (dow: number) => values[dow] ?? String(item.target_quantity);

  return (
    <div className="border-t px-4 pb-4 pt-3 space-y-4">
      <p className="text-sm text-muted-foreground">Média por dia da semana ({item.unit})</p>
      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((day, dow) => (
          <div key={dow} className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold text-muted-foreground">{day}</span>
            <DecimalInput
              className="h-12 text-center text-base font-bold p-1"
              value={getVal(dow)}
              onChange={(e) => setValues((v) => ({ ...v, [dow]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? "Salvando..." : "Salvar Médias"}
      </Button>
    </div>
  );
}

// ── Single catalog item card ───────────────────────────────────────────────

function PrepItemCard({ item, onEdit, onDelete }: {
  item: PrepItem;
  onEdit: (item: PrepItem) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const fromRecipe = item.recipe_id && item.recipe;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-4 flex items-center justify-between gap-3">
          <button
            className="flex-1 text-left min-w-0"
            onClick={() => setExpanded((v) => !v)}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-lg">{item.name}</span>
              <Badge variant="outline" className="text-xs">{item.unit}</Badge>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}>
                {CATEGORY_LABELS[item.category]}
              </span>
              {fromRecipe && (
                <Link
                  href={`/admin/fichas-tecnicas/${item.recipe_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide hover:bg-primary/20 transition-colors"
                  title={`Ver ficha técnica de ${item.recipe!.name}`}
                >
                  <BookOpen className="w-3 h-3" />
                  Ficha Técnica
                </Link>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Média padrão: {item.target_quantity} {item.unit}
              {item.stations.length > 0 && (
                <span className="ml-2">· {item.stations.map(s => s.name).join(", ")}</span>
              )}
            </p>
          </button>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onEdit(item)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <button onClick={() => setExpanded((v) => !v)} className="p-2 text-muted-foreground">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {expanded && <DayTargetGrid item={item} onClose={() => setExpanded(false)} />}
      </CardContent>
    </Card>
  );
}

// ── Create / Edit dialog ───────────────────────────────────────────────────

function ItemFormDialog({
  open, onClose, editItem, isAdmin = false, defaultCategory,
}: {
  open: boolean;
  onClose: () => void;
  editItem: PrepItem | null;
  isAdmin?: boolean;
  defaultCategory: RecipeCategory;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    unit: "kg",
    target_quantity: "",
    category: defaultCategory as RecipeCategory,
  });

  useEffect(() => {
    if (open) {
      if (editItem) {
        setForm({
          name: editItem.name,
          unit: editItem.unit,
          target_quantity: String(editItem.target_quantity),
          category: editItem.category,
        });
      } else {
        setForm({ name: "", unit: "kg", target_quantity: "", category: defaultCategory });
      }
    }
  }, [open, editItem, defaultCategory]);

  const mutation = useMutation({
    mutationFn: async () => {
      const qty = parseFloat(form.target_quantity);
      if (!form.name.trim() || !qty || qty <= 0) throw new Error("Preencha todos os campos corretamente.");

      if (editItem) {
        const body: Record<string, any> = { target_quantity: qty, category: form.category };
        if (isAdmin && form.name.trim() !== editItem.name) {
          body.name = form.name.trim();
        }
        const res = await fetch(`/api/prep-items/${editItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Erro");
        return res.json();
      }

      const res = await fetch("/api/prep-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          unit: form.unit,
          target_quantity: qty,
          category: form.category,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao criar");
      return res.json();
    },
    onSuccess: () => {
      toast.success(editItem ? "Insumo atualizado!" : "Insumo criado!");
      queryClient.invalidateQueries({ queryKey: ["all-prep-items"] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editItem ? "Editar Insumo" : "Novo Insumo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome</label>
            <Input
              className="h-12 text-lg"
              placeholder="Ex: Tomate Fatiado"
              disabled={!!editItem && !isAdmin}
              value={form.name}
              onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Categoria</label>
            <Select
              value={form.category}
              onValueChange={(val) => setForm((v) => ({ ...v, category: (val ?? "PRIMARY") as RecipeCategory }))}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIMARY">Primário (insumo bruto)</SelectItem>
                <SelectItem value="MANIPULATED">Manipulado</SelectItem>
                <SelectItem value="INTERMEDIATE">Intermediário</SelectItem>
                <SelectItem value="FINAL">Final</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Média padrão</label>
              <DecimalInput
                className="h-12 text-lg"
                placeholder="0"
                value={form.target_quantity}
                onChange={(e) => setForm((v) => ({ ...v, target_quantity: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unidade</label>
              <Select
                disabled={!!editItem}
                value={form.unit}
                onValueChange={(val) => setForm((v) => ({ ...v, unit: val ?? "kg" }))}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            className="w-full h-12 text-lg"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Requests tab ──────────────────────────────────────────────────────────

function RequestsPanel() {
  const queryClient = useQueryClient();
  const { data: requests, isLoading } = useQuery({
    queryKey: ["prep-item-requests"],
    queryFn: async () => {
      const res = await fetch("/api/prep-item-requests");
      if (!res.ok) throw new Error("Falha ao carregar solicitações");
      return res.json();
    },
  });

  const [reviewTarget, setReviewTarget] = useState<Record<string, string>>({});
  const [approveDialogId, setApproveDialogId] = useState<string | null>(null);

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action, target_quantity }: { id: string; action: "APPROVED" | "REJECTED"; target_quantity?: number }) => {
      const res = await fetch(`/api/prep-item-requests/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, target_quantity }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro");
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast.success(vars.action === "APPROVED" ? "Insumo aprovado e adicionado!" : "Solicitação rejeitada.");
      queryClient.invalidateQueries({ queryKey: ["prep-item-requests"] });
      queryClient.invalidateQueries({ queryKey: ["all-prep-items"] });
      setApproveDialogId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;
  if (!requests?.length) return <EmptyState icon={CheckCircle2} title="Nenhuma solicitação pendente" description="Quando funcionários solicitarem insumos, aparecerão aqui." />;

  const approvingReq = requests.find((r: any) => r.id === approveDialogId);

  return (
    <div className="space-y-3">
      {requests.map((req: any) => (
        <Card key={req.id} className="border-amber-200 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-500/10">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-lg">{req.name}</span>
                  <Badge variant="outline" className="text-xs">{req.unit}</Badge>
                  <Badge variant="secondary" className="text-xs">{req.station.name}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Por <strong>{req.user.name}</strong>{req.note && <> · &ldquo;{req.note}&rdquo;</>}
                </p>
              </div>
              <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => setApproveDialogId(req.id)}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar
              </Button>
              <Button
                size="sm" variant="outline"
                className="flex-1 text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => reviewMutation.mutate({ id: req.id, action: "REJECTED" })}
                disabled={reviewMutation.isPending}
              >
                <XCircle className="w-4 h-4 mr-1" /> Rejeitar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!approveDialogId} onOpenChange={() => setApproveDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar &ldquo;{approvingReq?.name}&rdquo;</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Média padrão para <strong>{approvingReq?.station.name}</strong> ({approvingReq?.unit}):
            </p>
            <DecimalInput
              placeholder="0" className="h-12 text-lg"
              value={reviewTarget[approveDialogId ?? ""] ?? ""}
              onChange={(e) => setReviewTarget((v) => ({ ...v, [approveDialogId ?? ""]: e.target.value }))}
            />
            <Button
              className="w-full h-12"
              disabled={reviewMutation.isPending || !reviewTarget[approveDialogId ?? ""]}
              onClick={() => {
                if (!approveDialogId) return;
                reviewMutation.mutate({ id: approveDialogId, action: "APPROVED", target_quantity: parseFloat(reviewTarget[approveDialogId]) });
              }}
            >
              {reviewMutation.isPending ? "Salvando..." : "Confirmar Aprovação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function AdminPrepItemsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"catalog" | "requests">("catalog");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<PrepItem | null>(null);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/users/me");
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  });

  const isManagerOrAbove = user?.role === "ADMIN" || user?.role === "MANAGER";

  const { data: items, isLoading, error: itemsError } = useQuery<PrepItem[]>({
    queryKey: ["all-prep-items"],
    queryFn: async () => {
      const res = await fetch("/api/prep-items");
      if (!res.ok) throw new Error(`Falha ao carregar insumos (${res.status})`);
      return res.json();
    },
    retry: 1,
  });

  const { data: pendingRequests } = useQuery({
    queryKey: ["prep-item-requests"],
    queryFn: async () => {
      const res = await fetch("/api/prep-item-requests");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/prep-items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir insumo");
    },
    onSuccess: () => {
      toast.success("Insumo excluído!");
      queryClient.invalidateQueries({ queryKey: ["all-prep-items"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleDelete = (id: string) => {
    if (confirm("Excluir este insumo? Ele será removido de todas as praças.")) {
      deleteMutation.mutate(id);
    }
  };

  const openCreate = () => { setEditItem(null); setDialogOpen(true); };
  const openEdit = (item: PrepItem) => { setEditItem(item); setDialogOpen(true); };

  const pendingCount = pendingRequests?.length ?? 0;

  const filteredItems =
    categoryFilter === "ALL"
      ? items
      : items?.filter((it) => it.category === categoryFilter);

  const counts: Record<CategoryFilter, number> = {
    ALL: items?.length ?? 0,
    PRIMARY: items?.filter((i) => i.category === "PRIMARY").length ?? 0,
    MANIPULATED: items?.filter((i) => i.category === "MANIPULATED").length ?? 0,
    INTERMEDIATE: items?.filter((i) => i.category === "INTERMEDIATE").length ?? 0,
    FINAL: items?.filter((i) => i.category === "FINAL").length ?? 0,
  };

  const defaultCategoryForCreate: RecipeCategory =
    categoryFilter === "ALL" ? "PRIMARY" : categoryFilter;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 pb-32">
      <PageHeader title="Insumos">
        {tab === "catalog" && (
          <Button onClick={openCreate} className="h-10 gap-2">
            <Plus className="w-4 h-4" /> Novo Insumo
          </Button>
        )}
      </PageHeader>

      {/* Top tabs: Catalog | Requests */}
      <div className="flex gap-4 border-b border-border">
        {(["catalog", "requests"] as const).map((t) => (
          <button
            key={t}
            className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
            onClick={() => setTab(t)}
          >
            {t === "catalog" ? "Catálogo" : "Solicitações"}
            {t === "requests" && pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "catalog" && (
        <>
          {/* Category sub-tabs */}
          <div className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-1">
            {CATEGORY_TABS.map(({ id, label, icon: Icon }) => {
              const active = categoryFilter === id;
              const count = counts[id];
              return (
                <button
                  key={id}
                  onClick={() => setCategoryFilter(id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-accent/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    active ? "bg-primary-foreground/20" : "bg-foreground/10"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : itemsError ? (
            <div className="p-4 text-red-500 bg-red-50 rounded-md text-sm">{(itemsError as Error).message}</div>
          ) : !filteredItems?.length ? (
            <EmptyState
              icon={Package}
              title={categoryFilter === "ALL" ? "Nenhum insumo cadastrado" : "Nenhum insumo nesta categoria"}
              description={
                categoryFilter === "ALL"
                  ? "Crie insumos aqui e depois vincule-os às praças."
                  : "Crie um insumo aqui ou promova uma ficha técnica em Fichas Técnicas → Adicionar ao Estoque."
              }
            />
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <PrepItemCard key={item.id} item={item} onEdit={openEdit} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "requests" && <RequestsPanel />}

      <ItemFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editItem={editItem}
        isAdmin={isManagerOrAbove}
        defaultCategory={defaultCategoryForCreate}
      />
    </div>
  );
}

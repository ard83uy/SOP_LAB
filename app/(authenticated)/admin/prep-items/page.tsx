"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package, ChevronDown, ChevronUp, CheckCircle2, XCircle,
  Clock, Plus, Pencil, Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/EmptyState";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const UNITS = [
  { value: "kg", label: "Quilogramas (kg)" },
  { value: "g", label: "Gramas (g)" },
  { value: "L", label: "Litros (L)" },
  { value: "ml", label: "Mililitros (ml)" },
  { value: "un", label: "Unidades (un)" },
  { value: "porc", label: "Porções" },
];

type DayTarget = { day_of_week: number; target_quantity: number };
type Station = { id: string; name: string };
type PrepItem = {
  id: string;
  name: string;
  unit: string;
  target_quantity: number;
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
            <Input
              className="h-12 text-center text-base font-bold p-1"
              type="number"
              inputMode="decimal"
              step="0.1"
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
  open, onClose, editItem,
}: {
  open: boolean;
  onClose: () => void;
  editItem: PrepItem | null;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", unit: "kg", target_quantity: "" });

  // Reset form every time the dialog opens or switches between create/edit
  useEffect(() => {
    if (open) {
      if (editItem) {
        setForm({ name: editItem.name, unit: editItem.unit, target_quantity: String(editItem.target_quantity) });
      } else {
        setForm({ name: "", unit: "kg", target_quantity: "" });
      }
    }
  }, [open, editItem]);

  const mutation = useMutation({
    mutationFn: async () => {
      const qty = parseFloat(form.target_quantity);
      if (!form.name.trim() || !qty || qty <= 0) throw new Error("Preencha todos os campos corretamente.");

      if (editItem) {
        // PATCH: only update target_quantity (name/unit are immutable)
        const res = await fetch(`/api/prep-items/${editItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_quantity: qty }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Erro");
        return res.json();
      }

      const res = await fetch("/api/prep-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), unit: form.unit, target_quantity: qty }),
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
              disabled={!!editItem}
              value={form.name}
              onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Média padrão</label>
              <Input
                className="h-12 text-lg"
                type="number"
                inputMode="decimal"
                step="0.1"
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
        <Card key={req.id} className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-lg">{req.name}</span>
                  <Badge variant="outline" className="text-xs">{req.unit}</Badge>
                  <Badge variant="secondary" className="text-xs">{req.station.name}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Por <strong>{req.user.name}</strong>{req.note && <> · "{req.note}"</>}
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
            <DialogTitle>Aprovar "{approvingReq?.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Média padrão para <strong>{approvingReq?.station.name}</strong> ({approvingReq?.unit}):
            </p>
            <Input
              type="number" inputMode="decimal" step="0.1"
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<PrepItem | null>(null);

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

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Insumos</h1>
        {tab === "catalog" && (
          <Button onClick={openCreate} className="h-10 gap-2">
            <Plus className="w-4 h-4" /> Novo Insumo
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
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
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : itemsError ? (
            <div className="p-4 text-red-500 bg-red-50 rounded-md text-sm">{(itemsError as Error).message}</div>
          ) : !items?.length ? (
            <EmptyState icon={Package} title="Nenhum insumo cadastrado" description="Crie insumos aqui e depois vincule-os às praças." />
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <PrepItemCard key={item.id} item={item} onEdit={openEdit} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "requests" && <RequestsPanel />}

      <ItemFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} editItem={editItem} />
    </div>
  );
}

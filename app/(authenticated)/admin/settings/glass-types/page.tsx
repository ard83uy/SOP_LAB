"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, GlassWater, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

type GlassType = {
  id: string;
  name: string;
  photo_url: string | null;
  sort_order: number;
};

function GlassFormDialog({
  open, onClose, editGlass,
}: {
  open: boolean;
  onClose: () => void;
  editGlass: GlassType | null;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", photo_url: "" });

  useEffect(() => {
    if (open) {
      setForm({
        name: editGlass?.name ?? "",
        photo_url: editGlass?.photo_url ?? "",
      });
    }
  }, [open, editGlass]);

  const mutation = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      if (!name) throw new Error("Informe o nome do tipo de copo.");
      const photo_url = form.photo_url.trim() || null;

      if (editGlass) {
        const res = await fetch(`/api/glass-types/${editGlass.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, photo_url }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Erro ao atualizar");
        return res.json();
      }

      const res = await fetch("/api/glass-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, photo_url }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao criar");
      return res.json();
    },
    onSuccess: () => {
      toast.success(editGlass ? "Copo atualizado!" : "Copo criado!");
      queryClient.invalidateQueries({ queryKey: ["glass-types"] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editGlass ? "Editar Tipo de Copo" : "Novo Tipo de Copo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome</label>
            <Input
              className="h-11"
              placeholder="Ex: Taça Martini, Long Drink, Old Fashioned"
              value={form.name}
              onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">URL da foto (opcional)</label>
            <Input
              className="h-11"
              placeholder="https://..."
              value={form.photo_url}
              onChange={(e) => setForm((v) => ({ ...v, photo_url: e.target.value }))}
            />
            {form.photo_url && (
              <div className="mt-2 w-24 h-24 rounded-xl overflow-hidden bg-muted border border-border">
                <img
                  src={form.photo_url}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name.trim()}>
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function GlassTypesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGlass, setEditGlass] = useState<GlassType | null>(null);

  const { data: glasses, isLoading } = useQuery<GlassType[]>({
    queryKey: ["glass-types"],
    queryFn: async () => {
      const res = await fetch("/api/glass-types");
      if (!res.ok) throw new Error("Falha ao carregar tipos de copo");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/glass-types/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir");
    },
    onSuccess: () => {
      toast.success("Copo removido");
      queryClient.invalidateQueries({ queryKey: ["glass-types"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => { setEditGlass(null); setDialogOpen(true); };
  const openEdit = (g: GlassType) => { setEditGlass(g); setDialogOpen(true); };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <PageHeader title="Tipos de Copo">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/settings")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Button className="h-10 gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Novo Copo
          </Button>
        </div>
      </PageHeader>

      <p className="text-sm text-muted-foreground -mt-4">
        Estes tipos de copo ficam disponíveis para seleção em fichas técnicas com layout de Bebidas/Drinks.
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : !glasses?.length ? (
        <EmptyState
          icon={GlassWater}
          title="Nenhum tipo de copo cadastrado"
          description="Adicione tipos de copo para usar em fichas técnicas de drinks/bebidas."
        />
      ) : (
        <div className="space-y-2">
          {glasses.map((g) => (
            <Card key={g.id}>
              <CardContent className="p-4 flex items-center gap-3">
                {g.photo_url ? (
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img src={g.photo_url} alt={g.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                    <GlassWater className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                )}
                <span className="flex-1 font-medium">{g.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => openEdit(g)}
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Remover "${g.name}"?`)) {
                      deleteMutation.mutate(g.id);
                    }
                  }}
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GlassFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editGlass={editGlass}
      />
    </div>
  );
}

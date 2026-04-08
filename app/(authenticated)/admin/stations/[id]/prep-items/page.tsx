"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Package, ArrowLeft, Trash2 } from "lucide-react";
import { useState, use } from "react";
import { toast } from "sonner";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";

type PrepItem = {
  id: string;
  name: string;
  unit: string;
  target_quantity: number;
  effective_target?: number;
  produced_quantity?: number;
  current_quantity?: number | null;
};

export default function StationPrepItemsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: stationId } = use(params);
  const queryClient = useQueryClient();
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>("");

  // Items already linked to this station
  const { data: linkedItems, isLoading: loadingLinked } = useQuery<PrepItem[]>({
    queryKey: ["station-prep-items", stationId],
    queryFn: async () => {
      const res = await fetch(`/api/stations/${stationId}/prep-items`);
      if (!res.ok) throw new Error("Falha ao carregar insumos");
      const json = await res.json();
      return json.items;
    },
  });

  // Full catalog (to pick from when linking)
  const { data: allItems, isLoading: loadingAll } = useQuery<PrepItem[]>({
    queryKey: ["all-prep-items"],
    queryFn: async () => {
      const res = await fetch("/api/prep-items");
      if (!res.ok) throw new Error("Falha ao carregar catálogo");
      return res.json();
    },
    enabled: linkOpen,
  });

  const linkedIds = new Set(linkedItems?.map((i) => i.id) ?? []);
  const availableItems = allItems?.filter((i) => !linkedIds.has(i.id)) ?? [];

  const linkMutation = useMutation({
    mutationFn: async (prep_item_id: string) => {
      const res = await fetch(`/api/stations/${stationId}/prep-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prep_item_id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao vincular");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Insumo vinculado à praça!");
      queryClient.invalidateQueries({ queryKey: ["station-prep-items", stationId] });
      setLinkOpen(false);
      setSelectedItemId("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const unlinkMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/stations/${stationId}/prep-items/${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao remover insumo");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Insumo removido desta praça.");
      queryClient.invalidateQueries({ queryKey: ["station-prep-items", stationId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleUnlink = (itemId: string) => {
    if (confirm("Remover este insumo desta praça? (O insumo continua no catálogo)")) {
      unlinkMutation.mutate(itemId);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader title="Insumos da Praça">
        <div className="flex items-center gap-3">
          <Link href="/admin/stations">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <Button onClick={() => setLinkOpen(true)} className="h-10 gap-2">
            <Plus className="w-4 h-4" /> Vincular Insumo
          </Button>
        </div>
      </PageHeader>

      {/* Link dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Insumo à Praça</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione um insumo do catálogo para adicionar a esta praça.
              Para criar novos insumos, acesse a aba <strong>Insumos</strong>.
            </p>
            {loadingAll ? (
              <Skeleton className="h-12 w-full" />
            ) : availableItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Todos os insumos já estão vinculados a esta praça.
              </p>
            ) : (
              <Select value={selectedItemId} onValueChange={(v) => setSelectedItemId(v ?? "")}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Escolha um insumo..." />
                </SelectTrigger>
                <SelectContent>
                  {availableItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} <span className="text-muted-foreground ml-1">({item.unit})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              className="w-full h-12 text-lg"
              disabled={!selectedItemId || linkMutation.isPending}
              onClick={() => linkMutation.mutate(selectedItemId)}
            >
              {linkMutation.isPending ? "Vinculando..." : "Vincular"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Linked items list */}
      {loadingLinked ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : !linkedItems?.length ? (
        <EmptyState
          icon={Package}
          title="Nenhum insumo vinculado"
          description="Vincule insumos do catálogo para definir o Par Level desta praça."
        />
      ) : (
        <div className="grid gap-3">
          {linkedItems.map((item: any) => (
            <Card key={item.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-lg truncate">{item.name}</h3>
                    <Badge variant="outline" className="text-xs">{item.unit}</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm mt-0.5">
                    Necessário hoje:{" "}
                    <strong className="text-foreground">
                      {item.effective_target ?? item.target_quantity} {item.unit}
                    </strong>
                  </p>
                  {(item.current_quantity ?? 0) > 0 && (
                    <p className="text-sm mt-0.5 text-green-700 dark:text-green-400">
                      Disponível:{" "}
                      <strong>
                        {item.current_quantity} {item.unit}
                      </strong>
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost" size="icon"
                  className="flex-shrink-0 h-10 w-10 text-muted-foreground hover:text-destructive"
                  onClick={() => handleUnlink(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

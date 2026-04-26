"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";

type KitchenTool = {
  id: string;
  name: string;
  sort_order: number;
};

export default function KitchenToolsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");

  const { data: tools, isLoading } = useQuery<KitchenTool[]>({
    queryKey: ["kitchen-tools"],
    queryFn: async () => {
      const res = await fetch("/api/kitchen-tools");
      if (!res.ok) throw new Error("Falha ao carregar ferramentas");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/kitchen-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), sort_order: tools?.length ?? 0 }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar ferramenta");
      }
      return res.json();
    },
    onSuccess: () => {
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["kitchen-tools"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/kitchen-tools/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir ferramenta");
    },
    onSuccess: () => {
      toast.success("Ferramenta removida");
      queryClient.invalidateQueries({ queryKey: ["kitchen-tools"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleAdd = () => {
    if (!newName.trim()) return;
    createMutation.mutate(newName);
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <PageHeader title="Ferramentas de Cozinha">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/settings")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </PageHeader>

      <p className="text-sm text-muted-foreground -mt-4">
        Estas ferramentas ficam disponíveis para seleção nas fichas técnicas.
      </p>

      {/* Add new tool */}
      <Card>
        <CardContent className="p-4">
          <label className="text-sm font-medium block mb-2">Adicionar ferramenta</label>
          <div className="flex gap-2">
            <Input
              className="h-10"
              placeholder="Ex: Panela de pressão, Batedeira..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            />
            <Button
              className="h-10 gap-1.5"
              onClick={handleAdd}
              disabled={!newName.trim() || createMutation.isPending}
            >
              <Plus className="w-4 h-4" />
              {createMutation.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tools list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : !tools?.length ? (
        <EmptyState
          icon={Wrench}
          title="Nenhuma ferramenta cadastrada"
          description="Adicione ferramentas para usar nas fichas técnicas."
        />
      ) : (
        <div className="space-y-2">
          {tools.map((tool) => (
            <Card key={tool.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <Wrench className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 font-medium">{tool.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Remover "${tool.name}"?`)) {
                      deleteMutation.mutate(tool.id);
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
    </div>
  );
}

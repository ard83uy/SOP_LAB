"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  Plus,
  Trash2,
  Pencil,
  BarChart3,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";

// ── Types ────────────────────────────────────────────────────────────────────

type Profile = { id: string; name: string };

type Checklist = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  profiles: Profile[];
  _count: { tasks: number };
  creator: { name: string };
};

// ── Schema ──────────────────────────────────────────────────────────────────

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(100),
  description: z.string().max(1000).optional(),
  profile_ids: z.array(z.string()).min(1, "Selecione pelo menos 1 perfil"),
});

type FormValues = z.infer<typeof formSchema>;

// ── Page ────────────────────────────────────────────────────────────────────

export default function AdminChecklistsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Checklist | null>(null);

  const { data: checklists, isLoading } = useQuery<Checklist[]>({
    queryKey: ["checklists"],
    queryFn: async () => {
      const res = await fetch("/api/checklists");
      if (!res.ok) throw new Error("Erro ao carregar checklists");
      return res.json();
    },
  });

  const { data: profiles } = useQuery<Profile[]>({
    queryKey: ["checklist-profiles"],
    queryFn: async () => {
      const res = await fetch("/api/user-profiles");
      if (!res.ok) throw new Error("Erro ao carregar perfis");
      return res.json();
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "", profile_ids: [] },
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch("/api/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar checklist");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklists"] });
      setCreateOpen(false);
      form.reset();
      toast.success("Checklist criado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/checklists/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir checklist");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklists"] });
      setDeleteTarget(null);
      toast.success("Checklist excluído");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const res = await fetch(`/api/checklists/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklists"] });
    },
  });

  function toggleProfile(profileId: string) {
    const current = form.getValues("profile_ids");
    if (current.includes(profileId)) {
      form.setValue(
        "profile_ids",
        current.filter((id) => id !== profileId),
        { shouldValidate: true },
      );
    } else {
      form.setValue("profile_ids", [...current, profileId], { shouldValidate: true });
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-24">
      <PageHeader title="Checklists" subtitle="Gerencie os checklists operacionais">
        <Link href="/admin/checklists/dashboard">
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-1.5" />
            Dashboard
          </Button>
        </Link>
      </PageHeader>

      {/* Create button */}
      <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
        <Plus className="w-4 h-4 mr-1.5" />
        Novo Checklist
      </Button>

      {/* List */}
      {!checklists?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum checklist criado</p>
          <p className="text-sm mt-1">Crie o primeiro checklist operacional</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {checklists.map((cl) => (
            <Card key={cl.id} className={!cl.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/admin/checklists/${cl.id}`}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-base truncate">{cl.name}</h3>
                      <Badge variant={cl.is_active ? "default" : "secondary"} className="shrink-0">
                        {cl.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    {cl.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                        {cl.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{cl._count.tasks} tarefa{cl._count.tasks !== 1 ? "s" : ""}</span>
                      <span>·</span>
                      <span>
                        {cl.profiles.map((p) => p.name).join(", ") || "Sem perfis"}
                      </span>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        toggleMutation.mutate({
                          id: cl.id,
                          is_active: !cl.is_active,
                        })
                      }
                    >
                      {cl.is_active ? (
                        <ToggleRight className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                    </Button>
                    <Link href={`/admin/checklists/${cl.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteTarget(cl)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Checklist</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Abertura da Cozinha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o propósito deste checklist"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="profile_ids"
                render={() => (
                  <FormItem>
                    <FormLabel>Perfis</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {(profiles ?? []).map((p) => {
                        const selected = form.watch("profile_ids").includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleProfile(p.id)}
                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                              selected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card border-border hover:bg-muted"
                            }`}
                          >
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Criando..." : "Criar Checklist"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Checklist</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>?
            Todas as tarefas e registros de conclusão serão removidos.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

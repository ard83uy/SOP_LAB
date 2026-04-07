"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, LayoutDashboard, Trash2, Pencil } from "lucide-react";
import { useState, useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/EmptyState";

const createStationSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(100),
});

export default function StationsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editStation, setEditStation] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: stations, isLoading, error } = useQuery({
    queryKey: ["stations"],
    queryFn: async () => {
      const res = await fetch("/api/stations");
      if (!res.ok) throw new Error("Falha ao carregar praças");
      return res.json();
    },
  });

  const form = useForm<z.infer<typeof createStationSchema>>({
    resolver: zodResolver(createStationSchema),
    defaultValues: { name: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof createStationSchema>) => {
      const res = await fetch("/api/stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Falha ao criar praça");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stations"] });
      toast.success("Praça criada com sucesso!");
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const editForm = useForm<z.infer<typeof createStationSchema>>({
    resolver: zodResolver(createStationSchema),
    defaultValues: { name: "" },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/stations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Falha ao renomear praça");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stations"] });
      toast.success("Praça renomeada!");
      setEditStation(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/stations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Falha ao excluir praça");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stations"] });
      toast.success("Praça excluída!");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleEditClick = (e: React.MouseEvent, station: { id: string; name: string }) => {
    e.preventDefault();
    e.stopPropagation();
    setEditStation(station);
    editForm.reset({ name: station.name });
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirmDeleteId) deleteMutation.mutate(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  function onSubmit(values: z.infer<typeof createStationSchema>) {
    mutation.mutate(values);
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Praças</h1>
        {mounted && (
          <Button 
            onClick={() => setOpen(true)} 
            size="icon" 
            className="rounded-full shadow-lg h-14 w-14 fixed bottom-24 right-4 md:static md:w-auto md:h-11 md:rounded-md md:px-4 md:shadow-none z-40"
          >
            <Plus className="w-7 h-7 md:hidden" />
            <span className="hidden md:flex items-center gap-2">
              <Plus className="w-5 h-5" /> Nova Praça
            </span>
          </Button>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Praça</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Praça</FormLabel>
                      <FormControl>
                        <Input className="h-12 text-lg" placeholder="Ex: Grelha, Salada..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-12 text-lg" disabled={mutation.isPending}>
                  {mutation.isPending ? "Salvando..." : "Salvar Praça"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editStation} onOpenChange={(o) => !o && setEditStation(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Renomear Praça</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((v) => renameMutation.mutate({ id: editStation!.id, name: v.name }))} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Novo Nome</FormLabel>
                      <FormControl>
                        <Input className="h-12 text-lg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-12 text-lg" disabled={renameMutation.isPending}>
                  {renameMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 text-red-500 bg-red-50 rounded-md">{(error as Error).message}</div>
      ) : !stations || stations.length === 0 ? (
        <EmptyState
          icon={LayoutDashboard}
          title="Nenhuma praça criada"
          description="Crie sua primeira praça para começar a organizar sua cozinha."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stations.map((station: any) => (
            <Link key={station.id} href={`/admin/stations/${station.id}/prep-items`}>
              <Card className="hover:border-primary transition-all cursor-pointer active:scale-[0.98] relative group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-full flex-shrink-0">
                    <LayoutDashboard className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold truncate pr-8">{station.name}</h2>
                  </div>
                  
                  {confirmDeleteId === station.id ? (
                    <div
                      className="absolute top-4 right-4 flex items-center gap-1"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    >
                      <button
                        onClick={handleConfirmDelete}
                        className="px-2 py-1 text-xs font-medium bg-destructive text-destructive-foreground rounded"
                      >
                        Excluir
                      </button>
                      <button
                        onClick={handleCancelDelete}
                        className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="absolute top-4 right-4 flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleEditClick(e, station)}
                        className="p-2 text-muted-foreground hover:text-primary"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(e, station.id)}
                        className="p-2 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

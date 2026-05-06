"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Plus, Trash2, Pencil, BarChart3, ToggleLeft, ToggleRight, Search, X, FileDown, GripVertical } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";

type Profile = { id: string; name: string };
type ChecklistTask = { id: string; title: string; description: string | null; time_slot: string; frequency: string; days_of_week: number[]; sort_order: number; points: number };
type Checklist = { id: string; name: string; description: string | null; is_active: boolean; created_at: string; sort_order: number; profiles: Profile[]; tasks: ChecklistTask[]; _count: { tasks: number }; creator: { name: string } };

const formSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  profile_ids: z.array(z.string()).min(1, "Selecione pelo menos 1 perfil"),
});
type FormValues = z.infer<typeof formSchema>;

function SortableChecklistCard({ cl, onToggle, onDelete, keyword }: {
  cl: Checklist; onToggle: () => void; onDelete: () => void; keyword: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cl.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined };
  const matchingTasks = keyword ? cl.tasks.filter(t => t.title.toLowerCase().includes(keyword) || (t.description ?? "").toLowerCase().includes(keyword)) : [];
  return (
    <div ref={setNodeRef} style={style}>
      <Card className={!cl.is_active ? "opacity-60" : ""}>
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <button {...attributes} {...listeners} className="mt-1 shrink-0 cursor-grab active:cursor-grabbing touch-none" aria-label="Reordenar">
              <GripVertical className="w-4 h-4 text-muted-foreground/40 hover:text-muted-foreground transition-colors" />
            </button>
            <Link href={`/admin/checklists/${cl.id}`} className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-base truncate">{cl.name}</h3>
                <Badge variant={cl.is_active ? "default" : "secondary"} className="shrink-0">{cl.is_active ? "Ativo" : "Inativo"}</Badge>
              </div>
              {cl.description && <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{cl.description}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{cl._count.tasks} tarefa{cl._count.tasks !== 1 ? "s" : ""}</span>
                <span>·</span>
                <span>{cl.profiles.map(p => p.name).join(", ") || "Sem perfis"}</span>
              </div>
            </Link>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
                {cl.is_active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
              </Button>
              <Link href={`/admin/checklists/${cl.id}`}><Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="w-4 h-4" /></Button></Link>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
          {matchingTasks.length > 0 && (
            <div className="mt-3 pt-3 border-t space-y-1">
              {matchingTasks.map(t => (
                <div key={t.id} className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                  <CheckSquare className="w-3 h-3 shrink-0 text-primary/60" />
                  <span className="flex-1 truncate">{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ExportPdfDialog({ open, onClose, checklists, profiles }: {
  open: boolean; onClose: () => void; checklists: Checklist[]; profiles: Profile[];
}) {
  const [step, setStep] = useState<"profile" | "select">("profile");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedChecklistIds, setSelectedChecklistIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (open) { setStep("profile"); setSelectedProfileId(null); setSelectedChecklistIds(new Set()); }
  }, [open]);

  const activeChecklists = checklists.filter(cl => cl.is_active);

  function toggleChecklist(id: string) {
    setSelectedChecklistIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  async function handleExport() {
    if (!selectedProfileId || selectedChecklistIds.size === 0) return;
    setExporting(true);
    try {
      const res = await fetch("/api/checklists/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: selectedProfileId, checklist_ids: [...selectedChecklistIds] }),
      });
      if (!res.ok) throw new Error("Erro ao gerar PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const profile = profiles.find(p => p.id === selectedProfileId);
      a.download = `checklist-${(profile?.name ?? "export").toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF exportado com sucesso!");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-primary" />
            Exportar Checklists para PDF
          </DialogTitle>
        </DialogHeader>

        {step === "profile" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Selecione o perfil de colaborador para o checklist:</p>
            <div className="grid gap-2">
              {profiles.map(p => (
                <button key={p.id} onClick={() => setSelectedProfileId(p.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${selectedProfileId === p.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}>
                  {p.name}
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button disabled={!selectedProfileId} onClick={() => setStep("select")}>Próximo →</Button>
            </DialogFooter>
          </div>
        )}

        {step === "select" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Selecione os checklists a incluir:</p>
              <div className="flex gap-2 text-xs">
                <button onClick={() => setSelectedChecklistIds(new Set(activeChecklists.map(cl => cl.id)))} className="text-primary hover:underline">Todos</button>
                <span className="text-muted-foreground">·</span>
                <button onClick={() => setSelectedChecklistIds(new Set())} className="text-muted-foreground hover:underline">Nenhum</button>
              </div>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {activeChecklists.length === 0 && <p className="text-sm text-center py-6 text-muted-foreground">Nenhum checklist ativo</p>}
              {activeChecklists.map(cl => {
                const checked = selectedChecklistIds.has(cl.id);
                return (
                  <button key={cl.id} onClick={() => toggleChecklist(cl.id)}
                    className={`w-full text-left px-3 py-3 rounded-lg border transition-colors ${checked ? "bg-primary/5 border-primary" : "bg-card border-border hover:bg-muted"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-primary border-primary" : "border-border"}`}>
                        {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{cl.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {cl._count.tasks} tarefa{cl._count.tasks !== 1 ? "s" : ""} · {cl.profiles.map(p => p.name).join(", ") || "Sem perfis"}
                        </p>
                        {cl.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{cl.description}</p>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedChecklistIds.size > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                {selectedChecklistIds.size} checklist{selectedChecklistIds.size !== 1 ? "s" : ""} selecionado{selectedChecklistIds.size !== 1 ? "s" : ""}
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("profile")}>← Voltar</Button>
              <Button disabled={selectedChecklistIds.size === 0 || exporting} onClick={handleExport}>
                <FileDown className="w-4 h-4 mr-1.5" />
                {exporting ? "Gerando PDF..." : "Exportar PDF"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AdminChecklistsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Checklist | null>(null);
  const [profileFilter, setProfileFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [localChecklists, setLocalChecklists] = useState<Checklist[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const { data: checklists, isLoading } = useQuery<Checklist[]>({
    queryKey: ["checklists"],
    queryFn: async () => { const r = await fetch("/api/checklists"); if (!r.ok) throw new Error("Erro"); return r.json(); },
  });
  const { data: profiles } = useQuery<Profile[]>({
    queryKey: ["checklist-profiles"],
    queryFn: async () => { const r = await fetch("/api/user-profiles"); if (!r.ok) throw new Error("Erro"); return r.json(); },
  });

  useEffect(() => {
    if (checklists) setLocalChecklists([...checklists].sort((a, b) => a.sort_order - b.sort_order));
  }, [checklists]);

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { name: "", description: "", profile_ids: [] } });

  const createMutation = useMutation({
    mutationFn: async (v: FormValues) => {
      const r = await fetch("/api/checklists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Erro"); }
      return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["checklists"] }); setCreateOpen(false); form.reset(); toast.success("Checklist criado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const r = await fetch(`/api/checklists/${id}`, { method: "DELETE" }); if (!r.ok) throw new Error("Erro"); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["checklists"] }); setDeleteTarget(null); toast.success("Checklist excluído"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const r = await fetch(`/api/checklists/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active }) });
      if (!r.ok) throw new Error("Erro"); return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["checklists"] }),
  });

  const reorderMutation = useMutation({
    mutationFn: async (order: string[]) => {
      const r = await fetch("/api/checklists/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order }) });
      if (!r.ok) throw new Error("Erro ao reordenar"); return r.json();
    },
    onError: (e: Error) => {
      toast.error(e.message);
      if (checklists) setLocalChecklists([...checklists].sort((a, b) => a.sort_order - b.sort_order));
    },
  });

  function toggleProfile(profileId: string) {
    const current = form.getValues("profile_ids");
    form.setValue("profile_ids", current.includes(profileId) ? current.filter(id => id !== profileId) : [...current, profileId], { shouldValidate: true });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalChecklists(prev => {
      const oldIndex = prev.findIndex(cl => cl.id === active.id);
      const newIndex = prev.findIndex(cl => cl.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      reorderMutation.mutate(reordered.map(cl => cl.id));
      return reordered;
    });
  }

  if (isLoading) return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <Skeleton className="h-10 w-48" />
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
    </div>
  );

  const keyword = search.trim().toLowerCase();
  const filteredChecklists = localChecklists
    .filter(cl => !profileFilter || cl.profiles.some(p => p.id === profileFilter))
    .filter(cl => {
      if (!keyword) return true;
      if (cl.name.toLowerCase().includes(keyword)) return true;
      if ((cl.description ?? "").toLowerCase().includes(keyword)) return true;
      return cl.tasks.some(t => t.title.toLowerCase().includes(keyword) || (t.description ?? "").toLowerCase().includes(keyword));
    });

  const isFiltering = !!profileFilter || !!keyword;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-24">
      <PageHeader title="Checklists" subtitle="Gerencie os checklists operacionais">
        <Link href="/admin/checklists/dashboard"><Button variant="outline" size="sm"><BarChart3 className="w-4 h-4 mr-1.5" />Dashboard</Button></Link>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-1.5" />Novo Checklist</Button>
        {localChecklists.length > 0 && (
          <Button variant="outline" onClick={() => setExportOpen(true)} className="w-full sm:w-auto">
            <FileDown className="w-4 h-4 mr-1.5" />Exportar PDF
          </Button>
        )}
      </div>

      {localChecklists.length > 0 && (
        <div className="space-y-3">
          {(profiles ?? []).length > 1 && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setProfileFilter(null)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!profileFilter ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}>Todos os perfis</button>
              {(profiles ?? []).map(p => (
                <button key={p.id} onClick={() => setProfileFilter(profileFilter === p.id ? null : p.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${profileFilter === p.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}>{p.name}</button>
              ))}
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input type="text" placeholder="Buscar checklist ou tarefa..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-9 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
          </div>
          {!keyword && !profileFilter && localChecklists.length > 1 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><GripVertical className="w-3 h-3" />Arraste para reordenar os checklists</p>
          )}
        </div>
      )}

      {localChecklists.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum checklist criado</p>
          <p className="text-sm mt-1">Crie o primeiro checklist operacional</p>
        </div>
      ) : filteredChecklists.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum resultado encontrado</p>
          <p className="text-sm mt-1">Tente outros termos ou remova os filtros</p>
          {isFiltering && <button onClick={() => { setProfileFilter(null); setSearch(""); }} className="mt-3 text-sm text-primary hover:underline">Limpar filtros</button>}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredChecklists.map(cl => cl.id)} strategy={verticalListSortingStrategy}>
            <div className="grid gap-3">
              {filteredChecklists.map(cl => (
                <SortableChecklistCard key={cl.id} cl={cl} keyword={keyword}
                  onToggle={() => toggleMutation.mutate({ id: cl.id, is_active: !cl.is_active })}
                  onDelete={() => setDeleteTarget(cl)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Checklist</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => createMutation.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nome</FormLabel><FormControl><Input placeholder="Ex: Abertura da Cozinha" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Descrição (opcional)</FormLabel><FormControl><Textarea placeholder="Descreva o propósito deste checklist" rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="profile_ids" render={() => (
                <FormItem>
                  <FormLabel>Perfis</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {(profiles ?? []).map(p => {
                      const selected = form.watch("profile_ids").includes(p.id);
                      return <button key={p.id} type="button" onClick={() => toggleProfile(p.id)} className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}>{p.name}</button>;
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Criando..." : "Criar Checklist"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir Checklist</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>? Todas as tarefas e registros serão removidos.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? "Excluindo..." : "Excluir"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExportPdfDialog open={exportOpen} onClose={() => setExportOpen(false)} checklists={localChecklists} profiles={profiles ?? []} />
    </div>
  );
}

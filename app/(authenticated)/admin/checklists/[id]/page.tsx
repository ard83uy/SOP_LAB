"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Types ────────────────────────────────────────────────────────────────────

type Profile = { id: string; name: string };

type ChecklistTask = {
  id: string;
  title: string;
  description: string | null;
  frequency: "DAILY" | "SPECIFIC_DAYS";
  days_of_week: number[];
  time_slot: string;
  sort_order: number;
  points: number;
  is_active: boolean;
};

type Checklist = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  profiles: Profile[];
  tasks: ChecklistTask[];
};

const TIME_SLOTS = [
  { value: "ALL_DAY", label: "Sem horário" },
  { value: "OPENING", label: "Abertura" },
  { value: "MIDDAY", label: "Meio do Dia" },
  { value: "CLOSING", label: "Fechamento" },
];

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ── Page ────────────────────────────────────────────────────────────────────

export default function EditChecklistPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Local task order for optimistic DnD
  const [localTasks, setLocalTasks] = useState<ChecklistTask[]>([]);

  // New task form
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newFrequency, setNewFrequency] = useState<"DAILY" | "SPECIFIC_DAYS">("DAILY");
  const [newDays, setNewDays] = useState<number[]>([]);
  const [newTimeSlot, setNewTimeSlot] = useState("ALL_DAY");
  const [newPoints, setNewPoints] = useState(1);
  const [showAddTask, setShowAddTask] = useState(false);

  const { data: checklist, isLoading } = useQuery<Checklist>({
    queryKey: ["checklist", id],
    queryFn: async () => {
      const res = await fetch(`/api/checklists/${id}`);
      if (!res.ok) throw new Error("Erro ao carregar checklist");
      return res.json();
    },
  });

  const { data: allProfiles } = useQuery<Profile[]>({
    queryKey: ["checklist-profiles"],
    queryFn: async () => {
      const res = await fetch("/api/user-profiles");
      if (!res.ok) throw new Error("Erro ao carregar perfis");
      return res.json();
    },
  });

  useEffect(() => {
    if (checklist && !initialized) {
      setName(checklist.name);
      setDescription(checklist.description ?? "");
      setSelectedProfileIds(checklist.profiles.map((p) => p.id));
      setInitialized(true);
    }
  }, [checklist, initialized]);

  // Sync localTasks whenever server data changes
  useEffect(() => {
    if (checklist) {
      setLocalTasks([...checklist.tasks].sort((a, b) => a.sort_order - b.sort_order));
    }
  }, [checklist]);

  // DnD sensors — pointer for desktop, touch for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch(`/api/checklists/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao salvar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist", id] });
      queryClient.invalidateQueries({ queryKey: ["checklists"] });
      toast.success("Checklist atualizado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addTaskMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch(`/api/checklists/${id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao adicionar tarefa");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist", id] });
      setNewTitle("");
      setNewDescription("");
      setNewFrequency("DAILY");
      setNewDays([]);
      setNewTimeSlot("ALL_DAY");
      setNewPoints(1);
      setShowAddTask(false);
      toast.success("Tarefa adicionada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Record<string, any> }) => {
      const res = await fetch(`/api/checklists/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao atualizar tarefa");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist", id] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/checklists/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir tarefa");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist", id] });
      toast.success("Tarefa removida");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (order: string[]) => {
      const res = await fetch(`/api/checklists/${id}/tasks/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });
      if (!res.ok) throw new Error("Erro ao reordenar tarefas");
      return res.json();
    },
    onError: (err: Error) => {
      toast.error(err.message);
      // Revert local order on error
      if (checklist) setLocalTasks([...checklist.tasks].sort((a, b) => a.sort_order - b.sort_order));
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLocalTasks((prev) => {
      const oldIndex = prev.findIndex((t) => t.id === active.id);
      const newIndex = prev.findIndex((t) => t.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      reorderMutation.mutate(reordered.map((t) => t.id));
      return reordered;
    });
  }

  function saveHeaderChanges() {
    updateMutation.mutate({
      name,
      description: description || undefined,
      profile_ids: selectedProfileIds,
    });
  }

  function toggleProfileId(profileId: string) {
    setSelectedProfileIds((prev) =>
      prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId],
    );
  }

  function toggleDay(day: number) {
    setNewDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function handleAddTask() {
    if (!newTitle.trim()) return;
    addTaskMutation.mutate({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      frequency: newFrequency,
      days_of_week: newFrequency === "SPECIFIC_DAYS" ? newDays : [],
      time_slot: newTimeSlot,
      points: newPoints,
    });
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto text-center py-20">
        <p className="text-muted-foreground">Checklist não encontrado</p>
        <Link href="/admin/checklists">
          <Button variant="outline" className="mt-4">Voltar</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/admin/checklists">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <PageHeader title="Editar Checklist" />
      </div>

      {/* Header section */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Nome</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Descrição</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Perfis</label>
            <div className="flex flex-wrap gap-2">
              {(allProfiles ?? []).map((p) => {
                const selected = selectedProfileIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProfileId(p.id)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
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
          </div>
          <Button
            onClick={saveHeaderChanges}
            disabled={updateMutation.isPending}
            size="sm"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </CardContent>
      </Card>

      {/* Tasks section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Tarefas ({localTasks.length})</h2>
          <Button size="sm" variant="outline" onClick={() => setShowAddTask(!showAddTask)}>
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {/* Add task form */}
        {showAddTask && (
          <Card className="border-primary/30">
            <CardContent className="p-4 space-y-3">
              <Input
                placeholder="Título da tarefa"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Textarea
                placeholder="Descrição (opcional)"
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Frequência</label>
                  <Select value={newFrequency} onValueChange={(v: any) => setNewFrequency(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Diário</SelectItem>
                      <SelectItem value="SPECIFIC_DAYS">Dias específicos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Período</label>
                  <Select value={newTimeSlot} onValueChange={(v) => v && setNewTimeSlot(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((ts) => (
                        <SelectItem key={ts.value} value={ts.value}>
                          {ts.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {newFrequency === "SPECIFIC_DAYS" && (
                <div>
                  <label className="text-xs font-medium mb-1 block">Dias da semana</label>
                  <div className="flex gap-1.5">
                    {DAYS.map((label, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleDay(idx)}
                        className={`w-9 h-9 rounded-lg border text-xs font-bold transition-colors ${
                          newDays.includes(idx)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border hover:bg-muted"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-medium mb-1 block">Pontos</label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={newPoints}
                  onChange={(e) => setNewPoints(Number(e.target.value) || 1)}
                  className="w-24"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddTask}
                  disabled={addTaskMutation.isPending || !newTitle.trim()}
                >
                  {addTaskMutation.isPending ? "Adicionando..." : "Adicionar Tarefa"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddTask(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sortable task list */}
        {localTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma tarefa ainda. Adicione a primeira!
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localTasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {localTasks.map((task) => (
                  <SortableTaskCard
                    key={task.id}
                    task={task}
                    onUpdate={(data) => updateTaskMutation.mutate({ taskId: task.id, data })}
                    onDelete={() => deleteTaskMutation.mutate(task.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

// ── Sortable Task Card ───────────────────────────────────────────────────────

function SortableTaskCard({
  task,
  onUpdate,
  onDelete,
}: {
  task: ChecklistTask;
  onUpdate: (data: Record<string, any>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard task={task} onUpdate={onUpdate} onDelete={onDelete} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

// ── Task Card ───────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onUpdate,
  onDelete,
  dragHandleProps,
}: {
  task: ChecklistTask;
  onUpdate: (data: Record<string, any>) => void;
  onDelete: () => void;
  dragHandleProps: Record<string, any>;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description ?? "");

  const timeSlotLabel =
    TIME_SLOTS.find((ts) => ts.value === task.time_slot)?.label ?? task.time_slot;

  const frequencyLabel =
    task.frequency === "DAILY"
      ? "Diário"
      : task.days_of_week.map((d) => DAYS[d]).join(", ");

  function handleSaveEdit() {
    if (!editTitle.trim()) return;
    onUpdate({
      title: editTitle.trim(),
      description: editDescription.trim() || null,
    });
    setEditing(false);
  }

  function handleCancelEdit() {
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditing(false);
  }

  return (
    <Card className={!task.is_active ? "opacity-50" : ""}>
      <CardContent className="p-3">
        {editing ? (
          /* ── Edit mode ── */
          <div className="space-y-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Título"
              autoFocus
              className="text-sm"
            />
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Descrição (opcional)"
              rows={2}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={!editTitle.trim()}
                className="h-7 px-2 text-xs"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Salvar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelEdit}
                className="h-7 px-2 text-xs"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          /* ── View mode ── */
          <div className="flex items-start gap-2">
            <button
              {...dragHandleProps}
              className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing touch-none"
              aria-label="Arrastar para reordenar"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-sm">{task.title}</span>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {timeSlotLabel}
                </Badge>
                {task.points > 1 && (
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {task.points} pts
                  </Badge>
                )}
              </div>
              {task.description && (
                <p className="text-xs text-muted-foreground mb-0.5">{task.description}</p>
              )}
              <p className="text-[11px] text-muted-foreground">{frequencyLabel}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setEditing(true)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onUpdate({ is_active: !task.is_active })}
              >
                <Badge variant={task.is_active ? "default" : "secondary"} className="text-[9px]">
                  {task.is_active ? "ON" : "OFF"}
                </Badge>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

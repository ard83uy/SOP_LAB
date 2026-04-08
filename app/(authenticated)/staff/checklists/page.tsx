"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  Circle,
  CheckCircle2,
  Trophy,
  Medal,
  Star,
  Loader2,
  Sunrise,
  Sun,
  Sunset,
  Clock,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";

// ── Types ────────────────────────────────────────────────────────────────────

type Task = {
  id: string;
  title: string;
  description: string | null;
  time_slot: string;
  points: number;
  checklist_name: string;
  completed: boolean;
  completed_at: string | null;
};

type MyTasksResponse = {
  tasks: Task[];
  todayDate: string;
  totalPoints: number;
  earnedPoints: number;
};

type RankingEntry = {
  user_id: string;
  user_name: string;
  points: number;
  position: number;
};

type RankingResponse = {
  ranking: RankingEntry[];
  current_user: RankingEntry | null;
  week_start: string;
  week_end: string;
};

// ── Constants ───────────────────────────────────────────────────────────────

const TIME_SLOT_CONFIG: Record<string, { label: string; icon: typeof Sunrise; order: number }> = {
  OPENING: { label: "Abertura", icon: Sunrise, order: 0 },
  MIDDAY:  { label: "Meio do Dia", icon: Sun, order: 1 },
  CLOSING: { label: "Fechamento", icon: Sunset, order: 2 },
  ALL_DAY: { label: "Sem horário", icon: Clock, order: 3 },
};

const POSITION_ICONS = [Trophy, Medal, Star];
const POSITION_COLORS = ["text-yellow-500", "text-zinc-400", "text-amber-600"];

// ── Page ────────────────────────────────────────────────────────────────────

export default function StaffChecklistsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<MyTasksResponse>({
    queryKey: ["my-checklist-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/checklists/my-tasks");
      if (!res.ok) throw new Error("Erro ao carregar tarefas");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const { data: ranking } = useQuery<RankingResponse>({
    queryKey: ["checklist-ranking"],
    queryFn: async () => {
      const res = await fetch("/api/checklists/ranking");
      if (!res.ok) throw new Error("Erro ao carregar ranking");
      return res.json();
    },
    refetchInterval: 5 * 60_000,
  });

  const completeMutation = useMutation({
    mutationFn: async ({ taskId, date }: { taskId: string; date: string }) => {
      const res = await fetch("/api/checklists/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, date }),
      });
      if (!res.ok) throw new Error("Erro ao marcar tarefa");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-checklist-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-ranking"] });
    },
  });

  const uncompleteMutation = useMutation({
    mutationFn: async ({ taskId, date }: { taskId: string; date: string }) => {
      const res = await fetch("/api/checklists/completions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, date }),
      });
      if (!res.ok) throw new Error("Erro ao desmarcar tarefa");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-checklist-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-ranking"] });
    },
  });

  function toggleTask(task: Task) {
    if (!data) return;
    if (task.completed) {
      uncompleteMutation.mutate({ taskId: task.id, date: data.todayDate });
    } else {
      completeMutation.mutate({ taskId: task.id, date: data.todayDate });
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const tasks = data?.tasks ?? [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Group tasks by time_slot
  const grouped = Object.entries(TIME_SLOT_CONFIG)
    .map(([slot, config]) => ({
      slot,
      ...config,
      tasks: tasks.filter((t) => t.time_slot === slot),
    }))
    .filter((g) => g.tasks.length > 0)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 pb-24">
      <PageHeader title="Meu Dia" subtitle="Checklists de hoje" />

      {/* Progress header */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" />
              <span className="font-bold text-lg">
                {completedTasks}/{totalTasks}
              </span>
              <span className="text-sm text-muted-foreground">tarefas</span>
            </div>
            <Badge variant={completedTasks === totalTasks && totalTasks > 0 ? "default" : "secondary"}>
              {data?.earnedPoints ?? 0} / {data?.totalPoints ?? 0} pts
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tasks by time slot */}
      {totalTasks === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma tarefa para hoje</p>
          <p className="text-sm mt-1">Aproveite o dia!</p>
        </div>
      ) : (
        grouped.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.slot} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                  {group.label}
                </h2>
                <span className="text-xs text-muted-foreground">
                  ({group.tasks.filter((t) => t.completed).length}/{group.tasks.length})
                </span>
              </div>
              <div className="space-y-1.5">
                {group.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTask(task)}
                    isLoading={
                      completeMutation.isPending || uncompleteMutation.isPending
                    }
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Weekly Ranking */}
      {ranking && ranking.ranking.length > 0 && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center gap-2 px-1">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
              Ranking da Semana
            </h2>
          </div>
          <Card>
            <CardContent className="p-3 space-y-1">
              {ranking.ranking.map((entry) => {
                const PosIcon = POSITION_ICONS[entry.position - 1] ?? null;
                const posColor = POSITION_COLORS[entry.position - 1] ?? "text-muted-foreground";
                return (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      ranking.current_user === null &&
                      entry.user_id === ranking.ranking.find(() => true)?.user_id
                        ? ""
                        : ""
                    }`}
                  >
                    <div className="w-6 text-center shrink-0">
                      {PosIcon ? (
                        <PosIcon className={`w-4 h-4 mx-auto ${posColor}`} />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">
                          {entry.position}º
                        </span>
                      )}
                    </div>
                    <span className="flex-1 text-sm font-medium truncate">
                      {entry.user_name}
                    </span>
                    <span className="text-sm font-bold tabular-nums">
                      {entry.points} pts
                    </span>
                  </div>
                );
              })}
              {ranking.current_user && (
                <>
                  <div className="border-t border-dashed my-1" />
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/5">
                    <div className="w-6 text-center shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {ranking.current_user.position}º
                      </span>
                    </div>
                    <span className="flex-1 text-sm font-bold text-primary truncate">
                      Você
                    </span>
                    <span className="text-sm font-bold text-primary tabular-nums">
                      {ranking.current_user.points} pts
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Task Row Component ──────────────────────────────────────────────────────

function TaskRow({
  task,
  onToggle,
  isLoading,
}: {
  task: Task;
  onToggle: () => void;
  isLoading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className={`transition-all duration-300 ${
        task.completed ? "bg-emerald-500/5 border-emerald-500/20" : ""
      }`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <button
            onClick={onToggle}
            disabled={isLoading}
            className="mt-0.5 shrink-0 transition-transform active:scale-90"
          >
            {task.completed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground/50" />
            )}
          </button>
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => task.description && setExpanded(!expanded)}
          >
            <p
              className={`text-sm font-medium leading-snug ${
                task.completed
                  ? "line-through text-muted-foreground"
                  : "text-foreground"
              }`}
            >
              {task.title}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {task.checklist_name}
              {task.points > 1 && (
                <span className="ml-1.5 font-semibold">· {task.points} pts</span>
              )}
            </p>
            {expanded && task.description && (
              <p className="text-xs text-muted-foreground mt-2 bg-muted/50 rounded-md p-2">
                {task.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

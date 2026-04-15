"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  Circle,
  CheckCircle2,
  Trophy,
  Medal,
  Star,
  Sunrise,
  Sun,
  Sunset,
  Clock,
  CalendarDays,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";

// ── Types ────────────────────────────────────────────────────────────────────

type Task = {
  id: string;
  title: string;
  description: string | null;
  frequency: "DAILY" | "SPECIFIC_DAYS";
  days_of_week: number[];
  time_slot: string;
  sort_order: number;
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

  // Derived state — safe to compute even while loading (data is undefined → defaults)
  const tasks = data?.tasks ?? [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Milestone toasts — must be before any conditional return
  const prevPercentRef = useRef<number | null>(null);
  useEffect(() => {
    if (totalTasks === 0) return;
    if (prevPercentRef.current === null) {
      prevPercentRef.current = progressPercent;
      return;
    }
    const prev = prevPercentRef.current;
    if (prev < 50 && progressPercent >= 50 && progressPercent < 100) {
      toast.success("Metade do caminho! 🔥", { duration: 3000 });
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#10b981", "#3b82f6", "#f59e0b"]
      });
    } else if (prev < 100 && progressPercent >= 100) {
      toast.success("Dia completo! Arrasou! 🎉", { duration: 4000 });

      const duration = 3000;
      const end = Date.now() + duration;
      const colors = ["#10b981", "#34d399", "#fcd34d"];

      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: colors,
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
    prevPercentRef.current = progressPercent;
  }, [progressPercent, totalTasks]);

  // Animate bar from 0 → actual on first data load — must be before any conditional return
  const [displayPercent, setDisplayPercent] = useState(0);
  const mountAnimDone = useRef(false);
  useEffect(() => {
    if (totalTasks === 0) return;
    if (!mountAnimDone.current) {
      mountAnimDone.current = true;
      const t = setTimeout(() => setDisplayPercent(progressPercent), 80);
      return () => clearTimeout(t);
    }
    setDisplayPercent(progressPercent);
  }, [progressPercent, totalTasks]);

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

  const percentColorClass =
    progressPercent >= 80
      ? "text-emerald-500"
      : progressPercent >= 50
        ? "text-amber-500"
        : "text-muted-foreground";

  // Specific-days tasks always go to the top
  const specificTasks = tasks.filter((t) => t.frequency === "SPECIFIC_DAYS");
  const dailyTasks = tasks.filter((t) => t.frequency !== "SPECIFIC_DAYS");

  // Group daily tasks by time_slot
  const grouped = Object.entries(TIME_SLOT_CONFIG)
    .map(([slot, config]) => ({
      slot,
      ...config,
      tasks: dailyTasks.filter((t) => t.time_slot === slot),
    }))
    .filter((g) => g.tasks.length > 0)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Keyframes for animations */}
      <style>{`
        @keyframes progress-shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes progress-glow {
          0%, 100% { box-shadow: 0 0 6px 0px rgba(16,185,129,0.4); }
          50% { box-shadow: 0 0 16px 3px rgba(16,185,129,0.7); }
        }
        @keyframes scale-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes check-bounce {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes row-complete-glow {
          0% { box-shadow: 0 0 0 rgba(16,185,129,0); }
          30% { box-shadow: 0 0 20px rgba(16,185,129,0.4); transform: scale(1.02); }
          100% { box-shadow: 0 0 0 rgba(16,185,129,0); transform: scale(1); }
        }
      `}</style>

      {/* Sticky progress bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 md:px-8 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <CheckSquare className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm tabular-nums">
              {completedTasks}/{totalTasks}
            </span>
          </div>
          <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full transition-[width] duration-1000 ease-out"
              style={
                progressPercent >= 100
                  ? {
                      width: `${displayPercent}%`,
                      background:
                        "linear-gradient(90deg, #10b981 0%, #34d399 40%, #6ee7b7 60%, #10b981 100%)",
                      backgroundSize: "200% 100%",
                      animation: "progress-shimmer 2s linear infinite, progress-glow 2s ease-in-out infinite",
                    }
                  : {
                      width: `${displayPercent}%`,
                      background:
                        "linear-gradient(90deg, #6366f1 0%, #06b6d4 50%, #10b981 100%)",
                    }
              }
            />
          </div>
          <span className={`text-xs font-bold tabular-nums w-8 text-right shrink-0 transition-colors duration-500 ${percentColorClass}`}>
            {Math.round(progressPercent)}%
          </span>
        </div>
        {/* Pts badge só aparece quando há tarefas */}
        {totalTasks > 0 && (
          <div className="flex justify-end mt-1">
            <Badge variant={completedTasks === totalTasks ? "default" : "secondary"} className="text-[10px]">
              {data?.earnedPoints ?? 0} / {data?.totalPoints ?? 0} pts
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4 md:p-8 space-y-6">
        <PageHeader title="Meu Dia" subtitle="Checklists de hoje" />

      {/* Tasks by time slot */}
      {totalTasks === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma tarefa para hoje</p>
          <p className="text-sm mt-1">Aproveite o dia!</p>
        </div>
      ) : (
        <>
          {/* Specific-day tasks pinned at the top */}
          {specificTasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <CalendarDays className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-amber-500 uppercase tracking-wide">
                  Só Hoje
                </h2>
                <span className="text-xs text-muted-foreground">
                  ({specificTasks.filter((t) => t.completed).length}/{specificTasks.length})
                </span>
              </div>
              <div className="space-y-1.5">
                {specificTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTask(task)}
                    isLoading={completeMutation.isPending || uncompleteMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Daily tasks grouped by time slot */}
          {grouped.map((group) => {
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
                      isLoading={completeMutation.isPending || uncompleteMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </>
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
  const [justCompleted, setJustCompleted] = useState(false);
  const prevCompleted = useRef(task.completed);

  useEffect(() => {
    if (!prevCompleted.current && task.completed) {
      setJustCompleted(true);
      const timer = setTimeout(() => setJustCompleted(false), 1000);
      return () => clearTimeout(timer);
    }
    prevCompleted.current = task.completed;
  }, [task.completed]);

  return (
    <Card
      className={`transition-all duration-300 relative overflow-hidden ${
        task.completed ? "bg-emerald-500/5 border-emerald-500/20" : "hover:border-primary/30"
      } ${justCompleted ? "animate-[row-complete-glow_0.6s_ease-out]" : ""}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <button
            onClick={onToggle}
            disabled={isLoading}
            className={`shrink-0 flex items-center justify-center w-10 h-10 -m-1 rounded-full transition-transform active:scale-90 ${justCompleted ? "animate-[check-bounce_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)]" : ""}`}
          >
            {task.completed ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            ) : (
              <Circle className="w-7 h-7 text-muted-foreground/50 hover:text-primary transition-colors" />
            )}
          </button>
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => task.description && setExpanded(!expanded)}
          >
            <p
              className={`text-sm font-medium leading-snug transition-all duration-300 ${
                task.completed
                  ? "line-through text-muted-foreground opacity-70"
                  : "text-foreground"
              }`}
            >
              {task.title}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {task.checklist_name}
              {task.points > 1 && (
                <span className="ml-1.5 font-semibold text-primary/80">· {task.points} pts</span>
              )}
            </p>
            {expanded && task.description && (
              <p className="text-xs text-muted-foreground mt-2 bg-muted/50 rounded-md p-2 animate-in fade-in slide-in-from-top-1">
                {task.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

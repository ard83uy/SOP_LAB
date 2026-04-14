"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Users,
  CalendarDays,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";

// ── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = {
  task_id: string;
  title: string;
  description: string | null;
  time_slot: string;
  completed: boolean;
  completed_at: string | null;
};

type UserStats = {
  user_id: string;
  user_name: string;
  completed: number;
  total: number;
  tasks: TaskStatus[];
};

type ProfileStats = {
  profile_id: string;
  profile_name: string;
  total_tasks: number;
  users: UserStats[];
};

type DashboardResponse = {
  date: string;
  summary: { total_tasks: number; completed: number; rate: number };
  profiles: ProfileStats[];
};

const TIME_SLOT_LABELS: Record<string, string> = {
  OPENING: "Abertura",
  MIDDAY: "Meio do Dia",
  CLOSING: "Fechamento",
  ALL_DAY: "Sem horário",
};

// ── Page ────────────────────────────────────────────────────────────────────

export default function ChecklistDashboardPage() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [profileFilter, setProfileFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<DashboardResponse>({
    queryKey: ["checklist-dashboard", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/checklists/dashboard?date=${selectedDate}`);
      if (!res.ok) throw new Error("Erro ao carregar dashboard");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const allProfiles = data?.profiles ?? [];

  // Apply filters client-side
  const keyword = search.trim().toLowerCase();
  const filteredProfiles = allProfiles
    .filter((p) => !profileFilter || p.profile_id === profileFilter)
    .map((p) => ({
      ...p,
      users: p.users
        .map((u) => ({
          ...u,
          tasks: keyword
            ? u.tasks.filter(
                (t) =>
                  t.title.toLowerCase().includes(keyword) ||
                  (t.description ?? "").toLowerCase().includes(keyword),
              )
            : u.tasks,
        }))
        .filter((u) => u.tasks.length > 0),
    }))
    .filter((p) => p.users.length > 0);

  const totalTasks = filteredProfiles.reduce((s, p) => s + p.users.reduce((ss, u) => ss + u.total, 0), 0);
  const totalCompleted = filteredProfiles.reduce((s, p) => s + p.users.reduce((ss, u) => ss + u.completed, 0), 0);

  // When keyword is active, recount from filtered tasks
  const filteredTotal = keyword
    ? filteredProfiles.reduce((s, p) => s + p.users.reduce((ss, u) => ss + u.tasks.length, 0), 0)
    : totalTasks;
  const filteredCompleted = keyword
    ? filteredProfiles.reduce(
        (s, p) => s + p.users.reduce((ss, u) => ss + u.tasks.filter((t) => t.completed).length, 0),
        0,
      )
    : totalCompleted;

  const rate = filteredTotal > 0 ? filteredCompleted / filteredTotal : 0;

  const isFiltering = !!profileFilter || !!keyword;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/admin/checklists">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <PageHeader title="Dashboard" subtitle="Acompanhe a execução dos checklists" />
      </div>

      {/* Date picker + Summary */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <Badge variant="outline" className="text-sm px-3 py-1">
            {filteredCompleted} / {filteredTotal} tarefas
          </Badge>
          <Badge
            variant={rate >= 0.8 ? "default" : rate >= 0.5 ? "secondary" : "destructive"}
            className="text-sm px-3 py-1"
          >
            {Math.round(rate * 100)}%
          </Badge>
        </div>
      </div>

      {/* Global progress bar */}
      <div className="w-full bg-muted rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${
            rate >= 0.8 ? "bg-emerald-500" : rate >= 0.5 ? "bg-yellow-500" : "bg-red-500"
          }`}
          style={{ width: `${Math.round(rate * 100)}%` }}
        />
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Profile filter */}
        {allProfiles.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setProfileFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                !profileFilter
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:bg-muted"
              }`}
            >
              Todos os perfis
            </button>
            {allProfiles.map((p) => (
              <button
                key={p.profile_id}
                onClick={() => setProfileFilter(profileFilter === p.profile_id ? null : p.profile_id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  profileFilter === p.profile_id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:bg-muted"
                }`}
              >
                {p.profile_name}
              </button>
            ))}
          </div>
        )}

        {/* Keyword search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por título ou descrição da tarefa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Per-profile cards */}
      {allProfiles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum dado para esta data</p>
          <p className="text-sm mt-1">Verifique se existem checklists ativos com perfis atribuídos</p>
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma tarefa encontrada</p>
          <p className="text-sm mt-1">Tente outros termos ou remova os filtros</p>
          {isFiltering && (
            <button
              onClick={() => { setProfileFilter(null); setSearch(""); }}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        filteredProfiles.map((profile) => (
          <ProfileCard key={profile.profile_id} profile={profile} search={keyword} />
        ))
      )}
    </div>
  );
}

// ── Profile Card ────────────────────────────────────────────────────────────

function ProfileCard({ profile, search }: { profile: ProfileStats; search: string }) {
  const [expanded, setExpanded] = useState(false);
  const isExpanded = expanded || !!search;

  const totalCompleted = search
    ? profile.users.reduce((s, u) => s + u.tasks.filter((t) => t.completed).length, 0)
    : profile.users.reduce((s, u) => s + u.completed, 0);
  const totalTasks = search
    ? profile.users.reduce((s, u) => s + u.tasks.length, 0)
    : profile.users.reduce((s, u) => s + u.total, 0);
  const rate = totalTasks > 0 ? totalCompleted / totalTasks : 0;

  return (
    <Card>
      <CardContent className="p-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center gap-3 text-left"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-bold text-sm">{profile.profile_name}</h3>
              <Badge variant="outline" className="text-[10px]">
                {profile.users.length} usuário{profile.users.length !== 1 ? "s" : ""}
              </Badge>
              <Badge
                variant={rate >= 0.8 ? "default" : rate >= 0.5 ? "secondary" : "destructive"}
                className="text-[10px]"
              >
                {Math.round(rate * 100)}%
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  rate >= 0.8
                    ? "bg-emerald-500"
                    : rate >= 0.5
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${Math.round(rate * 100)}%` }}
              />
            </div>
          </div>
        </button>

        {isExpanded && (
          <div className="border-t px-4 pb-4 space-y-3 pt-3">
            {profile.users.map((user) => (
              <UserRow key={user.user_id} user={user} search={search} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── User Row ────────────────────────────────────────────────────────────────

function UserRow({ user, search }: { user: UserStats; search: string }) {
  const [expanded, setExpanded] = useState(false);
  const isExpanded = expanded || !!search;
  const visibleTasks = user.tasks;
  const visibleCompleted = search
    ? visibleTasks.filter((t) => t.completed).length
    : user.completed;
  const visibleTotal = search ? visibleTasks.length : user.total;
  const rate = visibleTotal > 0 ? visibleCompleted / visibleTotal : 0;

  return (
    <div className="bg-muted/30 rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center gap-3 text-left"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="flex-1 text-sm font-medium truncate">{user.user_name}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {visibleCompleted}/{visibleTotal}
        </span>
        <Badge
          variant={rate >= 0.8 ? "default" : rate >= 0.5 ? "secondary" : "destructive"}
          className="text-[10px]"
        >
          {Math.round(rate * 100)}%
        </Badge>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-1">
          {user.tasks.map((task) => (
            <div
              key={task.task_id}
              className="flex items-center gap-2 text-xs py-1 px-2"
            >
              {task.completed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              )}
              <span
                className={`flex-1 ${task.completed ? "text-muted-foreground line-through" : ""}`}
              >
                {task.title}
              </span>
              <Badge variant="secondary" className="text-[9px]">
                {TIME_SLOT_LABELS[task.time_slot] ?? task.time_slot}
              </Badge>
              {task.completed && task.completed_at && (
                <span className="text-muted-foreground text-[10px] tabular-nums">
                  {new Date(task.completed_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

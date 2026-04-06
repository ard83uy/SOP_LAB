"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChefHat, CheckCircle2, ClipboardList, History, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ── Types ────────────────────────────────────────────────────────────────────

type ProductionItem = {
  prep_item_id: string;
  name: string;
  unit: string;
  target_quantity: number;
  actual_quantity: number;
  to_produce: number;
  shift_handover_id: string;
  is_day_specific: boolean;
  already_produced: number;
};

type TheoreticalItem = {
  prep_item_id: string;
  name: string;
  unit: string;
  effective_target: number;
  last_count: number | null;
  days_since: number | null;
  theoretical_need: number;
};

type TheoreticalStation = {
  station_name: string;
  items: TheoreticalItem[];
  handover_is_today: boolean;
};

type HandoverGroup = {
  date: string;
  handovers: {
    id: string;
    station_name: string;
    user_name: string;
    time: string;
    items: { name: string; unit: string; actual_quantity: number }[];
  }[];
};

type ProductionGroup = {
  date: string;
  logs: {
    id: string;
    item_name: string;
    unit: string;
    produced_quantity: number;
    user_name: string;
    station_name: string;
    time: string;
  }[];
};

// ── Tab Bar ───────────────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
}: {
  active: "producao" | "historico";
  onChange: (t: "producao" | "historico") => void;
}) {
  return (
    <div className="flex border-b border-border mb-6">
      {(
        [
          { id: "producao", label: "Produção", icon: ChefHat },
          { id: "historico", label: "Histórico", icon: History },
        ] as const
      ).map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${
            active === id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmProduceDialog({
  item,
  qty,
  onConfirm,
  onCancel,
}: {
  item: ProductionItem;
  qty: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar produção</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-base">
            Registrar{" "}
            <span className="font-bold text-foreground">
              {qty} {item.unit}
            </span>{" "}
            de <span className="font-bold text-foreground">{item.name}</span>?
          </p>
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            Atenção: após registrado, o lançamento não pode ser editado ou removido.
          </p>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Production Card ───────────────────────────────────────────────────────────

function ProductionCard({
  item,
  isCompleting,
  onRequest,
}: {
  item: ProductionItem;
  isCompleting: boolean;
  onRequest: (qty: number) => void;
}) {
  const [val, setVal] = useState(item.to_produce.toString());

  return (
    <div className="relative">
      <Card
        className={`overflow-hidden border-2 transition-all duration-300 ${
          isCompleting
            ? "border-green-500 shadow-lg shadow-green-200 dark:shadow-green-900/30 scale-[1.01]"
            : "border-destructive/20 shadow-md"
        }`}
      >
        <CardContent className="p-5 sm:p-7 flex flex-col gap-6 sm:flex-row sm:justify-between sm:items-center">
          <div className="flex-1">
            <h3 className="font-bold text-2xl md:text-3xl text-foreground">{item.name}</h3>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <div className="bg-destructive/10 text-destructive font-bold px-4 py-1.5 rounded-lg text-lg">
                Faltam: {item.to_produce} {item.unit}
              </div>
              <p className="text-muted-foreground text-base font-medium">
                Atual: {item.actual_quantity} / Alvo: {item.target_quantity}
                {item.is_day_specific && (
                  <span className="text-amber-600 ml-1 text-sm">(dia específico)</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Input
              className="h-16 text-2xl font-bold w-full sm:w-32 text-center rounded-xl bg-muted/30"
              type="number"
              inputMode="decimal"
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />
            <Button
              size="lg"
              className="h-16 px-6 font-bold text-xl whitespace-nowrap rounded-xl shadow-md"
              onClick={() => {
                const num = parseFloat(val);
                if (num > 0) onRequest(num);
              }}
            >
              Realizado
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Success animation overlay */}
      {isCompleting && (
        <div className="absolute inset-0 bg-green-500/95 rounded-xl flex flex-col items-center justify-center gap-2 z-10 animate-in fade-in zoom-in-90 duration-200">
          <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />
          <span className="text-white font-bold text-lg tracking-wide">Registrado!</span>
        </div>
      )}
    </div>
  );
}

// ── Production Dashboard Tab ──────────────────────────────────────────────────

function ProductionDashboard() {
  const queryClient = useQueryClient();
  const [confirmState, setConfirmState] = useState<{ item: ProductionItem; qty: number } | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["production-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/production/dashboard");
      if (!res.ok) throw new Error("Falha ao carregar dashboard de produção");
      return res.json();
    },
    refetchInterval: 1000 * 60,
  });

  const mutation = useMutation({
    mutationFn: async (payload: {
      prep_item_id: string;
      shift_handover_id: string;
      produced_quantity: number;
    }) => {
      const res = await fetch("/api/production/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Falha ao registrar produção");
      }
      return res.json();
    },
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: ["production-dashboard"] });
      const previous = queryClient.getQueryData(["production-dashboard"]);

      queryClient.setQueryData(["production-dashboard"], (old: any) => {
        if (!old) return old;
        const newStations = old.stations
          .map((s: any) => ({
            ...s,
            items: s.items.filter((i: any) => i.prep_item_id !== newItem.prep_item_id),
          }))
          .filter((s: any) => s.items.length > 0);
        return { ...old, stations: newStations };
      });

      return { previous };
    },
    onError: (err, _newItem, context) => {
      queryClient.setQueryData(["production-dashboard"], context?.previous);
      toast.error(err.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["production-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["production-history"] });
    },
  });

  const handleConfirm = () => {
    if (!confirmState) return;
    const { item, qty } = confirmState;
    setConfirmState(null);
    setCompletingId(item.prep_item_id);

    setTimeout(() => {
      mutation.mutate({
        prep_item_id: item.prep_item_id,
        shift_handover_id: item.shift_handover_id,
        produced_quantity: qty,
      });
      setCompletingId(null);
    }, 700);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 font-medium">{(error as Error).message}</div>;
  }

  const stations = data?.stations || [];
  const serverTime = data?.server_time;

  if (stations.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center text-center gap-6 py-12">
          <div className="bg-green-100 dark:bg-green-900/30 p-8 rounded-full">
            <CheckCircle2 className="w-20 h-20 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Tudo em dia!</h2>
            <p className="text-muted-foreground text-lg mt-2 max-w-sm">
              Todos os insumos atingiram o Par Level de hoje.
            </p>
          </div>
        </div>
        <TheoreticalNeeds />
      </>
    );
  }

  return (
    <>
      {serverTime && (
        <p className="text-sm text-muted-foreground mb-6">Horário do servidor: {serverTime}</p>
      )}

      <div className="space-y-12 pb-16">
        {stations.map((station: any, sIdx: number) => (
          <div key={sIdx} className="space-y-5">
            <h2 className="text-2xl font-bold border-b-2 pb-3 flex items-center gap-3">
              <ChefHat className="w-7 h-7 text-primary" />
              {station.station_name}
            </h2>
            <div className="grid gap-5">
              {station.items.map((item: ProductionItem) => (
                <ProductionCard
                  key={item.prep_item_id}
                  item={item}
                  isCompleting={completingId === item.prep_item_id}
                  onRequest={(qty) => setConfirmState({ item, qty })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <TheoreticalNeeds />

      {confirmState && (
        <ConfirmProduceDialog
          item={confirmState.item}
          qty={confirmState.qty}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </>
  );
}

// ── Theoretical Needs ─────────────────────────────────────────────────────────

function TheoreticalNeeds() {
  const { data, isLoading } = useQuery<{ stations: TheoreticalStation[] }>({
    queryKey: ["production-theoretical"],
    queryFn: async () => {
      const res = await fetch("/api/production/theoretical");
      if (!res.ok) throw new Error();
      return res.json();
    },
    refetchInterval: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 mt-10">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    );
  }

  const stations = data?.stations ?? [];
  if (stations.length === 0) return null;

  return (
    <div className="mt-10 space-y-5">
      <div className="flex items-center gap-2 border-b pb-3">
        <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        <h2 className="text-lg font-bold text-amber-700 dark:text-amber-400">Necessário Teórico</h2>
        <span className="text-xs text-muted-foreground font-normal ml-1">
          — estimativa com base na última contagem
        </span>
      </div>

      <div className="grid gap-3">
        {stations.flatMap((station) =>
          station.items.map((item) => {
            const noCount = item.last_count === null;
            const stale = !station.handover_is_today;

            let countLabel: string;
            if (noCount) {
              countLabel = "sem contagem registrada";
            } else if (item.days_since === 0) {
              countLabel = `última contagem hoje: ${item.last_count} ${item.unit}`;
            } else if (item.days_since === 1) {
              countLabel = `última contagem ontem: ${item.last_count} ${item.unit}`;
            } else {
              countLabel = `última contagem há ${item.days_since} dias: ${item.last_count} ${item.unit}`;
            }

            return (
              <Card
                key={`${station.station_name}-${item.prep_item_id}`}
                className="border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/20"
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base">{item.name}</span>
                      <span className="text-xs text-muted-foreground">· {station.station_name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{countLabel}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-extrabold text-lg text-amber-700 dark:text-amber-400">
                      ~{item.theoretical_need} {item.unit}
                    </p>
                    {stale && item.days_since !== null && item.days_since > 0 && (
                      <p className="text-[10px] text-amber-600/70 dark:text-amber-500/70">estimado</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────

function HistoryHandovers() {
  const { data, isLoading, error } = useQuery<{ groups: HandoverGroup[] }>({
    queryKey: ["handover-history"],
    queryFn: async () => {
      const res = await fetch("/api/handovers");
      if (!res.ok) throw new Error("Falha ao carregar contagens");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500">{(error as Error).message}</p>;
  }

  const groups = data?.groups ?? [];

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <ClipboardList className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Nenhuma contagem nos últimos 30 dias.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.date}>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
            {group.date}
          </p>
          <div className="space-y-2">
            {group.handovers.map((h) => (
              <Card key={h.id} className="bg-card">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-semibold text-sm">{h.station_name}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {h.time} · {h.user_name}
                    </span>
                  </div>
                  <ul className="space-y-0.5">
                    {h.items.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex justify-between text-xs text-muted-foreground"
                      >
                        <span>{item.name}</span>
                        <span className="font-medium text-foreground">
                          {item.actual_quantity} {item.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryProduction() {
  const { data, isLoading, error } = useQuery<{ groups: ProductionGroup[] }>({
    queryKey: ["production-history"],
    queryFn: async () => {
      const res = await fetch("/api/production/log");
      if (!res.ok) throw new Error("Falha ao carregar produções");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500">{(error as Error).message}</p>;
  }

  const groups = data?.groups ?? [];

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <ChefHat className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Nenhuma produção nos últimos 30 dias.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.date}>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
            {group.date}
          </p>
          <div className="space-y-2">
            {group.logs.map((log) => (
              <Card key={log.id} className="bg-card">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{log.item_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.station_name} · {log.user_name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm text-primary">
                        {log.produced_quantity} {log.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">{log.time}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryView() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h2 className="text-base font-bold mb-4 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          Contagens
        </h2>
        <HistoryHandovers />
      </div>
      <div>
        <h2 className="text-base font-bold mb-4 flex items-center gap-2">
          <ChefHat className="w-4 h-4 text-primary" />
          Produções
        </h2>
        <HistoryProduction />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductionPage() {
  const [tab, setTab] = useState<"producao" | "historico">("producao");

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-4">
        {tab === "producao" ? "Dashboard de Produção" : "Histórico"}
      </h1>
      <TabBar active={tab} onChange={setTab} />
      {tab === "producao" ? <ProductionDashboard /> : <HistoryView />}
    </div>
  );
}

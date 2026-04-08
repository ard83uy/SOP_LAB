"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChefHat, CheckCircle2, ClipboardList, History, TrendingUp, MessageSquareText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DecimalInput } from "@/components/decimal-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/PageHeader";

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

type ProductionLogEntry = { user_name: string; time: string; quantity: number };
type ProductionGroup = {
  date: string;
  handovers: {
    handover_id: string;
    station_name: string;
    items: {
      name: string;
      unit: string;
      requested: number;
      produced: number;
      production_logs: ProductionLogEntry[];
    }[];
  }[];
};

// ── Date helpers ─────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD in São Paulo timezone, with optional day offset */
function spDateISO(offset = 0): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Converts YYYY-MM-DD to DD/MM/YYYY (API format) */
function isoToLabel(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Formats YYYY-MM-DD for display: "05/04/2025" */
function isoToDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

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

// ── Date Picker Modal ─────────────────────────────────────────────────────────

function DatePickerModal({
  selectedDate,
  onSelect,
  onClose,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(selectedDate);
  const today = spDateISO(0);
  const yesterday = spDateISO(-1);
  const minDate = spDateISO(-30);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selecionar data da contagem</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Escolha o dia da contagem de estoque que será usado como base para produção.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setDraft(yesterday)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                draft === yesterday
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Ontem · {isoToDisplay(yesterday)}
            </button>
            <button
              onClick={() => setDraft(today)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                draft === today
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Hoje · {isoToDisplay(today)}
            </button>
          </div>
          <input
            type="date"
            value={draft}
            min={minDate}
            max={today}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { onSelect(draft); onClose(); }}>Aplicar</Button>
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
  const toProduce = parseFloat(item.to_produce.toFixed(3));
  const [val, setVal] = useState(toProduce.toString());

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
                Faltam: {toProduce} {item.unit}
              </div>
              <p className="text-muted-foreground text-base font-medium">
                Atual: {parseFloat(item.actual_quantity.toFixed(3))} / Utilização média: {parseFloat(item.target_quantity.toFixed(3))}
                {item.is_day_specific && (
                  <span className="text-amber-600 ml-1 text-sm">(dia específico)</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <DecimalInput
              className="h-16 text-2xl font-bold w-full sm:w-32 text-center rounded-xl bg-muted/30"
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
  const [selectedDate, setSelectedDate] = useState(() => spDateISO(-1));
  const [dateModalOpen, setDateModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["production-dashboard", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/production/dashboard?date=${isoToLabel(selectedDate)}`);
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
  const today = spDateISO(0);
  const yesterday = spDateISO(-1);
  const isYesterday = selectedDate === yesterday;
  const isToday = selectedDate === today;
  const dateLabel = isYesterday ? "Ontem" : isToday ? "Hoje" : isoToDisplay(selectedDate);

  const dateSelectorButton = (
    <button
      onClick={() => setDateModalOpen(true)}
      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <CalendarDays className="w-4 h-4" />
      <span>Contagem de <strong className="text-foreground">{dateLabel} · {isoToDisplay(selectedDate)}</strong></span>
    </button>
  );

  const theoretical = data?.theoretical || [];

  const theoreticalSection = theoretical.length > 0 && (
    <div className="mt-10 space-y-5">
      <div className="flex items-center gap-2 border-b pb-3">
        <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        <h2 className="text-lg font-bold text-amber-700 dark:text-amber-400">Necessidade Teórica</h2>
        <span className="text-xs text-muted-foreground font-normal ml-1">
          — Itens não contados. Valores estimados com base na utilização média
        </span>
      </div>
      <div className="grid gap-3">
        {theoretical.flatMap((station: any) =>
          station.items.map((item: any) => (
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
                </div>
                <div className="text-right shrink-0">
                  <p className="font-extrabold text-lg text-amber-700 dark:text-amber-400">
                    ~{parseFloat(item.effective_target.toFixed(3))} {item.unit}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  if (stations.length === 0) {
    return (
      <>
        <div className="mb-4">{dateSelectorButton}</div>
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
        {theoreticalSection}
        {dateModalOpen && (
          <DatePickerModal
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            onClose={() => setDateModalOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        {dateSelectorButton}
        {serverTime && (
          <p className="text-xs text-muted-foreground">Servidor: {serverTime}</p>
        )}
      </div>

      <div className="space-y-12 pb-16">
        {stations.map((station: any, sIdx: number) => (
          <div key={sIdx} className="space-y-5">
            <h2 className="text-2xl font-bold border-b-2 pb-3 flex items-center gap-3">
              <ChefHat className="w-7 h-7 text-primary" />
              {station.station_name}
            </h2>
            {station.note && (
              <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <MessageSquareText className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 dark:text-blue-300">{station.note}</p>
              </div>
            )}
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

      {theoreticalSection}

      {confirmState && (
        <ConfirmProduceDialog
          item={confirmState.item}
          qty={confirmState.qty}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {dateModalOpen && (
        <DatePickerModal
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          onClose={() => setDateModalOpen(false)}
        />
      )}
    </>
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
                          {parseFloat(item.actual_quantity.toFixed(3))} {item.unit}
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
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
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
        <div key={group.date} className="space-y-3">
          <h2 className="text-lg font-bold text-muted-foreground">{group.date}</h2>
          {group.handovers.map((handover) => {
            const hasRequested = handover.items.some((i) => i.requested > 0);
            return (
              <Card key={handover.handover_id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-semibold">{handover.station_name}</p>
                  <div className="rounded-lg border overflow-hidden">
                    <div className={`grid ${hasRequested ? "grid-cols-[1fr_auto_auto]" : "grid-cols-[1fr_auto]"} gap-x-4 px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide`}>
                      <span>Insumo</span>
                      {hasRequested && <span className="text-right">Pedido</span>}
                      <span className="text-right">Produzido</span>
                    </div>
                    {handover.items.map((item, idx) => (
                      <div key={idx} className={`grid ${hasRequested ? "grid-cols-[1fr_auto_auto]" : "grid-cols-[1fr_auto]"} gap-x-4 px-4 py-3 border-t items-start`}>
                        <div>
                          <span className="font-medium text-sm">{item.name}</span>
                          <span className="text-xs text-muted-foreground ml-1">({item.unit})</span>
                          {item.production_logs.map((pl, pIdx) => (
                            <p key={pIdx} className="text-xs text-muted-foreground mt-0.5">
                              {pl.user_name} · {pl.time}
                            </p>
                          ))}
                        </div>
                        {hasRequested && (
                          <span className="text-right font-semibold tabular-nums text-sm pt-0.5">
                            {item.requested > 0 ? `${item.requested} ${item.unit}` : "—"}
                          </span>
                        )}
                        <span className={`text-right font-semibold tabular-nums text-sm pt-0.5 ${
                          item.produced >= item.requested && item.requested > 0
                            ? "text-green-600"
                            : item.produced > 0
                              ? "text-amber-600"
                              : "text-muted-foreground"
                        }`}>
                          {item.produced > 0 ? `${item.produced} ${item.unit}` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
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

  const getTitle = () => {
    if (tab === "producao") return "Dashboard de Produção";
    return "Histórico de Produção";
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <PageHeader title={getTitle()} />
      <TabBar active={tab} onChange={setTab} />
      {tab === "producao" ? (
        <ProductionDashboard />
      ) : (
        <HistoryView />
      )}
    </div>
  );
}

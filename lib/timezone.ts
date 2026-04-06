const TZ = "America/Sao_Paulo";

/** Current date/time in São Paulo timezone */
export function nowSP(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
}

/** Day of week (0=Sun … 6=Sat) in São Paulo timezone */
export function todayDowSP(): number {
  return nowSP().getDay();
}

/** Formatted date/time string for display: "Sáb, 05/04 — 19:32" */
export function formatSP(date?: Date): string {
  const d = date ?? new Date();
  return d.toLocaleDateString("pt-BR", {
    timeZone: TZ,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** ISO string of current SP time (for JSON responses) */
export function nowSPISO(): string {
  return nowSP().toISOString();
}

/** "15/04/2024" in SP timezone */
export function dateLabelSP(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** "14:30" in SP timezone */
export function timeLabelSP(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

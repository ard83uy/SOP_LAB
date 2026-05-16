"use client";

import { useQuery } from "@tanstack/react-query";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";

type ChangelogSection = { heading: string; items: string[] };
type ChangelogEntry = {
  version: string;
  date: string | null;
  intro: string | null;
  sections: ChangelogSection[];
};

const SECTION_STYLES: Record<string, string> = {
  Added: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Changed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Fixed: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Removed: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  Deprecated: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  Security: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  Migration: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
};

export function VersionBadge() {
  const [open, setOpen] = useState(false);
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

  const { data, isLoading } = useQuery<{ entries: ChangelogEntry[] }>({
    queryKey: ["changelog"],
    queryFn: async () => {
      const res = await fetch("/api/changelog");
      if (!res.ok) throw new Error("Falha ao carregar changelog");
      return res.json();
    },
    enabled: open,
    staleTime: 1000 * 60 * 60,
  });

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-tight hover:bg-primary/15 transition-colors"
        aria-label={`Versão ${version} — ver mudanças`}
      >
        v{version}
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-200" />
        <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(640px,calc(100vw-2rem))] max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl outline-none flex flex-col data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-200">

          <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-base font-extrabold tracking-tight truncate">
                  Novidades do SOP
                </DialogPrimitive.Title>
                <p className="text-xs text-muted-foreground">Versão atual: v{version}</p>
              </div>
            </div>
            <DialogPrimitive.Close
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="overflow-y-auto px-6 py-5 flex-1">
            {isLoading ? (
              <div className="space-y-4">
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                <div className="h-3 w-full bg-muted rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-muted rounded animate-pulse" />
              </div>
            ) : !data?.entries.length ? (
              <p className="text-sm text-muted-foreground">Nenhuma entrada no changelog ainda.</p>
            ) : (
              <ol className="space-y-6">
                {data.entries.map((entry) => (
                  <li key={entry.version} className="space-y-3">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-base font-extrabold tracking-tight">v{entry.version}</span>
                      {entry.date && (
                        <span className="text-xs font-semibold text-muted-foreground">
                          {entry.date}
                        </span>
                      )}
                    </div>
                    {entry.intro && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{entry.intro}</p>
                    )}
                    {entry.sections.map((section) => (
                      <div key={section.heading} className="space-y-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${SECTION_STYLES[section.heading] ?? "bg-muted text-muted-foreground"}`}>
                          {section.heading}
                        </span>
                        <ul className="space-y-1 pl-1">
                          {section.items.map((item, idx) => (
                            <li key={idx} className="text-sm leading-relaxed flex gap-2">
                              <span className="text-muted-foreground/60 shrink-0">·</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </li>
                ))}
              </ol>
            )}
          </div>

        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

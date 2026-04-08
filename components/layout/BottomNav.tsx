"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useClerk } from "@clerk/nextjs";
import {
  ClipboardList,
  CheckSquare,
  ChefHat,
  Settings,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

// All possible nav entries, keyed by module name
// adminHref: overrides href for ADMIN/MANAGER roles
const MODULE_LINKS: Record<string, { href: string; adminHref?: string; label: string; icon: LucideIcon }> = {
  stations:   { href: "/admin/stations",   label: "Praças",     icon: LayoutDashboard },
  handover:   { href: "/staff/handover",   label: "Contagem",   icon: ClipboardList },
  production: { href: "/staff/production", label: "Produção",   icon: ChefHat },
  prep_items: { href: "/admin/prep-items", label: "Insumos",    icon: Package },
  fichas:     { href: "/staff/fichas",     adminHref: "/admin/fichas-tecnicas", label: "Fichas",     icon: BookOpen },
  checklists: { href: "/staff/checklists", adminHref: "/admin/checklists", label: "Checklists", icon: CheckSquare },
  settings:   { href: "/admin/settings",   label: "Config",     icon: Settings },
};

// Fallback for ADMIN/MANAGER with no profile (all modules)
// stations is accessed via Config, not the bottom nav for admin
const ADMIN_MODULES = ["handover", "production", "prep_items", "fichas", "checklists", "settings"];

export function BottomNav() {
  const pathname = usePathname();
  const { signOut } = useClerk();

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/users/me");
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-center pb-[env(safe-area-inset-bottom)]">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const getLinks = () => {
    const role: string = user.role;
    const modules: Record<string, boolean> = user.profile?.allowed_modules ?? {};
    const isAdmin = role === "ADMIN" || role === "MANAGER";

    const resolveLink = (key: string) => {
      const entry = MODULE_LINKS[key];
      if (!entry) return null;
      // For admin/manager roles, use adminHref if available; also skip stations (it lives in Config)
      if (isAdmin) {
        if (key === "stations") return null; // accessed via /admin/settings
        const href = entry.adminHref ?? entry.href;
        return { ...entry, href };
      }
      return entry;
    };

    // ADMIN/MANAGER: if no profile, show everything; otherwise respect profile
    if (isAdmin) {
      const keys = Object.keys(modules).length > 0
        ? ADMIN_MODULES.filter((m) => modules[m])
        : ADMIN_MODULES;
      return keys.map(resolveLink).filter(Boolean) as typeof MODULE_LINKS[string][];
    }

    // Everyone else: driven entirely by profile allowed_modules
    return Object.entries(modules)
      .filter(([, enabled]) => enabled)
      .map(([key]) => resolveLink(key))
      .filter(Boolean) as typeof MODULE_LINKS[string][];
  };

  const links = getLinks();
  if (links.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname.startsWith(link.href) ||
            (link.adminHref ? pathname.startsWith(link.adminHref) : false);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-lg mx-0.5 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${isActive ? "bg-primary/12" : ""}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-semibold leading-none ${isActive ? "text-primary" : ""}`}>
                {link.label}
              </span>
            </Link>
          );
        })}
        <button
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-lg mx-0.5 text-muted-foreground hover:text-destructive transition-colors"
        >
          <div className="p-1.5 rounded-lg">
            <LogOut className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-semibold leading-none">Sair</span>
        </button>
      </div>
    </nav>
  );
}

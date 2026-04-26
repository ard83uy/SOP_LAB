"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  CheckSquare,
  ChefHat,
  Settings,
  LayoutDashboard,
  Package,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

const MODULE_LINKS: Record<string, { href: string; adminHref?: string; label: string; icon: LucideIcon }> = {
  stations:   { href: "/admin/stations",   label: "Praças",     icon: LayoutDashboard },
  handover:   { href: "/staff/handover",   label: "Contagem",   icon: ClipboardList },
  production: { href: "/staff/production", label: "Produção",   icon: ChefHat },
  prep_items: { href: "/admin/prep-items", label: "Insumos",    icon: Package },
  fichas:     { href: "/staff/fichas",     adminHref: "/admin/fichas-tecnicas", label: "Fichas",     icon: BookOpen },
  checklists: { href: "/staff/checklists", adminHref: "/admin/checklists",      label: "Checklists", icon: CheckSquare },
  settings:   { href: "/admin/settings",   label: "Config",     icon: Settings },
};

// Fallback for ADMIN/MANAGER with no profile — stations lives inside Config, not nav
const ADMIN_MODULES = ["handover", "production", "prep_items", "fichas", "checklists", "settings"];

export type NavLink = {
  href: string;
  adminHref?: string;
  label: string;
  icon: LucideIcon;
};

export function useNavLinks() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/users/me");
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  });

  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  const resolveLink = (key: string): NavLink | null => {
    const entry = MODULE_LINKS[key];
    if (!entry) return null;
    if (isAdmin) {
      if (key === "stations") return null;
      return { ...entry, href: entry.adminHref ?? entry.href };
    }
    return entry;
  };

  const getLinks = (): NavLink[] => {
    if (!user) return [];
    const modules: Record<string, boolean> = user.profile?.allowed_modules ?? {};

    if (isAdmin) {
      const keys =
        Object.keys(modules).length > 0
          ? ADMIN_MODULES.filter((m) => modules[m])
          : ADMIN_MODULES;
      return keys.map(resolveLink).filter(Boolean) as NavLink[];
    }

    return Object.entries(modules)
      .filter(([, enabled]) => enabled)
      .map(([key]) => resolveLink(key))
      .filter(Boolean) as NavLink[];
  };

  return { user, isLoading, isAdmin, links: getLinks() };
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useClerk } from "@clerk/nextjs";
import { ClipboardList, ChefHat, Users, LayoutDashboard, Loader2, LogOut, Package, BookOpen } from "lucide-react";

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

  const role = user.role;

  const getLinks = () => {
    switch (role) {
      case "ADMIN":
      case "MANAGER":
        return [
          { href: "/admin/stations", label: "Praças", icon: LayoutDashboard },
          { href: "/staff/handover", label: "Contagem", icon: ClipboardList },
          { href: "/staff/production", label: "Produção", icon: ChefHat },
          { href: "/admin/prep-items", label: "Insumos", icon: Package },
          { href: "/admin/fichas-tecnicas", label: "Fichas", icon: BookOpen },
          { href: "/admin/team", label: "Equipe", icon: Users },
        ];
      case "STATION_LEADER":
      case "STAFF":
        return [
          { href: "/staff/handover", label: "Contagem", icon: ClipboardList },
        ];
      case "PREP_KITCHEN":
        return [
          { href: "/staff/production", label: "Produção", icon: ChefHat },
        ];
      default:
        return [];
    }
  };

  const links = getLinks();
  if (links.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname.startsWith(link.href);
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

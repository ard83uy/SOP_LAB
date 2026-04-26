"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Loader2, LogOut } from "lucide-react";
import { useNavLinks, type NavLink } from "./useNavLinks";

export function BottomNav() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user, isLoading, links } = useNavLinks();

  if (isLoading) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-center pb-[env(safe-area-inset-bottom)]">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || links.length === 0) return null;

  const isActive = (link: NavLink) =>
    pathname.startsWith(link.href) ||
    (link.adminHref ? pathname.startsWith(link.adminHref) : false);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-1">
        {links.map((link) => {
          const Icon = link.icon;
          const active = isActive(link);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-lg mx-0.5 transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${active ? "bg-primary/12" : ""}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-semibold leading-none ${active ? "text-primary" : ""}`}>
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

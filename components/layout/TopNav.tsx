"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ChefHat, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useNavLinks, type NavLink } from "./useNavLinks";
import { VersionBadge } from "./VersionBadge";

export function TopNav() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user, links } = useNavLinks();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (link: NavLink) =>
    pathname.startsWith(link.href) ||
    (link.adminHref ? pathname.startsWith(link.adminHref) : false);

  return (
    <header className="sticky top-0 z-50 h-16 bg-card/90 backdrop-blur-xl border-b border-border">
      <div className="flex items-center h-full px-4 md:px-6 gap-4 max-w-screen-2xl mx-auto">

        {/* Brand */}
        <Link
          href="/admin/settings"
          className="flex items-center gap-2.5 shrink-0 group"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/15 transition-colors">
            <ChefHat className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold tracking-tight text-foreground">SOP</span>
            <VersionBadge />
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1 ml-4">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  active
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
                {active && (
                  <span className="absolute -bottom-[13px] left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop user + sign out */}
        <div className="hidden md:flex items-center gap-3 ml-auto">
          {user && (
            <div className="flex items-center gap-2.5 pr-3 border-r border-border">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-extrabold flex items-center justify-center">
                {user.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="text-right leading-tight">
                <p className="text-xs font-bold text-foreground">{user.name}</p>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {user.profile?.name ?? user.role}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Sair"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden lg:inline">Sair</span>
          </button>
        </div>

        {/* Mobile: hamburger */}
        <div className="flex md:hidden items-center ml-auto">
          <DialogPrimitive.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DialogPrimitive.Trigger
              aria-label="Abrir menu"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Menu className="w-5 h-5" />
            </DialogPrimitive.Trigger>

            <DialogPrimitive.Portal>
              <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
              <DialogPrimitive.Popup className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col shadow-xl outline-none duration-200 data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left">

                <div className="flex items-center justify-between px-4 h-16 border-b border-border shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <ChefHat className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-extrabold tracking-tight">SOP</span>
                    <VersionBadge />
                  </div>
                  <DialogPrimitive.Close className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                    <X className="w-4 h-4" />
                  </DialogPrimitive.Close>
                </div>

                <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
                  {links.map((link) => {
                    const Icon = link.icon;
                    const active = isActive(link);
                    return (
                      <DialogPrimitive.Close
                        key={link.href}
                        nativeButton={false}
                        render={
                          <Link
                            href={link.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                              active
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            {link.label}
                          </Link>
                        }
                      />
                    );
                  })}
                </nav>

                <div className="p-3 border-t border-border pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                  {user && (
                    <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-extrabold flex items-center justify-center">
                        {user.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          {user.profile?.name ?? user.role}
                        </p>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => signOut({ redirectUrl: "/sign-in" })}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
                  >
                    <LogOut className="w-5 h-5" />
                    Sair
                  </button>
                </div>

              </DialogPrimitive.Popup>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </div>

      </div>
    </header>
  );
}

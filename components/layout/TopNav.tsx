"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ChefHat, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useNavLinks, type NavLink } from "./useNavLinks";

export function TopNav() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user, links } = useNavLinks();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (link: NavLink) =>
    pathname.startsWith(link.href) ||
    (link.adminHref ? pathname.startsWith(link.adminHref) : false);

  return (
    <header className="sticky top-0 z-50 h-14 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="flex items-center h-full px-4 gap-3 max-w-screen-2xl mx-auto">

        {/* Brand */}
        <Link
          href="/admin/settings"
          className="flex items-center gap-2 shrink-0 mr-2"
        >
          <ChefHat className="w-5 h-5 text-primary" />
          <span className="text-sm font-extrabold tracking-tight text-foreground">SOP</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop: user + sign out */}
        <div className="hidden md:flex items-center gap-2 ml-auto">
          {user && (
            <span className="text-xs font-semibold text-muted-foreground">
              {user.name}
            </span>
          )}
          <button
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
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

                {/* Drawer header */}
                <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-primary" />
                    <span className="text-sm font-extrabold tracking-tight">SOP</span>
                  </div>
                  <DialogPrimitive.Close className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                    <X className="w-4 h-4" />
                  </DialogPrimitive.Close>
                </div>

                {/* Drawer links */}
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

                {/* Drawer footer: user + sign out */}
                <div className="p-3 border-t border-border pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                  {user && (
                    <div className="px-3 py-2 mb-1">
                      <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold leading-none mt-0.5">
                        Online
                      </p>
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

"use client";

import { useUser } from "@clerk/nextjs";
import { User } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  const { user } = useUser();

  return (
    <div className="flex flex-col gap-1 mb-8 w-full">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          {title}
        </h1>
        
        <div className="flex items-center gap-4">
          {children}
          {user && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right flex flex-col">
                <span className="text-xs font-bold text-foreground leading-tight">
                  {user.fullName || user.firstName || user.username || user.primaryEmailAddress?.emailAddress?.split('@')[0] || "Usuário"}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight uppercase font-semibold">
                  Online
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
                <User className="w-5 h-5 text-primary" />
              </div>
            </div>
          )}
        </div>
      </div>
      {subtitle && (
        <p className="text-muted-foreground text-sm font-medium mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}

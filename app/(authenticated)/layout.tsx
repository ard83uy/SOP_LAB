import { ReactNode } from "react";
import { AppNav } from "@/components/layout/AppNav";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <AppNav />
      {/*
        pb-16 reserves space for the BottomNav (staff, mobile).
        md:pb-0 removes it on desktop where the TopNav is at the top.
      */}
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
    </div>
  );
}

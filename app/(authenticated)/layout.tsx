import { ReactNode } from "react";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 pb-16">{children}</main>
      <BottomNav />
    </div>
  );
}

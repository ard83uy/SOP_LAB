import Link from "next/link";
import { Store, ArrowRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function LandingPage() {
  const { userId } = await auth();

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { clerk_user_id: userId },
      select: { role: true },
    });
    const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";
    redirect(isAdmin ? "/admin/checklists" : "/staff/checklists");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative max-w-sm w-full space-y-10 text-center">
        {/* Icon */}
        <div className="flex items-center justify-center">
          <div className="bg-primary p-5 rounded-2xl shadow-lg shadow-primary/30">
            <Store className="w-12 h-12 text-primary-foreground" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest mb-2">
            <Flame className="w-3 h-3" />
            Back-of-House
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            SOP Mobile
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Padronização, processos e performance para seu restaurante
          </p>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Link href="/sign-in">
            <Button
              size="lg"
              className="w-full h-14 text-base font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Entrar no Sistema
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

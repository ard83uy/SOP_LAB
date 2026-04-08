"use client";

import { Users, ChevronRight, UserCog, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";

const settingsItems = [
  {
    href: "/admin/settings/profiles",
    icon: UserCog,
    label: "Perfis de Usuário",
    description: "Crie e gerencie perfis que controlam o acesso às funcionalidades",
  },
  {
    href: "/admin/team",
    icon: Users,
    label: "Equipe",
    description: "Gerencie os colaboradores e seus acessos",
  },
  {
    href: "/admin/stations",
    icon: LayoutDashboard,
    label: "Praças",
    description: "Gerencie as praças e seus insumos",
  },
];

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Configurações"
        subtitle="Gerencie as configurações do sistema"
      />

      <div className="grid gap-3">
        {settingsItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-xl shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base">{item.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

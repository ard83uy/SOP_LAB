"use client";

import * as Icons from "lucide-react";
import { LayoutDashboard } from "lucide-react";

interface StationIconProps {
  iconName?: string;
  className?: string;
}

export function StationIcon({ iconName = "UtensilsCrossed", className = "w-6 h-6" }: StationIconProps) {
  const IconComponent = Icons[iconName as keyof typeof Icons] as any;

  if (!IconComponent) {
    return <LayoutDashboard className={className} />;
  }

  return <IconComponent className={className} />;
}

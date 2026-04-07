"use client";

import { useState } from "react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Popular kitchen-related icons
const POPULAR_ICONS = [
  "UtensilsCrossed",
  "Flame",
  "Beef",
  "Fish",
  "Salad",
  "Wine",
  "Coffee",
  "Candy",
  "Egg",
  "Wheat",
  "Knife",
  "ChefHat",
  "Pizza",
  "Apple",
  "Carrot",
  "Soup",
  "Utensils",
  "Croissant",
  "Sandwich",
  "Popcorn",
  "IceCream",
  "Citrus",
  "Zap",
  "Droplet",
  "Wind",
  "Cloud",
  "Sun",
  "Moon",
  "Star",
  "Heart",
  "Smile",
  "AlertCircle",
] as const;

interface IconPickerProps {
  value?: string;
  onSelect: (icon: string) => void;
}

export function IconPicker({ value = "UtensilsCrossed", onSelect }: IconPickerProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filteredIcons = POPULAR_ICONS.filter((icon) =>
    icon.toLowerCase().includes(search.toLowerCase())
  );

  const SelectedIcon = Icons[value as keyof typeof Icons] as any;

  if (!open) {
    return (
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full justify-start text-left font-normal"
      >
        <div className="flex items-center gap-2">
          {SelectedIcon ? (
            <SelectedIcon className="w-4 h-4" />
          ) : (
            <Icons.UtensilsCrossed className="w-4 h-4" />
          )}
          <span className="text-sm">{value || "Selecionar ícone"}</span>
        </div>
      </Button>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card">
      <Input
        placeholder="Buscar ícone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8"
        autoFocus
      />
      <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
        {filteredIcons.map((iconName) => {
          const IconComponent = Icons[iconName as keyof typeof Icons] as any;
          return (
            <button
              key={iconName}
              onClick={() => {
                onSelect(iconName);
                setOpen(false);
                setSearch("");
              }}
              className={cn(
                "p-2 rounded-md hover:bg-accent transition-colors flex items-center justify-center",
                value === iconName && "bg-primary text-primary-foreground"
              )}
              title={iconName}
            >
              {IconComponent && <IconComponent className="w-5 h-5" />}
            </button>
          );
        })}
      </div>
      {filteredIcons.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum ícone encontrado
        </p>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(false)}
        className="w-full"
      >
        Fechar
      </Button>
    </div>
  );
}

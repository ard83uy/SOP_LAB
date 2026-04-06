import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon, title: string, description: string, action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-xl border border-dashed bg-muted/50 min-h-[300px]">
      <div className="bg-muted p-4 rounded-full">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="font-medium text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
      </div>
      {action}
    </div>
  );
}

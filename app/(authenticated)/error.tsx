"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 min-h-[60vh]">
      <div className="bg-red-100 p-6 rounded-full">
        <AlertCircle className="w-12 h-12 text-red-600" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Algo deu errado!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Não foi possível carregar esta rotina no momento.
        </p>
      </div>
      <Button onClick={() => reset()} size="lg" className="h-12 w-full max-w-xs font-bold text-lg">
        Tentar novamente
      </Button>
    </div>
  );
}

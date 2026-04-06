import { PieChart, Loader2 } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
          Relatórios
        </h1>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
        <div className="bg-blue-50 p-6 rounded-full">
          <PieChart className="w-16 h-16 text-blue-600 animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Módulo de BI em Construção</h2>
          <p className="text-slate-500 max-w-sm mx-auto">
            Estamos preparando painéis incríveis para você analisar desperdícios, produtividade por praça e eficiência operacional.
          </p>
        </div>

        <div className="flex items-center gap-2 text-blue-600 font-semibold bg-blue-50/50 px-4 py-2 rounded-full">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Sincronizando dados históricos...</span>
        </div>
      </div>
    </div>
  );
}

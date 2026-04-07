"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, CheckCircle2, Package, ChefHat, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/EmptyState";
import { StationIcon } from "@/components/station-icon";

const countItemSchema = z.object({
  prep_item_id: z.string().uuid(),
  actual_quantity: z.coerce.number().min(0, "A contagem não pode ser negativa"),
});

const submitCountSchema = z.object({
  items: z.array(countItemSchema).min(1, "Preencha a contagem"),
});

export default function HandoverPage() {
  const queryClient = useQueryClient();
  const [selectedStation, setSelectedStation] = useState<any>(null);
  const [successData, setSuccessData] = useState<any>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({ name: "", unit: "kg", note: "" });
  const [reviewState, setReviewState] = useState<{ items: { id: string; name: string; unit: string; qty: number }[]; comment: string } | null>(null);

  const { data: stations, isLoading: loadingStations } = useQuery({
    queryKey: ["stations"],
    queryFn: async () => {
      const res = await fetch("/api/stations");
      if (!res.ok) throw new Error("Falha ao carregar praças");
      return res.json();
    },
  });

  const { data: prepData, isLoading: loadingItems } = useQuery({
    queryKey: ["prep-items", selectedStation?.id],
    queryFn: async () => {
      const res = await fetch(`/api/stations/${selectedStation.id}/prep-items`);
      if (!res.ok) throw new Error("Falha ao carregar insumos");
      return res.json();
    },
    enabled: !!selectedStation,
  });

  const prepItems = prepData?.items ?? prepData;
  const serverTime = prepData?.server_time;

  const form = useForm<z.infer<typeof submitCountSchema>>({
    resolver: zodResolver(submitCountSchema) as any,
    defaultValues: { items: [] },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  if (prepItems && fields.length === 0 && !form.formState.isSubmitting && !successData && prepItems.length > 0) {
    replace(prepItems.map((item: any) => ({ prep_item_id: item.id, actual_quantity: "" as any })));
  }

  const mutation = useMutation({
    mutationFn: async ({ filledItems, comment }: { filledItems: { prep_item_id: string; actual_quantity: number }[]; comment: string }) => {
      const res = await fetch("/api/handovers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          station_id: selectedStation.id,
          note: comment.trim() || undefined,
          items: filledItems,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Falha ao registrar contagem");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["production-dashboard"] });
      const counted = data.items.map((i: any) => {
        const info = prepItems.find((p: any) => p.id === i.prep_item_id);
        return { name: info?.name ?? i.prep_item_id, unit: info?.unit ?? "", qty: i.actual_quantity };
      });
      setSuccessData({ counted, note: data.note ?? null });
      setReviewState(null);
      toast.success("Contagem salva com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/prep-item-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          station_id: selectedStation.id,
          name: requestForm.name,
          unit: requestForm.unit,
          note: requestForm.note || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Falha ao enviar solicitação");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Solicitação enviada ao gerente!");
      setRequestOpen(false);
      setRequestForm({ name: "", unit: "kg", note: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function onSubmit(values: z.infer<typeof submitCountSchema>) {
    const filledItems = values.items
      .filter(i => i.actual_quantity !== ("" as any) && i.actual_quantity !== null && i.actual_quantity !== undefined)
      .map(i => ({ prep_item_id: i.prep_item_id, actual_quantity: Number(i.actual_quantity) }));

    if (filledItems.length === 0) {
      toast.error("Preencha a quantidade de pelo menos um insumo");
      return;
    }

    const reviewItems = filledItems.map(i => {
      const info = prepItems.find((p: any) => p.id === i.prep_item_id);
      return { id: i.prep_item_id, name: info?.name ?? i.prep_item_id, unit: info?.unit ?? "", qty: i.actual_quantity };
    });

    setReviewState({ items: reviewItems, comment: "" });
  }

  function confirmSubmit() {
    if (!reviewState) return;
    const filledItems = reviewState.items.map(i => ({ prep_item_id: i.id, actual_quantity: i.qty }));
    mutation.mutate({ filledItems, comment: reviewState.comment });
  }

  const restart = () => {
    setSuccessData(null);
    setSelectedStation(null);
    form.reset({ items: [] });
  };

  if (successData) {
    return (
      <div className="p-4 md:p-8 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-8 text-center mt-10">
        <div className="bg-green-100 p-6 rounded-full">
          <CheckCircle2 className="w-16 h-16 text-green-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Contagem Salva!</h1>
          <p className="text-muted-foreground text-lg">O turno foi registrado com sucesso.</p>
        </div>

        {successData.note && (
          <Card className="w-full text-left">
            <CardContent className="p-4 flex items-start gap-2">
              <Package className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-base text-foreground">{successData.note}</p>
            </CardContent>
          </Card>
        )}

        {successData.counted.length > 0 && (
          <Card className="w-full text-left">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <ChefHat className="w-5 h-5" /> Itens contados:
              </h3>
              <ul className="space-y-3">
                {successData.counted.map((c: any, idx: number) => (
                  <li key={idx} className="flex justify-between border-b pb-2 last:border-0 last:pb-0">
                    <span className="font-medium text-lg">{c.name}</span>
                    <span className="font-bold text-lg">{c.qty} {c.unit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Button onClick={restart} className="w-full h-14 text-lg mt-8 shadow-md" size="lg">Nova Contagem</Button>
      </div>
    );
  }

  if (!selectedStation) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-[90px]">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Escolha a Praça</h1>
        {loadingStations ? (
           <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : !stations || stations.length === 0 ? (
           <EmptyState icon={LayoutDashboard} title="Nenhuma praça" description="Nenhuma praça configurada no sistema. Solicite ao gestor." />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {stations.map((station: any) => (
              <Card key={station.id} className="hover:border-primary transition-all cursor-pointer shadow-sm active:scale-95" onClick={() => setSelectedStation(station)}>
                 <CardContent className="p-6 flex flex-col items-center justify-center gap-4 text-center aspect-square">
                    <div className="bg-primary/10 p-4 rounded-full">
                      <StationIcon iconName={station.icon} className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold">{station.name}</h2>
                 </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-32">
      {serverTime && (
        <p className="text-sm text-muted-foreground mb-2">Horário do servidor: {serverTime}</p>
      )}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold truncate">Contagem: {selectedStation.name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-12 px-4" onClick={() => setRequestOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Solicitar Insumo
          </Button>
          <Button variant="outline" onClick={() => setSelectedStation(null)} className="h-12 px-6">Trocar</Button>
        </div>
      </div>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar novo insumo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sua solicitação será enviada ao gerente para aprovação.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do insumo</label>
              <Input
                className="h-12 text-lg"
                placeholder="Ex: Molho Especial"
                value={requestForm.name}
                onChange={(e) => setRequestForm((v) => ({ ...v, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unidade</label>
              <Select value={requestForm.unit} onValueChange={(val) => setRequestForm((v) => ({ ...v, unit: val ?? "kg" }))}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                  <SelectItem value="g">Gramas (g)</SelectItem>
                  <SelectItem value="L">Litros (L)</SelectItem>
                  <SelectItem value="ml">Mililitros (ml)</SelectItem>
                  <SelectItem value="un">Unidades (un)</SelectItem>
                  <SelectItem value="porc">Porções</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Observação (opcional)</label>
              <Input
                className="h-12 text-base"
                placeholder="Por que este insumo é necessário?"
                value={requestForm.note}
                onChange={(e) => setRequestForm((v) => ({ ...v, note: e.target.value }))}
              />
            </div>
            <Button
              className="w-full h-12 text-lg"
              disabled={!requestForm.name.trim() || requestMutation.isPending}
              onClick={() => requestMutation.mutate()}
            >
              {requestMutation.isPending ? "Enviando..." : "Enviar Solicitação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {loadingItems ? (
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-xl w-full" />
          <Skeleton className="h-28 rounded-xl w-full" />
        </div>
      ) : !prepItems || prepItems.length === 0 ? (
        <EmptyState icon={Package} title="Praça vazia" description="Esta praça não possui nenhum insumo mapeado." />
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {fields.map((field, index) => {
              const itemInfo = prepItems.find((p: any) => p.id === field.prep_item_id);
              if (!itemInfo) return null;
              
              return (
                <Card key={field.id} className="overflow-hidden shadow-sm">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-2xl">{itemInfo.name}</h3>
                      <p className="text-muted-foreground text-lg">Utilização média: <span className="font-semibold text-foreground">{itemInfo.effective_target} {itemInfo.unit}</span>{itemInfo.effective_target !== itemInfo.target_quantity && <span className="text-xs ml-1 text-amber-600">(dia específico)</span>}</p>
                      {itemInfo.current_quantity != null && (
                        <p className="text-blue-600 text-base font-medium mt-0.5">
                          Esperado agora: <span className="font-bold">{itemInfo.current_quantity} {itemInfo.unit}</span>
                        </p>
                      )}
                    </div>
                    <div className="w-full sm:w-40 flex-shrink-0">
                      <FormField
                        control={form.control}
                        name={`items.${index}.actual_quantity`}
                        render={({ field: inputField }) => (
                          <FormItem>
                            <FormControl>
                              <div className="flex items-center relative">
                                <Input 
                                  className="h-16 text-3xl font-bold text-center pr-12 rounded-xl" 
                                  type="number" 
                                  inputMode="decimal" 
                                  step="0.01" 
                                  {...inputField} 
                                />
                                <span className="absolute right-4 text-muted-foreground font-semibold text-lg">
                                  {itemInfo.unit}
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            <div className="fixed bottom-16 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent md:static md:bg-none z-10 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div className="max-w-3xl mx-auto">
                <Button type="submit" size="lg" className="w-full h-16 text-xl shadow-xl font-bold rounded-xl" disabled={mutation.isPending}>
                  {mutation.isPending ? "Salvando..." : "Salvar Contagem"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      )}

      {reviewState && (
        <Dialog open onOpenChange={(v) => !v && setReviewState(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg leading-snug">
                Confira sua contagem, verifique que tudo está correto e envie para produção
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 mt-1">
              <ul className="divide-y divide-border rounded-xl border overflow-hidden">
                {reviewState.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between px-4 py-3">
                    <span className="font-medium text-base">{item.name}</span>
                    <span className="font-bold text-lg tabular-nums">
                      {parseFloat(item.qty.toFixed(3))} <span className="text-sm font-normal text-muted-foreground">{item.unit}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Comentário (opcional)</label>
                <Textarea
                  placeholder="Ex: Estoque baixo de frango, pedir reposição amanhã..."
                  className="resize-none min-h-[80px] text-base"
                  value={reviewState.comment}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReviewState((s) => s ? { ...s, comment: e.target.value } : s)}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={() => setReviewState(null)}>
                Voltar e editar
              </Button>
              <Button
                className="font-bold"
                onClick={confirmSubmit}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Enviando..." : "Enviar para produção"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

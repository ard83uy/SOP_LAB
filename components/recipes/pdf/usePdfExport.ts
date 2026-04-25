"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { RecipePdfData } from "./RecipePdfDocument";

// Converts an external image URL to a base64 data-URL so react-pdf can embed
// it without running into CORS restrictions at render time.
async function toBase64DataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function usePdfExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportPdf = useCallback(async (recipeIds: string[]) => {
    if (!recipeIds.length) return;
    setIsExporting(true);

    try {
      const responses = await Promise.all(
        recipeIds.map((id) =>
          fetch(`/api/recipes/${id}`).then((r) => {
            if (!r.ok) throw new Error(`Erro ao buscar ficha ${id}`);
            return r.json();
          })
        )
      );

      // Convert all photo URLs to base64 in parallel before building pdfData
      const photoBase64s = await Promise.all(
        responses.map((r) =>
          r.photo_url ? toBase64DataUrl(r.photo_url) : Promise.resolve(null)
        )
      );

      const pdfData: RecipePdfData[] = responses.map((r, i) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? null,
        category: r.category,
        base_yield: r.base_yield,
        yield_unit: r.yield_unit,
        photo_url: photoBase64s[i],
        created_at: r.created_at,
        ingredients: r.ingredients.map((ing: any) => ({
          name: ing.prepItem?.name ?? ing.sourceRecipe?.name ?? "—",
          quantity: ing.quantity,
          unit: ing.unit,
        })),
        steps: r.steps.map((s: any) => ({
          step_number: s.step_number,
          instruction: s.instruction,
        })),
        // extras (tools, attention, chefs_tip) will be added here in the future
        // when those fields are available in the recipe model
      }));

      const printDate = new Date().toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Dynamic imports keep SSR clean — react-pdf runs only in the browser
      const [{ pdf }, { createElement }, { RecipePdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("react"),
        import("./RecipePdfDocument"),
      ]);

      // react-pdf's pdf() expects DocumentProps — cast is safe because
      // RecipePdfDocument renders a Document as its root element.
      const blob = await pdf(
        createElement(RecipePdfDocument, { recipes: pdfData, printDate }) as any
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fichas-tecnicas-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        pdfData.length === 1
          ? "Ficha exportada em PDF"
          : `${pdfData.length} fichas exportadas em PDF`
      );
    } catch (err) {
      toast.error("Erro ao gerar PDF. Tente novamente.");
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportPdf, isExporting };
}

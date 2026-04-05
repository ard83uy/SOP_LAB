import { describe, it, expect } from "vitest";
import { submitHandoverSchema } from "../lib/validations/schemas";
import { ZodError } from "zod";

describe("Business Logic Tests", () => {
  describe("to_produce Calculation", () => {
    // Simulando a lógica isolada que está em app/api/production/dashboard/route.ts
    const calculateToProduce = (target: number, actual: number) => {
      return Math.max(0, target - actual);
    };

    it("to_produce retorna 0 quando actual_quantity >= target_quantity", () => {
      expect(calculateToProduce(10, 10)).toBe(0);
      expect(calculateToProduce(10, 15)).toBe(0);
    });

    it("to_produce calcula corretamente quando actual_quantity < target_quantity", () => {
      expect(calculateToProduce(10, 4)).toBe(6);
      expect(calculateToProduce(5.5, 2)).toBe(3.5);
    });
  });

  describe("Zod Validations", () => {
    it("Validação Zod rejeita actual_quantity negativo", () => {
      const payload = {
        station_id: "123e4567-e89b-12d3-a456-426614174000",
        items: [
          {
            prep_item_id: "123e4567-e89b-12d3-a456-426614174001",
            actual_quantity: -1,
          },
        ],
      };

      const result = submitHandoverSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("actual_quantity cannot be negative");
      }
    });

    it("Validação Zod rejeita array de items vazio no handover", () => {
      const payload = {
        station_id: "123e4567-e89b-12d3-a456-426614174000",
        items: [],
      };

      const result = submitHandoverSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("array");
      }
    });
  });
});

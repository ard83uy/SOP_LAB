import { z } from "zod";

export const createStationSchema = z.object({
  name: z.string().min(2).max(100),
});

export const createPrepItemSchema = z.object({
  station_id: z.string().uuid(),
  name: z.string().min(2).max(100),
  unit: z.string().min(1).max(20),
  target_quantity: z.number().positive().max(99999),
});

export const updatePrepItemSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  unit: z.string().min(1).max(20).optional(),
  target_quantity: z.number().positive().max(99999).optional(),
}).refine((data) => data.name !== undefined || data.unit !== undefined || data.target_quantity !== undefined, {
  message: "Pelo menos 1 campo é obrigatório",
});

export const submitHandoverSchema = z.object({
  station_id: z.string().uuid(),
  items: z.array(
    z.object({
      prep_item_id: z.string().uuid(),
      actual_quantity: z.number().min(0, "actual_quantity cannot be negative"),
    })
  ).min(1),
});

export const submitProductionLogSchema = z.object({
  prep_item_id: z.string().uuid(),
  shift_handover_id: z.string().uuid(),
  produced_quantity: z.number().positive(),
});

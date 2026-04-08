import { z } from "zod";

export const createStationSchema = z.object({
  name: z.string().min(2).max(100),
  icon: z.string().optional(),
});

export const createPrepItemSchema = z.object({
  station_id: z.string().uuid(),
  name: z.string().min(2).max(100),
  unit: z.string().min(1).max(20),
  target_quantity: z.number().positive().max(99999),
});

export const updateStationSchema = z.object({
  name: z.string().min(2).max(100),
  icon: z.string().optional(),
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
  note: z.string().optional(),
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

export const upsertDayTargetsSchema = z.object({
  targets: z.array(
    z.object({
      day_of_week: z.number().int().min(0).max(6),
      target_quantity: z.number().min(0),
    })
  ).min(1),
});

export const createPrepItemRequestSchema = z.object({
  station_id: z.string().uuid(),
  name: z.string().min(2).max(100),
  unit: z.string().min(1).max(20),
  note: z.string().max(500).optional(),
});

export const reviewPrepItemRequestSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  target_quantity: z.number().positive().optional(),
});

// ── Fichas Técnicas (Recipes) ────────────────────────────────────────────────

export const createRecipeSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  category: z.enum(["PRIMARY", "MANIPULATED", "INTERMEDIATE", "FINAL"]),
  base_yield: z.number().positive().max(99999),
  yield_unit: z.string().min(1).max(20),
  photo_url: z.string().max(2048).optional(),
  allowed_roles: z.array(z.enum(["ADMIN", "MANAGER", "STATION_LEADER", "PREP_KITCHEN", "STAFF"])).min(1),
  ingredients: z.array(z.object({
    prep_item_id: z.string().uuid().optional(),
    source_recipe_id: z.string().uuid().optional(),
    quantity: z.number().positive(),
    unit: z.string().min(1).max(20),
    sort_order: z.number().int().min(0).optional(),
  })).optional(),
  steps: z.array(z.object({
    step_number: z.number().int().positive(),
    instruction: z.string().min(1).max(2000),
  })).optional(),
});

export const updateRecipeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).optional(),
  category: z.enum(["PRIMARY", "MANIPULATED", "INTERMEDIATE", "FINAL"]).optional(),
  base_yield: z.number().positive().max(99999).optional(),
  yield_unit: z.string().min(1).max(20).optional(),
  photo_url: z.string().max(2048).nullable().optional(),
  allowed_roles: z.array(z.enum(["ADMIN", "MANAGER", "STATION_LEADER", "PREP_KITCHEN", "STAFF"])).min(1).optional(),
  ingredients: z.array(z.object({
    prep_item_id: z.string().uuid().optional(),
    source_recipe_id: z.string().uuid().optional(),
    quantity: z.number().positive(),
    unit: z.string().min(1).max(20),
    sort_order: z.number().int().min(0).optional(),
  })).optional(),
  steps: z.array(z.object({
    step_number: z.number().int().positive(),
    instruction: z.string().min(1).max(2000),
  })).optional(),
});

export const createRecipeCommentSchema = z.object({
  text: z.string().min(1).max(2000),
});

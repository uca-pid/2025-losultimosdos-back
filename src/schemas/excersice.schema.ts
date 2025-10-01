import { z } from "zod";

export const exerciseCreateSchema = z.object({
  name: z.string().min(1, "name is required"),
  muscleGroupId: z.number().int().positive(),
  equipment: z.string().optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
});

export const exerciseUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  muscleGroupId: z.number().int().positive().optional(),
  equipment: z.string().optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
});

export const exerciseIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

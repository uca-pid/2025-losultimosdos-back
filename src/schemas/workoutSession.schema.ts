import { z } from "zod";

const setInputSchema = z.object({
  reps: z.number().int().positive(),
  weight: z.number().nonnegative(),
  comment: z.string().optional(),
});

const performanceInputSchema = z.object({
  exerciseId: z.number().int().positive(),
  sets: z.array(setInputSchema).min(1),
});

export const createWorkoutSessionSchema = z.object({
  routineId: z.number().int().positive(),
  notes: z.string().optional(),
  performances: z.array(performanceInputSchema),
});

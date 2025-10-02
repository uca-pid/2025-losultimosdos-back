import { z } from "zod";

const routineExerciseItem = z.object({
  exerciseId: z.number().int().positive(),
  sets: z.number().int().positive().optional().nullable(),
  reps: z.number().int().positive().optional().nullable(),
  restTime: z.number().int().nonnegative().optional().nullable(), // segundos
});

export const routineCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  level: z.string().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
  icon: z.string().optional().nullable(),
  exercises: z
    .array(routineExerciseItem)
    .min(1, "Routine must have at least one exercise"),
});

export const routineUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  level: z.string().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
  icon: z.string().optional().nullable(),
  replaceExercises: z.boolean().optional(),
  exercises: z.array(routineExerciseItem).optional(),
});

export const routineIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

export const routineAssignSchema = z.object({
  userId: z.string(),
});

export const routineExerciseIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number), // routineId
  reId: z.string().regex(/^\d+$/).transform(Number), // routineExerciseId
});

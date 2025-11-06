import { z } from "zod";

const isFutureDate = (date: Date) => {
  const now = new Date();
  return date > now;
};

export const goalCreateSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().optional().nullable(),
    category: z.enum([
      "USER_REGISTRATIONS",
      "CLASS_ENROLLMENTS",
      "ROUTINE_ASSIGNMENTS",
    ]),
    targetValue: z
      .number()
      .int()
      .min(1, "Target value must be at least 1")
      .max(10000, "Target value cannot exceed 10000"),
    endDate: z
      .string()
      .or(z.date())
      .transform((val) => (typeof val === "string" ? new Date(val) : val))
      .refine(isFutureDate, { message: "End date must be in the future" }),
    sedeId: z.number().int().positive(),
    targetClassId: z.number().int().positive().optional().nullable(),
    targetRoutineId: z.number().int().positive().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.category === "CLASS_ENROLLMENTS") {
        return data.targetClassId !== null && data.targetClassId !== undefined;
      }
      return true;
    },
    {
      message: "targetClassId is required for CLASS_ENROLLMENTS category",
      path: ["targetClassId"],
    }
  )
  .refine(
    (data) => {
      if (data.category === "ROUTINE_ASSIGNMENTS") {
        return (
          data.targetRoutineId !== null && data.targetRoutineId !== undefined
        );
      }
      return true;
    },
    {
      message: "targetRoutineId is required for ROUTINE_ASSIGNMENTS category",
      path: ["targetRoutineId"],
    }
  );

export const goalUpdateSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters").optional(),
    description: z.string().optional().nullable(),
    targetValue: z
      .number()
      .int()
      .min(1, "Target value must be at least 1")
      .max(10000, "Target value cannot exceed 10000")
      .optional(),
    endDate: z
      .string()
      .or(z.date())
      .transform((val) => (typeof val === "string" ? new Date(val) : val))
      .refine(isFutureDate, { message: "End date must be in the future" })
      .optional(),
    targetClassId: z.number().int().positive().optional().nullable(),
    targetRoutineId: z.number().int().positive().optional().nullable(),
  })
  .strict();

export const goalIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

export const goalSedeQuerySchema = z.object({
  sedeId: z
    .string()
    .regex(/^\d+$/, "sedeId must be a positive number")
    .transform(Number),
});

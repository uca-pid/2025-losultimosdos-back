import { z } from "zod";

export const mgCreateSchema = z.object({
  name: z.string().min(1, "name is required"),
});

export const mgUpdateSchema = z.object({
  name: z.string().min(1, "name is required"),
});

export const mgIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

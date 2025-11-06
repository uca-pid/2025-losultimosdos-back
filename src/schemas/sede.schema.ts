import { z } from "zod";

export const sedeCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  latitude: z
    .number("Latitude is required")
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  longitude: z
    .number("Longitude is required")
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
});

export const sedeUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  address: z.string().min(1, "Address is required").optional(),
  latitude: z
    .number("Latitude must be a number")
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90")
    .optional(),
  longitude: z
    .number("Longitude must be a number")
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180")
    .optional(),
});

export const sedeIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

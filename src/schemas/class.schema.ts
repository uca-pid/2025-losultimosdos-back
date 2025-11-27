import { z } from "zod";

// Schema for class creation/update
export const classInputSchema = z.object({
  name: z.string("Name is required").min(1, "Name is required"),
  description: z
    .string("Description is required")
    .min(1, "Description is required"),
  date: z
    .string("Date is required")
    .refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid date format",
    }),
  time: z
    .string("Time is required")
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: "Time must be in HH:MM format",
    }),
  capacity: z
    .number("Capacity is required")
    .int("Capacity must be an integer")
    .positive("Capacity must be a positive number"),
  sedeId: z
    .number("Sede ID is required")
    .int("Sede ID must be an integer")
    .positive("Sede ID must be a positive number"),

  // 👇 NUEVO: flag de clase boosteada
  isBoostedForPoints: z.boolean().optional().default(false),
});

// Schema for class enrollment/unenrollment
export const classEnrollmentSchema = z.object({
  classId: z
    .number("Class ID is required")
    .int("Class ID must be an integer")
    .positive("Class ID must be a positive number"),
});

// Schema for class ID in params
export const classIdParamSchema = z.object({
  id: z.string("Class ID is required").refine((id) => !isNaN(parseInt(id)), {
    message: "Invalid class ID format ",
  }),
});

// Schema for enrollment
export const enrollmentSchema = z.object({
  userId: z.string("User ID is required"),
});

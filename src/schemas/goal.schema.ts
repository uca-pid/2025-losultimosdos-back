
import { z } from "zod";

export const goalTypeEnum = z.enum(["MEMBERS", "CLASS", "ROUTINE"]);
export const membersScopeEnum = z.enum(["TOTAL", "BASIC", "PREMIUM"]);

const baseGoalSchema = z.object({
  title: z.string().min(1, "title is required"),
  description: z.string().min(1, "description is required"),
  type: goalTypeEnum,
  membersScope: membersScopeEnum.optional().nullable(),
  classId: z.number().int().positive().optional().nullable(),
  routineId: z.number().int().positive().optional().nullable(),
  targetValue: z.number().int().nonnegative(),
  endDate: z
    .string()
    .or(z.date())
    .transform((value) => (typeof value === "string" ? new Date(value) : value)),
  progress: z.number().int().min(0).max(100).optional(),
  completed: z.boolean().optional(),
});

const withConditionalLogic = baseGoalSchema.superRefine((data, ctx) => {
  if (data.type === "MEMBERS") {
    if (!data.membersScope) {
      ctx.addIssue({
        path: ["membersScope"],
        code: z.ZodIssueCode.custom,
        message: "membersScope is required when type is MEMBERS",
      });
    }
  }

  if (data.type === "CLASS") {
    if (!data.classId) {
      ctx.addIssue({
        path: ["classId"],
        code: z.ZodIssueCode.custom,
        message: "classId is required when type is CLASS",
      });
    }
  }

  if (data.type === "ROUTINE") {
    if (!data.routineId) {
      ctx.addIssue({
        path: ["routineId"],
        code: z.ZodIssueCode.custom,
        message: "routineId is required when type is ROUTINE",
      });
    }
  }
});

export const goalCreateSchema = withConditionalLogic;

export const goalUpdateSchema = baseGoalSchema
  .partial()
  .superRefine((data, ctx) => {

    if (data.type === "MEMBERS" && data.membersScope === undefined) {
      ctx.addIssue({
        path: ["membersScope"],
        code: z.ZodIssueCode.custom,
        message: "membersScope is required when type is MEMBERS",
      });
    }
    if (data.type === "CLASS" && data.classId === undefined) {
      ctx.addIssue({
        path: ["classId"],
        code: z.ZodIssueCode.custom,
        message: "classId is required when type is CLASS",
      });
    }
    if (data.type === "ROUTINE" && data.routineId === undefined) {
      ctx.addIssue({
        path: ["routineId"],
        code: z.ZodIssueCode.custom,
        message: "routineId is required when type is ROUTINE",
      });
    }
  });

export const goalIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

export type GoalCreateInput = z.infer<typeof goalCreateSchema>;
export type GoalUpdateInput = z.infer<typeof goalUpdateSchema>;

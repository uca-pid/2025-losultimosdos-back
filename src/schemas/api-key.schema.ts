import { z } from "zod";

export const apiKeyToggleSchema = z.object({
  isActive: z.boolean(),
});

export const apiKeyIdParamSchema = z.object({
  keyId: z.string().uuid("Invalid API key ID format"),
});


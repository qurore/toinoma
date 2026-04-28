import { z } from "zod";

const tier = z.enum(["free", "basic", "pro"]);
const reason = z.string().min(10).max(500);

export const tierOverrideMetadataSchema = z.object({
  from_tier: tier.nullable(),
  to_tier: tier.nullable(),
  reason,
  prior_override_tier: tier.nullable(),
  prior_override_at: z.string().datetime().nullable(),
  expected_version: z.number().int().nonnegative(),
  new_version: z.number().int().nonnegative(),
  notify_user: z.boolean(),
});

export const aiUsageAdjustmentMetadataSchema = z.object({
  operation: z.enum(["credit", "deduct", "reset"]),
  tokens: z.number().int(),
  reason,
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
  balance_before: z.number().int(),
  balance_after: z.number().int(),
  notify_user: z.boolean(),
});

export type TierOverrideMetadata = z.infer<typeof tierOverrideMetadataSchema>;
export type AiUsageAdjustmentMetadata = z.infer<
  typeof aiUsageAdjustmentMetadataSchema
>;

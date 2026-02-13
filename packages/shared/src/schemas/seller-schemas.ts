import { z } from "zod";

export const tosAcceptanceSchema = z.object({
  accepted: z.literal(true, {
    error: "利用規約への同意が必要です",
  }),
});

export const sellerProfileSchema = z.object({
  sellerDisplayName: z.string().min(1, "表示名は必須です").max(50),
  sellerDescription: z.string().max(500).optional().default(""),
  university: z.string().max(100).optional().default(""),
  circleName: z.string().max(100).optional().default(""),
});

export type TosAcceptanceInput = z.infer<typeof tosAcceptanceSchema>;
export type SellerProfileInput = z.infer<typeof sellerProfileSchema>;

import { z } from "zod";

export const feePaymentSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  paymentMethod: z.string().max(20).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type FeePaymentInput = z.infer<typeof feePaymentSchema>;

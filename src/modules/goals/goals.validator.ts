import { z } from "zod";

export const monthlyGoalSchema = z.object({
  year: z.number().optional(),
  month: z.number().optional(),
  targetHours: z.number({ message: "targetHours is required" }),
});

export type MonthlyGoalInput = z.infer<typeof monthlyGoalSchema>;

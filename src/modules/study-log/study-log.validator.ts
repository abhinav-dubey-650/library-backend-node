import { z } from "zod";

export const studyLogSchema = z.object({
  subject: z.string().min(1, "subject is required"),
  hoursStudied: z.number({ message: "hoursStudied is required" }),
  logDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type StudyLogInput = z.infer<typeof studyLogSchema>;

import { z } from "zod";
import { ACCEPTS_MEXICO, SENIORITIES } from "@/db/schema";

/**
 * A hand-labeled job with the inputs the classifiers need, frozen at labeling
 * time. Lives in data/labeled-jobs.json so the evaluation is reproducible
 * without database access.
 */
export const labeledJobSchema = z.object({
  id: z.number(),
  source: z.string(),
  title: z.string(),
  seniorityLabels: z.array(z.string()),
  locations: z.array(z.string()),
  timezone: z.object({ min: z.number(), max: z.number() }).nullable(),
  description: z.string(),
  label: z.object({ seniority: z.enum(SENIORITIES), acceptsMexico: z.enum(ACCEPTS_MEXICO) }),
});

export const labeledSetSchema = z.array(labeledJobSchema);
export type LabeledJob = z.infer<typeof labeledJobSchema>;

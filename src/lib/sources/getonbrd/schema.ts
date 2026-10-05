import { z } from "zod";

/**
 * Zod schema for Get on Board's public search endpoint
 * (GET https://www.getonbrd.com/api/v0/search/jobs).
 *
 * Only the fields we use are declared; unknown keys are ignored so a new field
 * on their side never breaks ingestion. Optional/nullable everywhere the docs
 * don't guarantee a value.
 */
const relationship = <T extends z.ZodTypeAny>(attributes: T) =>
  z.object({
    data: z
      .object({
        id: z.union([z.string(), z.number()]),
        type: z.string().optional(),
        attributes: attributes.optional(),
      })
      .nullable()
      .optional(),
  });

export const getonbrdJobSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  attributes: z.object({
    title: z.string(),
    description: z.string().nullish(),
    functions: z.string().nullish(),
    desirable: z.string().nullish(),
    remote: z.boolean().nullish(),
    remote_modality: z.string().nullish(),
    remote_zone: z.string().nullish(),
    countries: z.array(z.string()).nullish(),
    min_salary: z.number().nullish(),
    max_salary: z.number().nullish(),
    published_at: z.number(),
    seniority: relationship(z.object({ name: z.string().nullish() })).nullish(),
    company: relationship(z.object({ name: z.string().nullish() })).nullish(),
    tags: z
      .object({
        data: z.array(
          z.object({
            id: z.union([z.string(), z.number()]),
            attributes: z.object({ name: z.string().nullish() }).optional(),
          }),
        ),
      })
      .nullish(),
  }),
  links: z.object({ public_url: z.url() }).optional(),
});

export const getonbrdSearchResponseSchema = z.object({
  data: z.array(z.unknown()),
  meta: z
    .object({
      page: z.number().optional(),
      total_pages: z.number().optional(),
    })
    .optional(),
});

export type GetonbrdJob = z.infer<typeof getonbrdJobSchema>;

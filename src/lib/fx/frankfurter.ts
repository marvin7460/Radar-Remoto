import { z } from "zod";
import { fetchJson, type FetchFn } from "@/lib/http/fetch";

/**
 * Frankfurter publishes the European Central Bank's daily reference rates,
 * free and without an API key. The ECB covers MXN, BRL, EUR, GBP, CAD, but
 * not CLP, COP, ARS or PEN: salaries in those stay without a USD figure.
 */
export const FRANKFURTER_URL =
  "https://api.frankfurter.dev/v1/latest?base=USD&symbols=MXN,EUR,GBP,CAD,BRL,AUD,CHF,INR";

const responseSchema = z.object({
  base: z.literal("USD"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rates: z.record(z.string().length(3), z.number().positive()),
});

export type FrankfurterRates = z.infer<typeof responseSchema>;

export function parseFrankfurterResponse(body: unknown): FrankfurterRates {
  return responseSchema.parse(body);
}

export async function fetchUsdRates(fetchFn: FetchFn = fetch): Promise<FrankfurterRates> {
  return parseFrankfurterResponse(await fetchJson(FRANKFURTER_URL, { fetchFn }));
}

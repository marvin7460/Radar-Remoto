import type { FetchFn } from "@/lib/sources/types";

export const USER_AGENT = "RadarRemoto/0.1 (+https://github.com/marvin7460/Radar-Remoto)";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
  ) {
    super(`HTTP ${status} for ${url}`);
    this.name = "HttpError";
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface FetchJsonOptions {
  fetchFn?: FetchFn;
  timeoutMs?: number;
  retries?: number;
  /** Base delay for exponential backoff; tests pass 0. */
  backoffMs?: number;
}

/**
 * GET + JSON with a timeout and exponential backoff on 429/5xx/network errors.
 * 4xx other than 429 are not retried: retrying a bad request is pointless.
 */
export async function fetchJson(url: string, options: FetchJsonOptions = {}): Promise<unknown> {
  const { fetchFn = fetch, timeoutMs = 15_000, retries = 3, backoffMs = 1_000 } = options;

  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetchFn(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return await res.json();
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt >= retries) throw new HttpError(res.status, url);
    } catch (error) {
      const isHttp4xx = error instanceof HttpError && error.status < 500 && error.status !== 429;
      if (isHttp4xx || attempt >= retries) throw error;
    }
    await sleep(backoffMs * 2 ** attempt);
  }
}

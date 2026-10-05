import { companyKey, similarity, titleKey, titleLevel } from "./similarity";

export interface DedupeCandidate {
  id: number;
  source: string;
  title: string;
  company: string;
  publishedAt: Date;
  firstSeenAt: Date;
}

export interface DedupeOptions {
  /** Minimum pg_trgm-style similarity between titles of the same company. */
  titleThreshold?: number;
  /** Re-posts more than this many days apart are treated as different openings. */
  maxDaysApart?: number;
  /** Lower number wins when choosing which copy to keep. */
  sourcePriority?: Record<string, number>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Finds the same opening published on several sources. Two postings match
 * when they come from different sources, the company is the same after
 * normalization, the titles are similar enough, the seniority in the titles
 * doesn't conflict, and they were published close in time.
 *
 * Returns duplicateId → canonicalId. The canonical copy is the one we saw
 * first (ties: source priority, then id), so it doesn't flip between runs.
 */
export function findDuplicates(
  jobs: readonly DedupeCandidate[],
  { titleThreshold = 0.5, maxDaysApart = 30, sourcePriority = {} }: DedupeOptions = {},
): Map<number, number> {
  // Union-find over job ids.
  const parent = new Map(jobs.map((job) => [job.id, job.id]));
  const find = (id: number): number => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };

  // Only compare within the same company: cheap and precise ("blocking").
  const byCompany = new Map<string, Array<DedupeCandidate & { key: string; level: string | null }>>();
  for (const job of jobs) {
    const company = companyKey(job.company);
    if (!company) continue;
    const group = byCompany.get(company) ?? [];
    group.push({ ...job, key: titleKey(job.title), level: titleLevel(job.title) });
    byCompany.set(company, group);
  }

  for (const group of byCompany.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        if (a.source === b.source) continue;
        if (a.level && b.level && a.level !== b.level) continue;
        if (Math.abs(a.publishedAt.getTime() - b.publishedAt.getTime()) > maxDaysApart * DAY_MS) continue;
        if (similarity(a.key, b.key) < titleThreshold) continue;
        parent.set(find(a.id), find(b.id));
      }
    }
  }

  const clusters = new Map<number, DedupeCandidate[]>();
  for (const job of jobs) {
    const root = find(job.id);
    clusters.set(root, [...(clusters.get(root) ?? []), job]);
  }

  const rank = (job: DedupeCandidate) => [
    job.firstSeenAt.getTime(),
    sourcePriority[job.source] ?? 99,
    job.id,
  ];
  const duplicates = new Map<number, number>();
  for (const members of clusters.values()) {
    if (members.length < 2) continue;
    const [canonical, ...rest] = [...members].sort((x, y) => {
      const [a, b] = [rank(x), rank(y)];
      return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
    });
    for (const job of rest) duplicates.set(job.id, canonical.id);
  }
  return duplicates;
}

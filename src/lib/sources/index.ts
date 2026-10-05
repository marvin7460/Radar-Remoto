import { getonbrdAdapter } from "./getonbrd/adapter";
import { himalayasAdapter } from "./himalayas/adapter";
import { jobicyAdapter } from "./jobicy/adapter";
import { remoteokAdapter } from "./remoteok/adapter";
import { remotiveAdapter } from "./remotive/adapter";
import type { SourceAdapter } from "./types";
import { weworkremotelyAdapter } from "./weworkremotely/adapter";

/**
 * Order matters for duplicates: when the same job appears in several
 * sources, the one we saw first wins, and ties go to the earlier source here.
 * Get on Board first because it is the LATAM specialist.
 */
export const adapters: SourceAdapter[] = [
  getonbrdAdapter,
  himalayasAdapter,
  jobicyAdapter,
  remotiveAdapter,
  weworkremotelyAdapter,
  remoteokAdapter,
];

export const sourceNames: Record<string, string> = Object.fromEntries(adapters.map((a) => [a.id, a.name]));

export const SOURCE_PRIORITY: Record<string, number> = Object.fromEntries(
  adapters.map((a, index) => [a.id, index]),
);

import { getonbrdAdapter } from "./getonbrd/adapter";
import type { SourceAdapter } from "./types";

export const adapters: SourceAdapter[] = [getonbrdAdapter];

export const sourceNames: Record<string, string> = Object.fromEntries(adapters.map((a) => [a.id, a.name]));

export type UpsertAction = "insert" | "update" | "unchanged";

/**
 * Decides what to do with an incoming job given the hash we already have
 * stored for the same (source, externalId), if any.
 *
 * TODO(Marvin): this works, but it rewrites every existing job on every run
 * (6 h × N jobs of pointless writes, and `updated_at` loses its meaning).
 * Make it return "unchanged" when nothing changed.
 * Hint: you receive both hashes; compare them. Then remove `.skip` from the
 * "returns unchanged when the hash is the same" test in
 * tests/unit/decide-action.test.ts and run `npm test`.
 */
export function decideUpsertAction(existingHash: string | undefined, incomingHash: string): UpsertAction {
  void incomingHash;
  if (existingHash === undefined) return "insert";
  return "update";
}

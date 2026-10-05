export type UpsertAction = "insert" | "update" | "unchanged";

/**
 * Decides what to do with an incoming job given the hash we already have
 * stored for the same (source, externalId), if any.
 *
 * Skipping unchanged jobs avoids rewriting every row on every run and keeps
 * `updated_at` meaningful ("the posting really changed").
 */
export function decideUpsertAction(existingHash: string | undefined, incomingHash: string): UpsertAction {
  if (existingHash === undefined) return "insert";
  return existingHash === incomingHash ? "unchanged" : "update";
}

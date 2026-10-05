/** Lowercase, accent-free, punctuation-free text for matching ("Desarrollador/a" → "desarrollador a"). */
export function normalizeForMatch(text: string): string {
  return stripAccents(text.toLowerCase())
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** Windows-1252 characters that stand in for bytes 0x80–0x9F in mojibake. */
const CP1252_BYTES: Record<string, number> = {
  "€": 0x80,
  "‚": 0x82,
  ƒ: 0x83,
  "„": 0x84,
  "…": 0x85,
  "†": 0x86,
  "‡": 0x87,
  ˆ: 0x88,
  "‰": 0x89,
  Š: 0x8a,
  "‹": 0x8b,
  Œ: 0x8c,
  Ž: 0x8e,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "˜": 0x98,
  "™": 0x99,
  š: 0x9a,
  "›": 0x9b,
  œ: 0x9c,
  ž: 0x9e,
  Ÿ: 0x9f,
};
const CONTINUATION = `[\\u0080-\\u00BF${Object.keys(CP1252_BYTES).join("")}]`;
/** A UTF-8 lead byte read as Latin-1, followed by its continuation bytes. */
const MOJIBAKE = new RegExp(`[\\u00C2-\\u00F4]${CONTINUATION}{1,3}`, "g");
const decoder = new TextDecoder("utf-8", { fatal: true });

/**
 * Repairs UTF-8 text that was decoded as Latin-1/Windows-1252 somewhere
 * upstream: "MecÃ¡nico" → "Mecánico", "Itâ€™s" → "It’s". Sequences that
 * don't decode to valid UTF-8 are left untouched, so clean text is safe.
 */
export function fixMojibake(text: string): string {
  if (!/[Â-ô]/.test(text)) return text;
  return text.replace(MOJIBAKE, (sequence) => {
    const bytes: number[] = [];
    for (const char of sequence) {
      const code = char.charCodeAt(0);
      const byte = code <= 0xff ? code : CP1252_BYTES[char];
      if (byte === undefined) return sequence;
      bytes.push(byte);
    }
    try {
      return decoder.decode(Uint8Array.from(bytes));
    } catch {
      return sequence;
    }
  });
}

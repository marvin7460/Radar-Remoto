import { describe, expect, it } from "vitest";
import { fixMojibake, normalizeForMatch } from "@/lib/normalize/text";

describe("fixMojibake", () => {
  it("repairs double-encoded UTF-8 (seen in the Remote OK feed)", () => {
    expect(fixMojibake("MecÃ¡nico Automotriz DiagnÃ³stico")).toBe("Mecánico Automotriz Diagnóstico");
    expect(fixMojibake("Freelance grabaciÃ³n de tareas")).toBe("Freelance grabación de tareas");
    expect(fixMojibake("Itâ€™s remote")).toBe("It’s remote");
  });

  it("leaves clean text alone", () => {
    for (const text of ["Ciudad de México", "São Paulo", "Ingeniería — remoto", "naïve café", "Ã"]) {
      expect(fixMojibake(text)).toBe(text);
    }
  });
});

describe("normalizeForMatch", () => {
  it("lowercases, strips accents and punctuation", () => {
    expect(normalizeForMatch("Desarrollador/a Front-End (React) — México")).toBe(
      "desarrollador a front end react mexico",
    );
  });
});

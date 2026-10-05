import { describe, expect, it } from "vitest";
import { buildFtsQuery, lightStem } from "@/lib/search/fts-query";
import { filtersToQuery, parseFilters } from "@/lib/search/filters";

describe("buildFtsQuery", () => {
  it("quotes, prefixes and ANDs every term", () => {
    expect(buildFtsQuery("React developer")).toBe('"react"* "develop"*');
    expect(buildFtsQuery("Desarrolladora Python")).toBe('"desarroll"* "python"*');
  });

  it("neutralizes FTS5 syntax and accents", () => {
    expect(buildFtsQuery('senior" OR title:* NEAR(')).toBe('"senior"* "or"* "title"* "near"*');
    expect(buildFtsQuery("México")).toBe('"mexico"*');
  });

  it("returns null when nothing is searchable", () => {
    expect(buildFtsQuery("")).toBeNull();
    expect(buildFtsQuery("  ¿?¡! ")).toBeNull();
    expect(buildFtsQuery(undefined)).toBeNull();
  });

  it("stems only long words and keeps at least 5 letters", () => {
    expect(lightStem("programadores")).toBe("program");
    expect(lightStem("ingeniero")).toBe("ingenier");
    expect(lightStem("python")).toBe("python");
    expect(lightStem("backend")).toBe("backend");
  });
});

describe("parseFilters", () => {
  it("keeps valid values and drops the rest", () => {
    expect(
      parseFilters({
        q: " react ",
        nivel: "junior",
        mexico: "si",
        tech: "nodejs",
        sueldo: "1500",
        zona: "-6",
        dias: "7",
        pagina: "2",
      }),
    ).toEqual({
      q: "react",
      nivel: "junior",
      mexico: "si",
      tech: "nodejs",
      sueldo: 1500,
      zona: -6,
      dias: 7,
      pagina: 2,
    });

    expect(
      parseFilters({
        nivel: "ceo",
        mexico: "tal vez",
        tech: "cobol",
        sueldo: "abc",
        zona: "40",
        dias: "3",
        pagina: "0",
      }),
    ).toEqual({});
  });

  it("uses the first value of repeated params", () => {
    expect(parseFilters({ nivel: ["mid", "senior"] })).toEqual({ nivel: "mid" });
  });
});

describe("filtersToQuery", () => {
  it("round-trips filters and omits page 1", () => {
    expect(filtersToQuery({ q: "react js", nivel: "junior" }, { pagina: 2 })).toBe(
      "?q=react+js&nivel=junior&pagina=2",
    );
    expect(filtersToQuery({ q: "react" }, { pagina: 1 })).toBe("?q=react");
    expect(filtersToQuery({})).toBe("");
  });
});

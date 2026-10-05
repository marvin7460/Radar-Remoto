import { describe, expect, it } from "vitest";
import { detectTechnologies, technologySlug } from "@/lib/normalize/technologies";

describe("detectTechnologies", () => {
  it("canonicalizes source tags and drops non-technologies", () => {
    expect(detectTechnologies(["node-js", "ReactJS", "remote", "full time", "C#", ".NET"], "", "")).toEqual([
      "Node.js",
      "React",
      "C#",
      ".NET",
    ]);
  });

  it("splits WWR-style skill lists", () => {
    expect(detectTechnologies(["HTML/CSS, JavaScript, MySQL, Node.js, PHP, and SASS"], "", "")).toEqual([
      "HTML",
      "CSS",
      "JavaScript",
      "MySQL",
      "Node.js",
      "PHP",
      "Sass",
    ]);
  });

  it("reads technologies from the title", () => {
    expect(detectTechnologies([], "Fullstack Web3 Engineer (Solidity / Rust / Typescript)", "")).toEqual([
      "TypeScript",
      "Rust",
      "Solidity",
    ]);
    expect(detectTechnologies([], "Full-Stack Mobile | React Native + Java", "")).toEqual([
      "React",
      "React Native",
      "Java",
    ]);
  });

  it("does not confuse words with technologies", () => {
    expect(
      detectTechnologies([], "Go-to-Market Engineer", "We react quickly and go the extra mile."),
    ).toEqual([]);
    expect(detectTechnologies([], "Golang Developer", "")).toEqual(["Go"]);
    expect(detectTechnologies([], "Backend Developer", "Our stack: React, Node.js and PostgreSQL.")).toEqual([
      "React",
      "Node.js",
      "PostgreSQL",
    ]);
    expect(detectTechnologies([], "JavaScript Developer", "")).toEqual(["JavaScript"]);
  });

  it("exposes URL slugs", () => {
    expect(technologySlug("Node.js")).toBe("nodejs");
    expect(technologySlug("C#")).toBe("csharp");
  });
});

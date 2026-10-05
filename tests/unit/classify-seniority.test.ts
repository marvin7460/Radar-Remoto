import { describe, expect, it } from "vitest";
import { classifySeniority, requiredYears } from "@/lib/classify/seniority";

const classify = (title: string, labels: string[] = [], description = "") =>
  classifySeniority({ title, labels, description });

describe("requiredYears", () => {
  it.each([
    ["5+ years of experience with React", 5],
    ["You have 2-4 years of professional experience", 2],
    ["Requisitos: 0 a 2 años de experiencia en desarrollo web", 0],
    ["Mínimo 3 años de experiencia como backend", 3],
    ["At least 1 year experience building APIs", 1],
    ["3 yrs exp. in Python", 3],
  ])("%s → %d", (text, years) => {
    expect(requiredYears(text)).toBe(years);
  });

  it("ignores years that are not about experience", () => {
    expect(requiredYears("We have been in business for 10 years and have 401k.")).toBeNull();
    expect(requiredYears("Company founded 20 years ago")).toBeNull();
  });
});

describe("classifySeniority", () => {
  it("trusts the title first", () => {
    expect(classify("Senior React Developer", ["Entry-level"])).toEqual({
      level: "senior",
      reason: "El título dice “senior”",
    });
    expect(classify("Desarrollador Jr. Backend").level).toBe("junior");
    expect(classify("Semi Senior Java Developer / ETL").level).toBe("mid");
    expect(classify("Engineering Manager, Platform").level).toBe("senior");
    expect(classify("Software Engineering Intern").level).toBe("junior");
  });

  it("then the source's label", () => {
    expect(classify("Backend Developer", ["Entry-level", "Mid-level"])).toMatchObject({ level: "junior" });
    expect(classify("Backend Developer", ["Semi Senior"])).toMatchObject({ level: "mid" });
    expect(classify("Backend Developer", ["Any"])).toMatchObject({ level: "unknown" });
  });

  it("then the years of experience asked for", () => {
    expect(classify("Backend Developer", [], "Requirements: 1+ years of experience with Node.js")).toEqual({
      level: "junior",
      reason: "Pide 1+ años de experiencia",
    });
    expect(classify("Backend Developer", [], "3-5 years of experience")).toMatchObject({ level: "mid" });
    expect(classify("Backend Developer", [], "7+ years of hands-on experience")).toMatchObject({
      level: "senior",
    });
  });

  it("recognizes 'no experience required'", () => {
    expect(classify("Web Developer", [], "No prior experience required, we train you.").level).toBe("junior");
    expect(classify("Desarrollador Web", [], "Buscamos recién egresados con ganas de aprender").level).toBe(
      "junior",
    );
  });

  it("does not mistake 'Internal' or 'Leadership' words for levels", () => {
    expect(classify("Internal Tools Engineer").level).toBe("unknown");
  });
});

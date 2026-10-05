import { describe, expect, it } from "vitest";
import { seniorityFromLabels } from "@/lib/normalize/seniority";
import { isTechRole } from "@/lib/normalize/tech-role";

describe("seniorityFromLabels", () => {
  it.each([
    [["Junior"], "junior"],
    [["Entry-level", "Mid-level"], "junior"],
    [["No experience required"], "junior"],
    [["Semi Senior"], "mid"],
    [["Midweight"], "mid"],
    [["Mid-level"], "mid"],
    [["Senior", "Manager"], "senior"],
    [["Expert"], "senior"],
    [["Any"], "unknown"],
    [[], "unknown"],
  ] as const)("%j → %s", (labels, level) => {
    expect(seniorityFromLabels(labels)).toBe(level);
  });
});

describe("isTechRole", () => {
  // Real titles from the fixtures.
  it.each([
    ["Desarrollador(a) Full-Stack", []],
    ["Software Developer Full-Stack React RoR [Contractor]", []],
    ["Ingeniero de Software Senior", []],
    ["Front-end (Angular Flutter)", []],
    ["HR Plus: Web Developer (Fresh graduate welcome)", []],
    ["Tier III Service Desk Engineer", []],
    ["Product Builder", ["Programming"]],
    ["Analista de Datos Jr", []],
  ])("tech: %s", (title, categories) => {
    expect(isTechRole(title, categories)).toBe(true);
  });

  it.each([
    ["Contract Accounts Payable Manager", ["Full-Stack Programming"]],
    ["Federal Business Development Director", ["infosec", "cloud"]],
    ["Sales Development Representative (SDR)", ["Programming"]],
    ["UX/UI Designer", ["Design / UX"]],
    ["AI Response Evaluator", ["Artificial Intelligence"]],
    ["Junior Crypto Analyst & Trader", ["crypto", "finance"]],
    ["Customer Success (Junior/SSR)", ["Customer Support"]],
    ["Ingeniero Trainee Industrial", ["Operations / Admin"]],
    ["Mecánico Automotriz Diagnóstico y Presupuestos", []],
  ])("not tech: %s", (title, categories) => {
    expect(isTechRole(title, categories)).toBe(false);
  });
});

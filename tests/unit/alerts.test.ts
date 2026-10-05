import { describe, expect, it } from "vitest";
import type { JobRow, SavedSearch } from "@/db/schema";
import { describeFilters, filtersFromQuery } from "@/lib/alerts/describe";
import { buildDigestEmail } from "@/lib/alerts/digest-email";
import { unsubscribeToken, verifyUnsubscribeToken } from "@/lib/alerts/unsubscribe";
import { safeNext } from "@/lib/auth/magic-link";

describe("unsubscribe tokens", () => {
  it("round-trips and rejects tampering", () => {
    const token = unsubscribeToken(42, "secret-a");
    expect(verifyUnsubscribeToken(token, "secret-a")).toBe(42);
    expect(verifyUnsubscribeToken(token.replace(/^42/, "43"), "secret-a")).toBeNull();
    expect(verifyUnsubscribeToken(token, "secret-b")).toBeNull();
    expect(verifyUnsubscribeToken("garbage", "secret-a")).toBeNull();
    expect(verifyUnsubscribeToken("", "secret-a")).toBeNull();
  });
});

describe("describeFilters", () => {
  it("summarizes filters in Spanish", () => {
    expect(describeFilters(filtersFromQuery("?q=react&nivel=junior&mexico=si&tech=nodejs&sueldo=1500"))).toBe(
      "“react” · Junior · Acepta México · Node.js · USD 1,500+/mes",
    );
    expect(describeFilters({})).toBe("Todas las vacantes");
  });

  it("drops pagination and invalid params", () => {
    expect(filtersFromQuery("?pagina=3&nivel=ceo&q=go")).toEqual({ q: "go" });
  });
});

describe("safeNext", () => {
  it("only allows same-site paths", () => {
    expect(safeNext("/alertas/nueva?q=react")).toBe("/alertas/nueva?q=react");
    expect(safeNext("https://evil.com")).toBeNull();
    expect(safeNext("//evil.com")).toBeNull();
    expect(safeNext("/\\evil.com")).toBeNull();
    expect(safeNext(null)).toBeNull();
  });
});

describe("buildDigestEmail", () => {
  const search = { id: 7, name: "React <junior>", query: "?q=react" } as SavedSearch;
  const job = {
    id: 99,
    title: '<img src=x onerror="alert(1)">Frontend Dev',
    company: "Acme & Co",
    source: "getonbrd",
    seniority: "junior",
    acceptsMexico: "yes",
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
  } as JobRow;

  it("escapes third-party text, links through the click counter and supports one-click unsubscribe", () => {
    const email = buildDigestEmail("ana@example.com", [{ search, jobs: [job] }]);
    expect(email.subject).toBe("1 vacante nueva para ti — Radar Remoto");
    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("&lt;img src=x");
    expect(email.html).toContain("Acme &amp; Co");
    expect(email.html).toContain("React &lt;junior&gt;");
    expect(email.html).toContain("/r/99?via=email");
    expect(email.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(email.text).toContain("/baja?token=7.");
  });
});

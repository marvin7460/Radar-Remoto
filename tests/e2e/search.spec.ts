import { expect, test } from "@playwright/test";

const resultCount = (page: import("@playwright/test").Page) =>
  page
    .getByTestId("result-count")
    .textContent()
    .then((text) => Number(text!.replace(/\D/g, "")));

test("lists jobs with source attribution", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Radar Remoto" })).toBeVisible();
  expect(await resultCount(page)).toBeGreaterThan(20);
  await expect(page.getByRole("article").first().getByText("Publicada en")).toBeVisible();
});

test("searches by text", async ({ page }) => {
  await page.goto("/");
  const all = await resultCount(page);

  await page.getByRole("searchbox", { name: "Buscar" }).fill("react");
  await page.getByRole("button", { name: "Buscar" }).click();

  await expect(page).toHaveURL(/q=react/);
  const matches = await resultCount(page);
  expect(matches).toBeGreaterThan(0);
  expect(matches).toBeLessThan(all);
  await expect(page.getByRole("article").first()).toContainText(/react/i);
});

test("filters by level and Mexico, and keeps filters in the URL", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Nivel").selectOption("senior");
  await page.getByLabel("¿Acepta México?").selectOption("si");
  await page.getByRole("button", { name: "Buscar" }).click();

  await expect(page).toHaveURL(/nivel=senior/);
  await expect(page).toHaveURL(/mexico=si/);
  const cards = page.getByRole("article");
  expect(await cards.count()).toBeGreaterThan(0);
  for (const card of await cards.all()) {
    await expect(card).toContainText("Senior");
    await expect(card).toContainText("Acepta México");
  }

  // Shared link: same filters, form pre-filled.
  await page.reload();
  await expect(page.getByLabel("Nivel")).toHaveValue("senior");
});

test("shows an empty state when nothing matches", async ({ page }) => {
  await page.goto("/?q=zzzznoexiste");
  await expect(page.getByText("No encontramos vacantes con esos filtros")).toBeVisible();
});

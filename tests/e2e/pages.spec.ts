import { expect, test } from "@playwright/test";

test("status page shows every source and impact metrics", async ({ page }) => {
  await page.goto("/estado");
  await expect(page.getByRole("heading", { name: "Estado del sistema" })).toBeVisible();
  for (const source of ["Get on Board", "Himalayas", "Jobicy", "Remotive", "We Work Remotely", "Remote OK"]) {
    await expect(page.getByRole("cell", { name: source, exact: true })).toBeVisible();
  }
  await expect(page.getByText("Vacantes abiertas")).toBeVisible();
});

test("technology pages and the sitemap", async ({ page, request }) => {
  await page.goto("/tecnologia/react");
  await expect(page.getByRole("heading", { name: "Vacantes remotas de React" })).toBeVisible();
  await expect(page).toHaveTitle(/Vacantes remotas de React para Latinoamérica/);
  expect((await page.goto("/tecnologia/no-existe"))?.status()).toBe(404);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/tecnologia/react");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
});

test("email links count the click and redirect to the source", async ({ request }) => {
  const res = await request.get("/r/1?via=email", { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  expect(res.headers().location).toMatch(/^https:\/\//);
  expect((await request.get("/r/999999", { maxRedirects: 0 })).status()).toBe(404);
});

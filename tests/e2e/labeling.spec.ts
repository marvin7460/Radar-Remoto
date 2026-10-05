import { expect, test } from "@playwright/test";
import { E2E_ADMIN_TOKEN } from "../../playwright.config";

test("admin labels a job with the keyboard", async ({ page }) => {
  await page.goto("/admin/etiquetar");
  await expect(page).toHaveURL(/\/admin$/);

  await page.getByLabel("Token").fill("wrong-token-wrong-token");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Token incorrecto.")).toBeVisible();

  await page.getByLabel("Token").fill(E2E_ADMIN_TOKEN);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin\/etiquetar$/);
  await expect(page.getByText("0 de 200 etiquetadas")).toBeVisible();

  const firstTitle = await page.getByRole("heading", { level: 2 }).textContent();
  await page.keyboard.press("1");
  await page.keyboard.press("s");
  await expect(page.getByRole("button", { name: /Junior/ })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Enter");

  await expect(page.getByText("1 de 200 etiquetadas")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2 })).not.toHaveText(firstTitle!);
});

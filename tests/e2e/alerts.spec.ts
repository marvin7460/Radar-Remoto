import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { E2E_OUTBOX } from "../../playwright.config";

function latestEmail(kind: string): { to: string; text: string } {
  const files = readdirSync(E2E_OUTBOX)
    .filter((file) => file.endsWith(`-${kind}.json`))
    .sort();
  return JSON.parse(readFileSync(path.join(E2E_OUTBOX, files.at(-1)!), "utf8"));
}

test("creates an alert from a search, signing in with a magic link", async ({ page }) => {
  await page.goto("/?q=react&nivel=junior");
  await page.getByRole("link", { name: "Crear alerta con esta búsqueda" }).click();

  // Not signed in yet: the sign-in page remembers where we were going.
  await expect(page).toHaveURL(/\/entrar\?next=/);
  await page.getByLabel("Correo").fill("ana@example.com");
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  await expect(page.getByRole("status")).toContainText("te llegará un enlace");

  const email = latestEmail("login");
  expect(email.to).toBe("ana@example.com");
  const link = /https?:\/\/\S+\/entrar\/verificar\?token=[\w-]+/.exec(email.text)![0];

  await page.goto(link);
  await page.getByRole("button", { name: "Entrar a Radar Remoto" }).click();

  await expect(page).toHaveURL(/\/alertas\/nueva\?q=react&nivel=junior/);
  await expect(page.getByLabel("Nombre de la alerta")).toHaveValue("“react” · Junior");
  await page.getByRole("button", { name: "Guardar alerta" }).click();

  await expect(page).toHaveURL(/\/alertas\?creada=1/);
  await expect(page.getByRole("link", { name: "“react” · Junior" })).toBeVisible();

  await page.getByRole("button", { name: "Pausar" }).click();
  await expect(page.getByText("Pausada")).toBeVisible();

  // The link was single-use.
  await page.goto(link);
  await page.getByRole("button", { name: "Entrar a Radar Remoto" }).click();
  await expect(page.getByText("Ese enlace ya se usó o caducó")).toBeVisible();
});

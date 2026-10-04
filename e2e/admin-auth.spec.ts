import { expect, test } from "@playwright/test";

import {
  adminPassword,
  adminUsername,
} from "../scripts/e2e/constants";
import { readE2eState } from "../scripts/e2e/state";

test("admin returns to the requested page after signing in", async ({ page }) => {
  const state = await readE2eState();

  test.skip(
    !state.adminAuthAvailable,
    "Admin credentials are only guaranteed for the managed E2E stack. Set E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD to enable this against a reused dev stack.",
  );

  await page.goto("/admin/players?view=all");
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(new URL(page.url()).searchParams.get("next")).toBe("/admin/players?view=all");
  await page
    .getByLabel("Username")
    .fill(process.env.E2E_ADMIN_USERNAME ?? adminUsername);
  await page
    .getByLabel("Password")
    .fill(process.env.E2E_ADMIN_PASSWORD ?? adminPassword);
  await page.locator("form").getByRole("button", { name: "Sign In" }).click();

  await expect(page).toHaveURL(/\/admin\/players\?view=all$/);
  await expect(
    page.getByRole("heading", { name: "Players" }),
  ).toBeVisible();
});

test("onboarding login preserves its destination", async ({ page }) => {
  await page.goto("/onboarding?next=/waiting");
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(new URL(page.url()).searchParams.get("next")).toBe("/onboarding?next=/waiting");
});

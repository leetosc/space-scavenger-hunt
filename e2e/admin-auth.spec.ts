import { expect, test } from "@playwright/test";

import {
  adminPassword,
  adminUsername,
} from "../scripts/e2e/constants";
import { readE2eState } from "../scripts/e2e/state";

test("admin can sign in and reach mission control", async ({ page }) => {
  const state = await readE2eState();

  test.skip(
    !state.adminAuthAvailable,
    "Admin credentials are only guaranteed for the managed E2E stack. Set E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD to enable this against a reused dev stack.",
  );

  await page.goto("/login?next=/admin");
  await page
    .getByLabel("Username")
    .fill(process.env.E2E_ADMIN_USERNAME ?? adminUsername);
  await page
    .getByLabel("Password")
    .fill(process.env.E2E_ADMIN_PASSWORD ?? adminPassword);
  await page.locator("form").getByRole("button", { name: "Sign In" }).click();

  await expect(page).toHaveURL(/\/admin/);
  await expect(
    page.getByRole("heading", { name: "Mission Control" }),
  ).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Space Scavenger Hunt" }),
  ).toBeVisible();
});

test("login page renders the sign-in form", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByLabel("Username")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(
    page.locator("form").getByRole("button", { name: "Sign In" }),
  ).toBeVisible();
});

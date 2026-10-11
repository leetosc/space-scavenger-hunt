import { expect, test, type Page } from "@playwright/test";

const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZxkAAAAASUVORK5CYII=", "base64");
const user = { id: "admin", name: "Mission Control", email: "admin@example.test", username: "admin", role: "ADMIN" };
const me = { user, player: { id: "player", name: user.name, teamId: null, isCheckedIn: true } };
const teams = [
  { id: "team-red", name: "Red Rockets", color: "#dc2626", icon: null, signalBoostBalance: 2 },
  { id: "team-blue", name: "Blue Comets", color: "#2563eb", icon: null, signalBoostBalance: 2 },
];

async function mockSession(page: Page) {
  await page.route("**/api/auth/get-session**", route => route.fulfill({ json: {
    user,
    session: { id: "session", userId: user.id, token: "test", expiresAt: new Date(Date.now() + 86400000).toISOString() },
  } }));
}

async function mockRpc(page: Page, handler: (name: string) => unknown) {
  await page.route("**/trpc/**", async route => {
    const url = new URL(route.request().url());
    const names = decodeURIComponent(url.pathname.split("/trpc/")[1]!).split(",");
    const results = names.map(name => ({ result: { data: handler(name) } }));
    await route.fulfill({ json: url.searchParams.get("batch") ? results : results[0] });
  });
}

function formField(body: string, field: string) {
  return body.match(new RegExp(`name="${field}"(?:; filename="([^"]*)")?\\r\\n(?:[^\\r]*\\r\\n)*?\\r\\n([^\\r]*)`))?.slice(1);
}

test("admin bulk upload sends each photo's team", async ({ page }) => {
  await mockSession(page);
  await mockRpc(page, name => {
    if (name === "player.me") return me;
    if (name === "hint.adminList") return { maxRevealLevel: 3, hints: [], teams };
    if (name === "hint.adminLedger") return [];
    return null;
  });
  const uploads = new Map<string, string>();
  await page.route("**/api/location-hints/upload", async route => {
    const body = route.request().postDataBuffer()!.toString("latin1");
    uploads.set(formField(body, "image")![0]!, formField(body, "teamId")![1]!);
    await route.fulfill({ json: { hint: {} } });
  });

  await page.goto("/admin/hints");
  await page.getByLabel("Team for this batch").selectOption({ label: "Red Rockets" });
  await page.locator('input[type="file"][multiple]').setInputFiles([
    { name: "garden.png", mimeType: "image/png", buffer: image },
    { name: "kitchen.png", mimeType: "image/png", buffer: image },
    { name: "porch.png", mimeType: "image/png", buffer: image },
  ]);
  await expect(page.getByText("Red Rockets ×3")).toBeVisible();

  await page.getByLabel("Team for kitchen.png").selectOption({ label: "Blue Comets" });
  await page.getByLabel("Team for porch.png").selectOption({ label: "All teams (shared)" });
  await expect(page.getByText("Red Rockets ×1")).toBeVisible();
  await expect(page.getByText("Blue Comets ×1")).toBeVisible();
  await expect(page.getByText("Shared ×1")).toBeVisible();

  await page.getByRole("button", { name: "Upload all" }).click();
  await expect(page.getByText("3 location hints uploaded")).toBeVisible();
  expect(Object.fromEntries(uploads)).toEqual({
    "garden.png": "team-red",
    "kitchen.png": "team-blue",
    "porch.png": "",
  });
});

import { expect, test, type Page } from "@playwright/test";

const user = { id: "guest", name: "Rating Guest", email: "guest@example.test", username: "guest", role: "PLAYER" };
const me = { user, player: { id: "player", name: user.name, teamId: "team", isCheckedIn: true } };
const feedback = "Stellar teamwork! Your moon landing pose earns 4 stars from Mission Control.";

function attempt(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: "attempt", teamId: "team", astronautId: "astronaut", scannedByPlayerId: "player",
    status: "APPROVED", taskPrompt: "Pose together as if you just landed on the Moon.",
    imageUrl: null, imageBlobName: null, imageMimeType: null, imageSizeBytes: null,
    aiPassed: true, aiConfidence: null, aiRating: 4, aiFeedback: feedback, aiRawResponse: null,
    createdAt: now, submittedAt: now, reviewedAt: now, expiresAt: null,
    astronaut: { id: "astronaut", name: "Cosmo McStardust" },
    team: { id: "team", name: "Moon Crew" },
    claim: null,
    ...overrides,
  };
}

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

function baseRpc(name: string) {
  if (name === "player.me") return me;
  if (name === "player.getOnboardingStatus") return { isComplete: true };
  if (name.startsWith("activity.")) return { status: "ACTIVE" };
  return null;
}

test("approved attempt shows its star rating and friendly justification", async ({ page }) => {
  await mockSession(page);
  await mockRpc(page, name => name === "attempt.getById" ? { attempt: attempt(), canEdit: true } : baseRpc(name));
  await page.goto("/attempt/attempt");
  await expect(page.getByRole("paragraph").filter({ hasText: /^Approved$/ })).toBeVisible();
  await expect(page.getByRole("img", { name: "Rated 4 out of 5 stars" })).toBeVisible();
  await expect(page.getByText(feedback)).toBeVisible();
});

test("rejected attempt shows feedback without stars", async ({ page }) => {
  const rejection = "Mission Control couldn't spot any astronauts in this photo. Gather your crew and try again!";
  await mockSession(page);
  await mockRpc(page, name => name === "attempt.getById"
    ? { attempt: attempt({ status: "REJECTED", aiPassed: false, aiRating: null, aiFeedback: rejection }), canEdit: true }
    : baseRpc(name));
  await page.goto("/attempt/attempt");
  await expect(page.getByRole("paragraph").filter({ hasText: /^Rejected$/ })).toBeVisible();
  await expect(page.getByText(rejection)).toBeVisible();
  await expect(page.getByRole("img", { name: /out of 5 stars/ })).toHaveCount(0);
});

test("submissions feed shows star ratings on the card and in the dialog", async ({ page }) => {
  await mockSession(page);
  await mockRpc(page, name => name === "attempt.listCompleted" ? [attempt()] : baseRpc(name));
  await page.goto("/submissions");
  await expect(page.getByRole("img", { name: "Rated 4 out of 5 stars" })).toBeVisible();
  await page.getByRole("button", { name: /Cosmo McStardust/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Mission rating")).toBeVisible();
  await expect(dialog.getByRole("img", { name: "Rated 4 out of 5 stars" })).toBeVisible();
  await expect(dialog.getByText(feedback)).toBeVisible();
});

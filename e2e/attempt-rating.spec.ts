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
    astronaut: { id: "astronaut", name: "Cosmo McStardust", code: "cosmo" },
    team: { id: "team", name: "Moon Crew" },
    claim: null,
    ...overrides,
  };
}

async function mockSession(page: Page, sessionUser = user) {
  await page.route("**/api/auth/get-session**", route => route.fulfill({ json: {
    user: sessionUser,
    session: { id: "session", userId: sessionUser.id, token: "test", expiresAt: new Date(Date.now() + 86400000).toISOString() },
  } }));
}

async function mockRpc(page: Page, handler: (name: string, input: { status?: string } | undefined) => unknown) {
  await page.route("**/trpc/**", async route => {
    const url = new URL(route.request().url());
    const names = decodeURIComponent(url.pathname.split("/trpc/")[1]!).split(",");
    const input = JSON.parse(url.searchParams.get("input") || "{}");
    const results = names.map((name, index) => ({ result: { data: handler(name, url.searchParams.get("batch") ? input[index] : input) } }));
    await route.fulfill({ json: url.searchParams.get("batch") ? results : results[0] });
  });
}

function baseRpc(name: string) {
  if (name === "leaderboard.getCurrent") return [];
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

async function mockAdminAttempts(page: Page, attempts = [attempt()]) {
  const admin = { ...user, role: "ADMIN" };
  await mockSession(page, admin);
  await mockRpc(page, (name, input) => {
    if (name === "player.me") return { ...me, user: admin };
    if (name === "attempt.adminList") {
      return attempts
        .filter(item => !input?.status || item.status === input.status)
        .map(item => ({ ...item, scannedByPlayer: me.player }));
    }
    return baseRpc(name);
  });
}

test("admin attempt cards show ratings and reasoning, including older and unreviewed attempts", async ({ page }) => {
  const rejection = "Gather your crew and try again!";
  await mockAdminAttempts(page, [
    attempt(),
    attempt({ id: "rejected", astronaut: { id: "astronaut-rejected", name: "Rejected Astronaut" }, status: "REJECTED", aiPassed: false, aiRating: null, aiFeedback: rejection }),
    attempt({ id: "legacy", astronaut: { id: "astronaut-legacy", name: "Legacy Astronaut" }, aiRating: null, aiConfidence: 0.92, aiFeedback: "Crew and astronaut are visible." }),
    attempt({ id: "pending", astronaut: { id: "astronaut-pending", name: "Pending Astronaut" }, status: "PENDING_PHOTO", aiPassed: null, aiRating: null, aiFeedback: null }),
  ]);
  await page.goto("/admin/attempts");
  const approved = page.getByRole("button", { name: /Cosmo McStardust/ });
  await expect(approved.getByRole("img", { name: "Rated 4 out of 5 stars" })).toBeVisible();
  await expect(approved.getByText(feedback)).toBeVisible();
  const rejected = page.getByRole("button", { name: /Rejected Astronaut/ });
  await expect(rejected.getByText("Failed", { exact: true })).toBeVisible();
  await expect(rejected.getByText(rejection)).toBeVisible();
  await expect(rejected.getByRole("img", { name: /out of 5 stars/ })).toHaveCount(0);
  const legacy = page.getByRole("button", { name: /Legacy Astronaut/ });
  await expect(legacy.getByText("Confidence: 92%")).toBeVisible();
  await expect(legacy.getByText("Crew and astronaut are visible.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Pending Astronaut/ }).getByText("Not reviewed yet")).toBeVisible();
  await approved.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("img", { name: "Rated 4 out of 5 stars" })).toBeVisible();
  await expect(dialog.getByText(feedback)).toBeVisible();
});

test("submissions modal links astronaut names to their astronaut page", async ({ page }) => {
  await mockSession(page);
  await mockRpc(page, name => name === "attempt.listCompleted" ? [attempt()] : baseRpc(name));
  await page.goto("/submissions");
  await page.getByRole("button", { name: /Cosmo McStardust/ }).click();
  const links = page.getByRole("dialog").getByRole("link", { name: "Cosmo McStardust" });
  await expect(links).toHaveCount(2);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("href", "/astronaut/cosmo");
  }
});

test("submissions sort by team and rating while keeping unrated attempts last", async ({ page }) => {
  const attempts = [
    attempt({ id: "unrated", taskPrompt: "Unrated mission", team: { id: "alpha", name: "Alpha Crew" }, aiRating: null }),
    attempt({ id: "low", taskPrompt: "Low-rated mission", team: { id: "zulu", name: "Zulu Crew" }, aiRating: 2 }),
    attempt({ id: "high", taskPrompt: "High-rated mission", team: { id: "alpha", name: "Alpha Crew" }, aiRating: 5 }),
    attempt({ id: "rejected", taskPrompt: "Rejected mission", team: { id: "moon", name: "Moon Crew" }, status: "REJECTED", aiRating: 5 }),
  ];
  await mockSession(page);
  await mockRpc(page, name => name === "attempt.listCompleted" ? attempts : baseRpc(name));
  await page.goto("/submissions");
  const prompts = page.getByRole("article").getByRole("heading", { level: 2 });
  const newest = ["Unrated mission", "Low-rated mission", "High-rated mission", "Rejected mission"];
  await expect(prompts).toHaveText(newest);
  const sort = page.getByRole("combobox", { name: "Sort by" });
  await sort.selectOption("team-asc");
  await expect(prompts).toHaveText(["Unrated mission", "High-rated mission", "Rejected mission", "Low-rated mission"]);
  await sort.selectOption("team-desc");
  await expect(prompts).toHaveText(["Low-rated mission", "Rejected mission", "Unrated mission", "High-rated mission"]);
  await sort.selectOption("rating-desc");
  await expect(prompts).toHaveText(["High-rated mission", "Low-rated mission", "Unrated mission", "Rejected mission"]);
  await sort.selectOption("rating-asc");
  await expect(prompts).toHaveText(["Low-rated mission", "High-rated mission", "Unrated mission", "Rejected mission"]);
  await sort.selectOption("newest");
  await expect(prompts).toHaveText(newest);
});

test("admin attempt tab survives reload and browser history while preserving other URL state", async ({ page }) => {
  await mockAdminAttempts(page, [
    attempt(),
    attempt({ id: "rejected", astronaut: { id: "astronaut-rejected", name: "Rejected Astronaut" }, status: "REJECTED", aiPassed: false, aiRating: null, aiFeedback: "Try again!" }),
  ]);
  await page.goto("/admin/attempts?tab=APPROVED&view=grid#review");
  const approvedTab = page.getByRole("button", { name: "Approved", exact: true });
  const rejectedTab = page.getByRole("button", { name: "Rejected", exact: true });
  await expect(approvedTab).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Cosmo McStardust/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Rejected Astronaut/ })).toHaveCount(0);
  await rejectedTab.click();
  await expect(page).toHaveURL(/\?tab=REJECTED&view=grid#review$/);
  await expect(rejectedTab).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Rejected Astronaut/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Cosmo McStardust/ })).toHaveCount(0);
  await page.reload();
  await expect(rejectedTab).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Rejected Astronaut/ })).toBeVisible();
  await page.goBack();
  await expect(approvedTab).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Cosmo McStardust/ })).toBeVisible();
  await page.goForward();
  await expect(rejectedTab).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page).toHaveURL(/\?tab=all&view=grid#review$/);
  await expect(page.getByRole("button", { name: /Cosmo McStardust/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Rejected Astronaut/ })).toBeVisible();
});

test("admin attempt tabs default to All for a missing or invalid query value", async ({ page }) => {
  await mockAdminAttempts(page);
  for (const path of ["/admin/attempts", "/admin/attempts?tab=invalid"]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /Cosmo McStardust/ })).toBeVisible();
  }
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

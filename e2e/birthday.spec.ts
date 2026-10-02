import { expect, test, type Page } from "@playwright/test";
import { readE2eState } from "../scripts/e2e/state";
import { adminPassword, adminUsername, apiUrl, webUrl } from "../scripts/e2e/constants";

const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZxkAAAAASUVORK5CYII=", "base64");
const user = { id: "guest", name: "Birthday Guest", email: "guest@example.test", username: "guest", role: "ADMIN" };
const me = { user, player: { id: "player", name: user.name, teamId: "team", isCheckedIn: true } };
const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", error => errors.push(error.message));
});

test.afterEach(({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

async function mockSession(page: Page) {
  await page.route("**/api/auth/get-session**", route => route.fulfill({ json: {
    user,
    session: { id: "session", userId: user.id, token: "test", expiresAt: new Date(Date.now() + 86400000).toISOString() },
  } }));
}

async function mockRpc(page: Page, handler: (name: string, input: any) => unknown) {
  await page.route("**/trpc/**", async route => {
    const url = new URL(route.request().url());
    const names = decodeURIComponent(url.pathname.split("/trpc/")[1]!).split(",");
    const input = route.request().method() === "POST" ? route.request().postDataJSON() : JSON.parse(url.searchParams.get("input") || "{}");
    const results = names.map((name, i) => ({ result: { data: handler(name, input?.[i]) } }));
    await route.fulfill({ json: url.searchParams.get("batch") ? results : results[0] });
  });
}

test("guest checks in without fun facts and joins the real batch kickoff", async ({ page, request }) => {
  const state = await readE2eState();
  test.skip(state.mode !== "managed", "Registration test uses only the isolated E2E database.");
  await page.goto("/signup?next=/waiting");
  await page.getByLabel("First name").fill("Birthday");
  await page.getByLabel("Last name").fill("Guest");
  await page.getByLabel("Username", { exact: true }).fill(`birthday${Date.now()}`);
  await page.getByLabel("Password", { exact: true }).fill("birthday-test-password");
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByRole("heading", { name: "Luke & Leo’s Birthday Mission" })).toBeVisible();
  await expect(page.locator("textarea")).toHaveCount(0);
  await page.getByRole("button", { name: "Join the mission" }).click();
  await expect(page).toHaveURL(/\/waiting/);

  // Exercise the real kickoff endpoints on the isolated stack. Other birthday
  // tests mock their game state, so they do not compete for these assignments.
  const signIn = await request.post(`${apiUrl}/api/auth/sign-in/username`, {
    headers: { Origin: webUrl },
    data: { username: adminUsername, password: adminPassword },
  });
  expect(signIn.ok()).toBe(true);
  async function mutate(name: string, input: object = {}) {
    const response = await request.post(`${apiUrl}/trpc/${name}`, { data: input });
    expect(response.ok(), await response.text()).toBe(true);
    return (await response.json()).result.data;
  }
  for (let i = 0; i < 4; i++) {
    const team = await mutate("team.create", { name: `Birthday crew ${i}`, color: "#22d3ee" });
    expect(team.signalBoostBalance).toBe(2);
  }
  await mutate("kickoff.startAssignment");
  const batch = await mutate("kickoff.assignTeams");
  expect(batch.assignedCount).toBe(1);
  const repeated = await mutate("kickoff.assignTeams");
  expect(repeated.assignedCount).toBe(0);
  expect(repeated.batchId).toBe(batch.batchId);
  await mutate("kickoff.resetAssignments");
  const newBatch = await mutate("kickoff.assignTeams");
  expect(newBatch.assignedCount).toBe(1);
  expect(newBatch.batchId).not.toBe(batch.batchId);
  expect((await mutate("kickoff.beginActivity", { timeLimitMinutes: 30 })).status).toBe("ACTIVE");
  const forbiddenReset = await request.post(`${apiUrl}/trpc/kickoff.resetAssignments`, { data: {} });
  expect(forbiddenReset.status()).toBe(400);
  const guestAssignment = await page.request.post(`${apiUrl}/trpc/kickoff.assignTeams`, { data: {} });
  expect(guestAssignment.status()).toBe(403);
});

test("one batch moves every username into its team simultaneously", async ({ page }, testInfo) => {
  await mockSession(page);
  const players = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, name: `guest${i}` }));
  let assigned = false;
  await mockRpc(page, name => {
    if (name === "player.me") return me;
    if (name === "kickoff.assignTeams") { assigned = true; return { batchId: "birthday-batch", assignedCount: 8 }; }
    if (name === "kickoff.getDisplayState") return {
      status: "TEAM_ASSIGNMENT", assignmentBatchId: assigned ? "birthday-batch" : null,
      totalPlayers: 8, assignedCount: assigned ? 8 : 0,
      unassignedPlayers: assigned ? [] : players,
      teams: [0, 1].map(i => ({ id: `team${i}`, name: `Crew ${i + 1}`, color: i ? "#a78bfa" : "#22d3ee", icon: "Rocket", players: assigned ? players.filter((_, index) => index % 2 === i) : [] })),
    };
    return null;
  });
  await page.goto("/kickoff");
  await expect(page.getByLabel("Unassigned crew").getByText("guest7", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Assign all teams" }).click();
  await expect(page.getByText("Mixing up the crews…")).toBeVisible();
  await expect(page.getByText("Everyone, to your spaceships!")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("simultaneous-reveal.png"), animations: "allow" });
  const teams = page.getByLabel("Mission teams");
  for (const player of players) await expect(teams.getByText(player.name, { exact: true })).toBeAttached();
  // All eight destinations exist in the same flying phase rather than a one-at-a-time queue.
  await expect(page.getByText("Everyone, to your spaceships!")).toBeVisible();
  await expect(page.getByText("8 / 8 astronauts deployed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Assign all teams" })).toBeDisabled();
  await page.reload();
  await expect(page.getByText("8 / 8 astronauts deployed")).toBeVisible();
  await expect(page.getByText("Mixing up the crews…")).toHaveCount(0);
});

test("mobile selfie upload shows earned boost and keeps the other twin available", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSession(page);
  let uploaded = false;
  await mockRpc(page, name => {
    if (name === "player.me") return me;
    if (name === "player.getOnboardingStatus") return { isComplete: true };
    if (name.startsWith("activity.")) return { status: "ACTIVE" };
    if (name === "hint.listForTeam") return { balance: uploaded ? 3 : 2, maxRevealLevel: 3, hints: [] };
    if (name === "selfie.mine") return uploaded ? [{ id: "selfie", twin: "LUKE", activeKey: "player:LUKE", status: "APPROVED", imageBlobName: "selfie.jpg", aiFeedback: "Great birthday photo!", credit: { state: "AVAILABLE" } }] : [];
    return null;
  });
  await page.route("**/api/selfies/*/photo", route => route.fulfill({ contentType: "image/png", body: image }));
  await page.route("**/api/selfies/upload", async route => {
    expect(route.request().postData()).toContain("LUKE");
    uploaded = true;
    await route.fulfill({ json: { status: "APPROVED", feedback: "Great birthday photo!" } });
  });
  await page.goto("/hints");
  await expect(page.getByRole("heading", { name: "Birthday bonus missions" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("mobile-selfie-missions.png"), fullPage: true });
  await page.getByLabel("Choose selfie with Luke", { exact: true }).setInputFiles({ name: "selfie.png", mimeType: "image/png", buffer: image });
  await expect(page.getByAltText("Selfie with Luke", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Submit selfie with Luke" }).click();
  await expect(page.getByText("Boost earned!", { exact: true })).toBeVisible();
  await expect(page.getByText("3 Signal Boosts", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Take selfie", exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Take selfie", exact: true })).toBeEnabled();
  expect(await page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")).toBe(true);
});

test("admin rejection shows review feedback and revoked spent reward", async ({ page }) => {
  await mockSession(page);
  let rejected = false;
  await mockRpc(page, (name, input) => {
    if (name === "player.me") return me;
    if (name === "selfie.reject") { expect(input).toEqual({ id: "selfie", reason: "This is Leo, not Luke" }); rejected = true; return {}; }
    if (name === "selfie.adminList") return [{
      id: "selfie", player: { name: "Birthday Guest" }, team: { name: "Moon Crew" }, twin: "LUKE", createdAt: new Date().toISOString(),
      status: rejected ? "REJECTED" : "APPROVED", imageBlobName: "selfie.jpg", aiPassed: true, aiConfidence: 0.98, aiFeedback: "Baby and guest visible.",
      credit: { state: rejected ? "REVOKED" : "SPENT", locationHint: { id: "garden", title: "Garden" } },
      rejectionReason: rejected ? "This is Leo, not Luke" : null, reviews: [],
    }];
    return null;
  });
  await page.route("**/api/selfies/*/photo", route => route.fulfill({ contentType: "image/png", body: image }));
  await page.goto("/admin/selfies");
  await expect(page.getByRole("heading", { name: "Birthday Selfies", exact: true })).toBeVisible();
  await expect(page.getByText("Boost: spent · Garden")).toBeVisible();
  await page.getByLabel("Rejection reason").fill("This is Leo, not Luke");
  await page.getByRole("button", { name: "Reject selfie", exact: true }).click();
  await expect(page.getByText("Boost: revoked · Garden")).toBeVisible();
  await expect(page.getByText("Admin: This is Leo, not Luke")).toBeVisible();
});

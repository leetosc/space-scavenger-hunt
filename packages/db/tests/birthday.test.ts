import { afterAll, beforeAll, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../prisma/generated/client";
import { grantBoosts, removeAvailableBoosts, spendBoost } from "../../api/src/services/boosts";
import { applySelfieJudgement, approveSelfie, rejectSelfie } from "../../api/src/services/selfies";
import { assignTeams } from "../../api/src/services/kickoff/assign-teams";

const dir = mkdtempSync(join(import.meta.dir, "birthday-test-"));
const path = join(dir, "test.db");
const db = new PrismaClient({ adapter: new PrismaLibSql({ url: `file:${path}` }) });
const migrations = join(import.meta.dir, "../prisma/migrations");

beforeAll(() => {
  const sql = new Database(path);
  sql.exec("PRAGMA foreign_keys = ON");
  for (const name of readdirSync(migrations).filter(name => name !== "migration_lock.toml").sort()) {
    sql.exec(readFileSync(join(migrations, name, "migration.sql"), "utf8"));
  }
  sql.close();
});
afterAll(async () => { await db.$disconnect(); rmSync(dir, { recursive: true }); });

async function fixture() {
  const id = crypto.randomUUID();
  const team = await db.team.create({ data: { name: id, joinCode: id, signalBoostBalance: 0 } });
  const player = await db.player.create({ data: { name: "Party guest", teamId: team.id, isCheckedIn: true } });
  const hint = await db.locationHint.create({ data: { title: "Garden" } });
  const selfie = await submit(player.id, team.id, "LUKE");
  return { team, player, hint, selfie };
}
async function submit(playerId: string, teamId: string, twin: string) {
  return db.birthdaySelfie.create({ data: { playerId, teamId, twin, requestId: crypto.randomUUID(), activeKey: `${playerId}:${twin}`, imageBlobName: "test/selfie.jpg" } });
}
async function balance(teamId: string) {
  const team = await db.team.findUniqueOrThrow({ where: { id: teamId } });
  expect(await db.signalBoostCredit.count({ where: { teamId, state: "AVAILABLE" } })).toBe(team.signalBoostBalance);
  return team.signalBoostBalance;
}
function reveal(teamId: string, locationHintId: string) {
  return db.teamLocationHintReveal.findUniqueOrThrow({ where: { teamId_locationHintId: { teamId, locationHintId } } });
}

test("approval and rejection are idempotent; unused rewards are removed and replacements allowed", async () => {
  const { selfie, player, team } = await fixture();
  await db.$transaction(tx => approveSelfie(tx, selfie.id, "admin"));
  await db.$transaction(tx => approveSelfie(tx, selfie.id, "admin"));
  expect(await balance(team.id)).toBe(1);
  expect(await db.signalBoostCredit.count({ where: { selfieId: selfie.id } })).toBe(1);
  await db.$transaction(tx => rejectSelfie(tx, selfie.id, "admin", "Wrong twin"));
  await db.$transaction(tx => rejectSelfie(tx, selfie.id, "admin", "Wrong twin"));
  expect(await balance(team.id)).toBe(0);
  expect(await db.selfieReview.count({ where: { selfieId: selfie.id } })).toBe(2);
  const replacement = await submit(player.id, team.id, "LUKE");
  await db.$transaction(tx => approveSelfie(tx, replacement.id));
  expect(await balance(team.id)).toBe(1);
  await expect(db.$transaction(tx => approveSelfie(tx, selfie.id))).rejects.toThrow("cannot be approved");
});

test("one reward per twin is enforced, including concurrent approvals", async () => {
  const { selfie, player, team } = await fixture();
  await expect(submit(player.id, team.id, "LUKE")).rejects.toThrow();
  const results = await Promise.allSettled([
    db.$transaction(tx => approveSelfie(tx, selfie.id)),
    db.$transaction(tx => approveSelfie(tx, selfie.id)),
  ]);
  expect(results.some(result => result.status === "fulfilled")).toBe(true);
  expect(await balance(team.id)).toBe(1);
  const leo = await submit(player.id, team.id, "LEO");
  await db.$transaction(tx => approveSelfie(tx, leo.id));
  expect(await balance(team.id)).toBe(2);
});

test("rejection reverses only its purchased hint step and preserves other grants", async () => {
  const { selfie, team, hint } = await fixture();
  await db.$transaction(tx => approveSelfie(tx, selfie.id));
  await db.$transaction(tx => spendBoost(tx, team.id, hint.id));
  await db.$transaction(tx => grantBoosts(tx, team.id, 2, "CLAIM_REWARD", "Other rewards"));
  await db.$transaction(tx => spendBoost(tx, team.id, hint.id));
  expect((await reveal(team.id, hint.id)).revealLevel).toBe(2);
  await db.$transaction(tx => rejectSelfie(tx, selfie.id, "admin", "Wrong photo"));
  expect((await reveal(team.id, hint.id)).revealLevel).toBe(1);
  expect(await balance(team.id)).toBe(1);
  await db.$transaction(tx => rejectSelfie(tx, selfie.id, "admin", "Again"));
  expect((await reveal(team.id, hint.id)).revealLevel).toBe(1);
});

test("admin reveal overrides and archived ledger entries survive later rejection", async () => {
  const { selfie, team, hint } = await fixture();
  await db.$transaction(tx => approveSelfie(tx, selfie.id));
  await db.$transaction(tx => spendBoost(tx, team.id, hint.id));
  const original = await reveal(team.id, hint.id);
  await db.teamLocationHintReveal.update({ where: { id: original.id }, data: { revealLevel: 3, version: { increment: 1 } } });
  await db.signalBoostLedger.updateMany({ where: { teamId: team.id }, data: { archivedAt: new Date() } });
  await db.$transaction(tx => rejectSelfie(tx, selfie.id, "admin", "Wrong photo"));
  expect((await reveal(team.id, hint.id)).revealLevel).toBe(3);
  expect(await balance(team.id)).toBe(0);
});

test("admin balance reductions consume credits without double-charging a later rejection", async () => {
  const { selfie, team } = await fixture();
  await db.$transaction(tx => approveSelfie(tx, selfie.id));
  await db.$transaction(tx => removeAvailableBoosts(tx, team.id, 1, "Admin reset"));
  await db.$transaction(tx => rejectSelfie(tx, selfie.id, "admin", "Wrong twin"));
  expect(await balance(team.id)).toBe(0);
  await expect(db.$transaction(tx => removeAvailableBoosts(tx, team.id, 1, "Too much"))).rejects.toThrow("negative");
});

test("old AI-rejected submissions cannot bypass a replacement's reserved slot", async () => {
  const { selfie, player, team } = await fixture();
  await db.birthdaySelfie.update({ where: { id: selfie.id }, data: { status: "AI_REJECTED", activeKey: null } });
  const replacement = await submit(player.id, team.id, "LUKE");
  await expect(db.$transaction(tx => approveSelfie(tx, selfie.id, "admin"))).rejects.toThrow("replacement");
  await db.$transaction(tx => approveSelfie(tx, replacement.id));
  expect(await balance(team.id)).toBe(1);
});

test("AI grants only passing photos; late AI results respect human decisions", async () => {
  const { selfie, player, team } = await fixture();
  await db.$transaction(tx => applySelfieJudgement(tx, selfie.id, { passed: false, confidence: 0.99, feedback: "No baby visible" }));
  expect(await balance(team.id)).toBe(0);
  expect((await db.birthdaySelfie.findUniqueOrThrow({ where: { id: selfie.id } })).activeKey).toBeNull();
  const replacement = await submit(player.id, team.id, "LUKE");
  await db.$transaction(tx => rejectSelfie(tx, replacement.id, "admin", "Wrong twin"));
  await db.$transaction(tx => applySelfieJudgement(tx, replacement.id, { passed: true, confidence: 0.99, feedback: "Baby visible" }));
  expect((await db.birthdaySelfie.findUniqueOrThrow({ where: { id: replacement.id } })).status).toBe("REJECTED");
  expect(await balance(team.id)).toBe(0);
  const leo = await submit(player.id, team.id, "LEO");
  await db.$transaction(tx => approveSelfie(tx, leo.id, "admin"));
  await db.$transaction(tx => applySelfieJudgement(tx, leo.id, { passed: false, confidence: 0.6, feedback: "Not sure" }));
  expect((await db.birthdaySelfie.findUniqueOrThrow({ where: { id: leo.id } })).status).toBe("APPROVED");
  expect(await balance(team.id)).toBe(1);
});

test("human confirmation of an AI approval records review without awarding twice", async () => {
  const { selfie, team } = await fixture();
  await db.$transaction(tx => applySelfieJudgement(tx, selfie.id, { passed: true, confidence: 0.99, feedback: "Looks good" }));
  await db.$transaction(tx => approveSelfie(tx, selfie.id, "admin"));
  await db.$transaction(tx => approveSelfie(tx, selfie.id, "admin"));
  expect(await db.selfieReview.count({ where: { selfieId: selfie.id } })).toBe(1);
  expect(await balance(team.id)).toBe(1);
});

test("deleting a team cleans up its related credits and selfies", async () => {
  const { team, selfie } = await fixture();
  await db.$transaction(tx => approveSelfie(tx, selfie.id));
  await db.team.delete({ where: { id: team.id } });
  expect(await db.signalBoostCredit.count({ where: { teamId: team.id } })).toBe(0);
  expect(await db.birthdaySelfie.count({ where: { teamId: team.id } })).toBe(0);
});

test("rejection and spending racing cannot create debt or retain a revoked reveal", async () => {
  const { selfie, team, hint } = await fixture();
  await db.$transaction(tx => approveSelfie(tx, selfie.id));
  await Promise.allSettled([
    db.$transaction(tx => spendBoost(tx, team.id, hint.id)),
    db.$transaction(tx => rejectSelfie(tx, selfie.id, "admin", "Wrong photo")),
  ]);
  // Retry the admin intent if SQLite rejected a concurrent write.
  await db.$transaction(tx => rejectSelfie(tx, selfie.id, "admin", "Wrong photo"));
  expect(await balance(team.id)).toBe(0);
  const row = await db.teamLocationHintReveal.findFirst({ where: { teamId: team.id, locationHintId: hint.id } });
  expect(row?.revealLevel ?? 0).toBe(0);
});

test("a deleted hint or changed player team does not redirect a reversal", async () => {
  const { selfie, team, hint, player } = await fixture();
  await db.$transaction(tx => approveSelfie(tx, selfie.id));
  await db.$transaction(tx => spendBoost(tx, team.id, hint.id));
  await db.locationHint.delete({ where: { id: hint.id } });
  await db.player.update({ where: { id: player.id }, data: { teamId: null } });
  await db.$transaction(tx => rejectSelfie(tx, selfie.id, "admin", "Wrong photo"));
  expect(await balance(team.id)).toBe(0);
});

test("spending is capped at three reveal steps and keeps balances consistent", async () => {
  const { team, hint } = await fixture();
  await db.$transaction(tx => grantBoosts(tx, team.id, 4, "INITIAL_GRANT", "Test"));
  for (let i = 0; i < 3; i++) await db.$transaction(tx => spendBoost(tx, team.id, hint.id));
  await expect(db.$transaction(tx => spendBoost(tx, team.id, hint.id))).rejects.toThrow("fully revealed");
  expect(await balance(team.id)).toBe(1);
});

test("migration preserves an existing balance and historical spends", () => {
  const sql = new Database(":memory:");
  const names = readdirSync(migrations).filter(name => name !== "migration_lock.toml").sort();
  for (const name of names.slice(0, -1)) sql.exec(readFileSync(join(migrations, name, "migration.sql"), "utf8"));
  sql.exec(`INSERT INTO team (id, name, joinCode, signalBoostBalance, updatedAt) VALUES ('old', 'Old crew', 'old', 3, CURRENT_TIMESTAMP)`);
  sql.exec(`INSERT INTO signal_boost_ledger (id, teamId, type, delta, balanceAfter) VALUES ('spent', 'old', 'HINT_SPEND', -1, 3)`);
  sql.exec(readFileSync(join(migrations, names.at(-1)!, "migration.sql"), "utf8"));
  expect(sql.query("SELECT signalBoostBalance FROM team").get()).toEqual({ signalBoostBalance: 3 });
  expect(sql.query("SELECT count(*) AS n FROM signal_boost_credit WHERE state = 'AVAILABLE'").get()).toEqual({ n: 3 });
  expect(sql.query("SELECT count(*) AS n FROM signal_boost_credit WHERE state = 'SPENT'").get()).toEqual({ n: 1 });
  sql.close();
});

test("all-team assignment is balanced, atomic and safe to repeat", async () => {
  // Fill the existing teams evenly, including the guests created by earlier fixtures.
  const teams = await db.team.findMany();
  await db.activity.create({ data: { name: "Birthday", status: "TEAM_ASSIGNMENT", maxTeams: teams.length } });
  for (let i = 0; i < 17; i++) await db.player.create({ data: { name: `Guest ${i}`, isCheckedIn: true } });
  const result = await db.$transaction(assignTeams);
  expect(result.assignedCount).toBeGreaterThanOrEqual(17);
  expect(result.batchId).toBeTruthy();
  expect(await db.player.count({ where: { teamId: null } })).toBe(0);
  const counts = (await db.team.findMany({ include: { _count: { select: { players: true } } } })).map(t => t._count.players);
  expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  expect((await db.$transaction(assignTeams)).assignedCount).toBe(0);
  expect((await db.activity.findFirstOrThrow()).assignmentBatchId).toBe(result.batchId);
  await db.player.create({ data: { name: "Not checked in" } });
  await expect(db.$transaction(assignTeams)).rejects.toThrow("check in");
  expect((await db.activity.findFirstOrThrow()).assignmentBatchId).toBe(result.batchId);
});

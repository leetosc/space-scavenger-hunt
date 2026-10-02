import type { Prisma } from "@space-scavenger-hunt/db";
import { TRPCError } from "@trpc/server";

export async function assignTeams(tx: Prisma.TransactionClient) {
  const activity = await tx.activity.findFirst({ orderBy: { createdAt: "asc" } });
  if (activity?.status !== "TEAM_ASSIGNMENT") throw new TRPCError({ code: "BAD_REQUEST", message: "Team assignment is not currently active." });
  const players = await tx.player.findMany({ where: { teamId: null } });
  if (!players.length) return { batchId: activity.assignmentBatchId, assignedCount: 0 };
  if (players.some(player => !player.isCheckedIn)) throw new TRPCError({ code: "BAD_REQUEST", message: "All players must check in before assigning teams." });
  const teams = await tx.team.findMany({ include: { _count: { select: { players: true } } } });
  const expected = activity.maxTeams;
  if (teams.length !== expected) throw new TRPCError({ code: "BAD_REQUEST", message: `Expected exactly ${expected} teams. Configure teams before kickoff.` });
  // Fisher–Yates; assign each guest to a random smallest team.
  for (let i = players.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [players[i], players[j]] = [players[j]!, players[i]!];
  }
  for (const player of players) {
    const min = Math.min(...teams.map(team => team._count.players));
    const smallest = teams.filter(team => team._count.players === min);
    const team = smallest[Math.floor(Math.random() * smallest.length)]!;
    await tx.player.update({ where: { id: player.id }, data: { teamId: team.id } });
    team._count.players++;
  }
  const batchId = crypto.randomUUID();
  await tx.activity.update({ where: { id: activity.id }, data: { assignmentBatchId: batchId } });
  return { batchId, assignedCount: players.length };
}

import prisma from "@space-scavenger-hunt/db";

import { DEFAULT_MAX_TEAMS } from "../activity";

export type AssignNextPlayerResult = {
  player: { id: string; name: string };
  team: { id: string; name: string; color: string | null };
  remainingPlayers: number;
} | null;

export async function assignNextPlayer(): Promise<AssignNextPlayerResult> {
  return prisma.$transaction(async (tx) => {
    const activity = await tx.activity.findFirst({ orderBy: { createdAt: "asc" } });
    if (!activity || activity.status !== "TEAM_ASSIGNMENT") {
      throw new Error("Team assignment is not currently active.");
    }
    const maxTeams = activity.maxTeams ?? DEFAULT_MAX_TEAMS;

    const unassigned = await tx.player.findMany({ where: { teamId: null } });
    if (unassigned.length === 0) return null;

    const chosenPlayer = unassigned[Math.floor(Math.random() * unassigned.length)]!;

    const teams = await tx.team.findMany({
      include: {
        _count: { select: { players: true } },
      },
    });
    if (teams.length !== maxTeams) {
      throw new Error(`Expected exactly ${maxTeams} teams. Configure teams before kickoff.`);
    }

    const minCount = Math.min(...teams.map((t) => t._count.players));
    const smallest = teams.filter((t) => t._count.players === minCount);
    const chosenTeam = smallest[Math.floor(Math.random() * smallest.length)]!;

    const updated = await tx.player.update({
      where: { id: chosenPlayer.id },
      data: { teamId: chosenTeam.id },
      include: { team: true },
    });

    return {
      player: { id: updated.id, name: updated.name },
      team: { id: chosenTeam.id, name: chosenTeam.name, color: chosenTeam.color ?? null },
      remainingPlayers: unassigned.length - 1,
    };
  });
}

export async function autoAssignRemaining() {
  let remaining = await prisma.player.count({ where: { teamId: null } });
  while (remaining > 0) {
    const result = await assignNextPlayer();
    if (!result) break;
    remaining = result.remainingPlayers;
  }
}

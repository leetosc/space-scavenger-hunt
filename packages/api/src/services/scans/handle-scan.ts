import prisma from "@space-scavenger-hunt/db";
import { env } from "@space-scavenger-hunt/env/server";

import { generateTaskPrompt } from "../ai/generate-task";

export type ScanStatus =
  | "CREATED_ATTEMPT"
  | "EXISTING_ATTEMPT"
  | "ALREADY_CLAIMED"
  | "INVALID"
  | "NOT_ACTIVE"
  | "NO_TEAM"
  | "NO_PLAYER"
  | "WRONG_TEAM";

export type HandleScanInput = {
  code: string;
  playerId: string;
};

export type HandleScanResult = {
  status: ScanStatus;
  attemptId?: string;
  message: string;
};

export const SCAN_MESSAGES: Record<ScanStatus, string> = {
  CREATED_ATTEMPT: "Astronaut acquired - upload your challenge photo to claim it!",
  EXISTING_ATTEMPT: "You have an open challenge for this astronaut. Finish it!",
  ALREADY_CLAIMED: "Your team has already claimed this astronaut.",
  INVALID: "Invalid astronaut tag.",
  NOT_ACTIVE: "The mission has not launched yet.",
  NO_TEAM: "You have not been assigned to a mission team yet.",
  NO_PLAYER: "You need to check in before scanning astronauts.",
  WRONG_TEAM: "This astronaut is not available for your team.",
};

function result(status: ScanStatus, attemptId?: string): HandleScanResult {
  return { status, attemptId, message: SCAN_MESSAGES[status] };
}

export async function handleScan(input: HandleScanInput): Promise<HandleScanResult> {
  const activity = await prisma.activity.findFirst({ orderBy: { createdAt: "asc" } });
  if (!activity || activity.status !== "ACTIVE") {
    return result("NOT_ACTIVE");
  }

  const player = await prisma.player.findUnique({
    where: { id: input.playerId },
    include: { team: true },
  });
  if (!player) return result("NO_PLAYER");
  if (!player.teamId) return result("NO_TEAM");

  const astronaut = await prisma.astronaut.findUnique({ where: { code: input.code } });
  if (!astronaut || !astronaut.active) return result("INVALID");

  const assignment = await prisma.teamAstronautAssignment.findUnique({
    where: {
      teamId_astronautId: {
        teamId: player.teamId,
        astronautId: astronaut.id,
      },
    },
  });
  if (!assignment) return result("WRONG_TEAM");

  const existingClaim = await prisma.teamClaim.findUnique({
    where: {
      teamId_astronautId: {
        teamId: player.teamId,
        astronautId: astronaut.id,
      },
    },
  });
  if (existingClaim) return result("ALREADY_CLAIMED");

  const now = new Date();

  const existingAttempt = await prisma.claimAttempt.findFirst({
    where: {
      teamId: player.teamId,
      astronautId: astronaut.id,
      status: { in: ["PENDING_PHOTO", "SUBMITTED"] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
  if (existingAttempt) return result("EXISTING_ATTEMPT", existingAttempt.id);

  const taskPrompt = await generateTaskPrompt();
  const expiresAt = new Date(now.getTime() + env.CLAIM_ATTEMPT_EXPIRATION_MINUTES * 60_000);

  const created = await prisma.claimAttempt.create({
    data: {
      teamId: player.teamId,
      astronautId: astronaut.id,
      scannedByPlayerId: player.id,
      taskPrompt,
      status: "PENDING_PHOTO",
      expiresAt,
    },
  });

  return result("CREATED_ATTEMPT", created.id);
}

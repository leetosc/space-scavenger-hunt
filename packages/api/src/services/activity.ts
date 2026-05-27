import prisma from "@space-scavenger-hunt/db";

export const ACTIVITY_STATUSES = ["SETUP", "TEAM_ASSIGNMENT", "ACTIVE", "FINISHED"] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];
export const DEFAULT_MAX_TEAMS = 4;

export type ActivityTiming = {
  startedAt: Date | null;
  timeLimitMinutes: number | null;
  serverNow: Date;
  deadlineAt: Date | null;
};

export async function getOrCreateActivity() {
  const existing = await prisma.activity.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.activity.create({
    data: {
      name: "Astronaut NFC Scavenger Hunt",
      status: "SETUP",
      maxTeams: DEFAULT_MAX_TEAMS,
    },
  });
}

export async function getActivityStatus(): Promise<ActivityStatus> {
  const activity = await getOrCreateActivity();
  return activity.status as ActivityStatus;
}

export function buildActivityTiming(activity: {
  startedAt: Date | null;
  timeLimitMinutes: number | null;
}): ActivityTiming {
  const deadlineAt =
    activity.startedAt && activity.timeLimitMinutes
      ? new Date(activity.startedAt.getTime() + activity.timeLimitMinutes * 60_000)
      : null;

  return {
    startedAt: activity.startedAt,
    timeLimitMinutes: activity.timeLimitMinutes,
    serverNow: new Date(),
    deadlineAt,
  };
}

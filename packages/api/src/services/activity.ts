import prisma from "@space-scavenger-hunt/db";

export const ACTIVITY_STATUSES = ["SETUP", "TEAM_ASSIGNMENT", "ACTIVE", "FINISHED"] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export async function getOrCreateActivity() {
  const existing = await prisma.activity.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.activity.create({
    data: {
      name: "Astronaut NFC Scavenger Hunt",
      status: "SETUP",
    },
  });
}

export async function getActivityStatus(): Promise<ActivityStatus> {
  const activity = await getOrCreateActivity();
  return activity.status as ActivityStatus;
}

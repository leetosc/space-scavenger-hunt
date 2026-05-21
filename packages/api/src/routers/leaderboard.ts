import { publicProcedure, router } from "../index";

export const leaderboardRouter = router({
  getCurrent: publicProcedure.query(async ({ ctx }) => {
    const [activity, teams] = await Promise.all([
      ctx.prisma.activity.findFirst({ orderBy: { createdAt: "asc" } }),
      ctx.prisma.team.findMany({
        include: {
          claims: { orderBy: { claimedAt: "desc" } },
          attempts: { where: { status: "REJECTED" } },
          assignments: true,
        },
      }),
    ]);

    const elapsedSecondsForClaim = (claim: {
      claimedAt: Date;
      claimedElapsedSeconds: number | null;
    }) => {
      if (claim.claimedElapsedSeconds !== null) return claim.claimedElapsedSeconds;
      if (!activity?.startedAt) return null;
      return Math.max(
        0,
        Math.floor((claim.claimedAt.getTime() - activity.startedAt.getTime()) / 1000),
      );
    };

    const rows = teams.map((t) => {
      const latestClaim = t.claims[0] ?? null;
      return {
        teamId: t.id,
        teamName: t.name,
        color: t.color,
        icon: t.icon,
        claimedCount: t.claims.length,
        assignedCount: t.assignments.length,
        rejectedCount: t.attempts.length,
        latestClaimAt: latestClaim?.claimedAt ?? null,
        latestClaimElapsedSeconds: latestClaim ? elapsedSecondsForClaim(latestClaim) : null,
      };
    });

    rows.sort((a, b) => {
      if (b.claimedCount !== a.claimedCount) return b.claimedCount - a.claimedCount;
      const aLatest = a.latestClaimElapsedSeconds ?? Number.POSITIVE_INFINITY;
      const bLatest = b.latestClaimElapsedSeconds ?? Number.POSITIVE_INFINITY;
      if (aLatest !== bLatest) return aLatest - bLatest;
      if (a.rejectedCount !== b.rejectedCount) return a.rejectedCount - b.rejectedCount;
      return a.teamName.localeCompare(b.teamName);
    });

    return rows;
  }),

  getFinal: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.team.findMany({
      include: {
        claims: { include: { astronaut: true }, orderBy: { claimedAt: "asc" } },
      },
    });
  }),
});

import { publicProcedure, router } from "../index";

export const leaderboardRouter = router({
  getCurrent: publicProcedure.query(async ({ ctx }) => {
    const teams = await ctx.prisma.team.findMany({
      include: {
        claims: { orderBy: { claimedAt: "desc" } },
        attempts: { where: { status: "REJECTED" } },
        assignments: true,
      },
    });

    const rows = teams.map((t) => ({
      teamId: t.id,
      teamName: t.name,
      color: t.color,
      icon: t.icon,
      claimedCount: t.claims.length,
      assignedCount: t.assignments.length,
      rejectedCount: t.attempts.length,
      latestClaimAt: t.claims[0]?.claimedAt ?? null,
    }));

    rows.sort((a, b) => {
      if (b.claimedCount !== a.claimedCount) return b.claimedCount - a.claimedCount;
      const aLatest = a.latestClaimAt ? a.latestClaimAt.getTime() : Number.POSITIVE_INFINITY;
      const bLatest = b.latestClaimAt ? b.latestClaimAt.getTime() : Number.POSITIVE_INFINITY;
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

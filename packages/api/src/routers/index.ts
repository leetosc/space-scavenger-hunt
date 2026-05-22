import { publicProcedure, router } from "../index";
import { activityRouter } from "./activity";
import { assignmentRouter } from "./assignment";
import { astronautRouter } from "./astronaut";
import { attemptRouter } from "./attempt";
import { kickoffRouter } from "./kickoff";
import { leaderboardRouter } from "./leaderboard";
import { hintRouter } from "./hint";
import { playerRouter } from "./player";
import { scanRouter } from "./scan";
import { teamRouter } from "./team";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => "OK"),
  activity: activityRouter,
  player: playerRouter,
  team: teamRouter,
  kickoff: kickoffRouter,
  astronaut: astronautRouter,
  assignment: assignmentRouter,
  scan: scanRouter,
  attempt: attemptRouter,
  leaderboard: leaderboardRouter,
  hint: hintRouter,
});

export type AppRouter = typeof appRouter;

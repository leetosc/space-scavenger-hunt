import { z } from "zod";

import { playerProcedure, router } from "../index";
import { handleScan } from "../services/scans/handle-scan";

export const scanRouter = router({
  handleScan: playerProcedure
    .input(z.object({ code: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      return handleScan({ code: input.code, playerId: ctx.player.id });
    }),
});

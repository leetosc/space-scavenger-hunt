import { auth } from "@space-scavenger-hunt/auth";
import prisma from "@space-scavenger-hunt/db";
import type { Player, PrismaClient, Team, User } from "@space-scavenger-hunt/db";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { fromNodeHeaders } from "better-auth/node";

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;
type RequestHeaders = ReturnType<typeof fromNodeHeaders>;

export type ContextUser = (User & {
  player: (Player & { team: Team | null }) | null;
}) | null;

export type Context = {
  prisma: PrismaClient;
  session: AuthSession;
  user: ContextUser;
  headers: RequestHeaders;
};

export async function createContext(
  opts: CreateExpressContextOptions,
): Promise<Context> {
  const headers = fromNodeHeaders(opts.req.headers);
  const session = await auth.api.getSession({ headers });

  const user = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          player: {
            include: {
              team: true,
            },
          },
        },
      })
    : null;

  return {
    prisma,
    session,
    user,
    headers,
  };
}

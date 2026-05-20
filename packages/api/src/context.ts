import { auth } from "@space-scavenger-hunt/auth";
import prisma from "@space-scavenger-hunt/db";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { fromNodeHeaders } from "better-auth/node";

export async function createContext(opts: CreateExpressContextOptions) {
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

export type Context = Awaited<ReturnType<typeof createContext>>;

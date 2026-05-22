import { PrismaLibSql } from "@prisma/adapter-libsql";
import { env } from "@space-scavenger-hunt/env/server";

import { PrismaClient } from "../prisma/generated/client";

export type {
  Astronaut,
  ClaimAttempt,
  LocationHint,
  Player,
  PrismaClient,
  SignalBoostLedger,
  Team,
  TeamClaim,
  TeamLocationHintReveal,
  User,
} from "../prisma/generated/client";

export function createPrismaClient() {
  const adapter = new PrismaLibSql({
    url: env.DATABASE_URL,
  });

  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();
export default prisma;

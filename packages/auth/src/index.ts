import { createPrismaClient } from "@space-scavenger-hunt/db";
import { env } from "@space-scavenger-hunt/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";

export function createAuth() {
  const prisma = createPrismaClient();

  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: "sqlite",
    }),

    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      // Required because the username plugin sits on top of the email/password authenticator.
      // The UI never asks for an email - we synthesize one from username + USER_EMAIL_DOMAIN.
      // Sign-up is not disabled at the config level so that internal callers (admin bootstrap
      // and the admin tRPC procedure) can use `auth.api.signUpEmail`. Public HTTP access to
      // /api/auth/sign-up/email is blocked at the Express layer in apps/server/src/index.ts.
      enabled: true,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "PLAYER",
          input: false,
        },
      },
    },
    plugins: [username()],
  });
}

export const auth = createAuth();

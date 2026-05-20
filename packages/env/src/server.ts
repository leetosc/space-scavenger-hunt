import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    ADMIN_USERNAME: z.string().min(3),
    ADMIN_PASSWORD: z.string().min(8),
    USER_EMAIL_DOMAIN: z.string().min(1).default("scavengerhunt.local"),

    APP_BASE_URL: z.url(),

    AZURE_AI_FOUNDRY_ENDPOINT: z.url(),
    AZURE_AI_FOUNDRY_API_KEY: z.string().min(1),
    AZURE_AI_FOUNDRY_MODEL: z.string().min(1),

    AZURE_STORAGE_CONNECTION_STRING: z.string().min(1),
    AZURE_STORAGE_CONTAINER_NAME: z.string().min(1),

    MAX_UPLOAD_MB: z.coerce.number().int().positive().default(8),
    CLAIM_ATTEMPT_EXPIRATION_MINUTES: z.coerce.number().int().positive().default(15),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

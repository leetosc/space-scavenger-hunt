import { join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

export const rootDir = join(currentDir, "..", "..");
export const e2eDir = join(rootDir, ".e2e");
export const statePath = join(e2eDir, "state.json");
export const databasePath = join(e2eDir, "test.db");

export const apiUrl = "http://localhost:3000";
export const webUrl = "http://localhost:3001";

export const adminUsername = "e2eadmin";
export const adminPassword = "e2e-admin-password";

export function getE2eEnv(): Record<string, string> {
  return {
    NODE_ENV: "test",
    PORT: "3000",
    DATABASE_URL: `file:${databasePath}`,
    BETTER_AUTH_SECRET: "e2e-secret-at-least-32-characters",
    BETTER_AUTH_URL: apiUrl,
    CORS_ORIGIN: webUrl,
    ADMIN_USERNAME: adminUsername,
    ADMIN_PASSWORD: adminPassword,
    USER_EMAIL_DOMAIN: "e2e.scavengerhunt.local",
    APP_BASE_URL: webUrl,
    NEXT_PUBLIC_SERVER_URL: apiUrl,
    NEXT_PUBLIC_IMAGE_REMOTE_HOSTS: "",
    AZURE_AI_FOUNDRY_ENDPOINT:
      "https://example.openai.azure.com/openai/v1/",
    AZURE_AI_FOUNDRY_API_KEY: "e2e-placeholder",
    AZURE_AI_FOUNDRY_MODEL: "e2e-placeholder",
    AZURE_STORAGE_CONNECTION_STRING: "UseDevelopmentStorage=true",
    AZURE_STORAGE_CONTAINER_NAME: "e2e",
    MAX_UPLOAD_MB: "8",
    CLAIM_ATTEMPT_EXPIRATION_MINUTES: "15",
  };
}

import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";

import type { FullConfig } from "@playwright/test";

import {
  apiUrl,
  databasePath,
  e2eDir,
  getE2eEnv,
  statePath,
  webUrl,
  rootDir,
} from "./constants";
import type { E2eState } from "./state";

type ServiceStatus = "healthy" | "down" | "unhealthy";

const healthTimeoutMs = 1_500;
const startupTimeoutMs = 60_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function probe(url: string): Promise<ServiceStatus> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(healthTimeoutMs),
    });

    return response.ok ? "healthy" : "unhealthy";
  } catch {
    return "down";
  }
}

async function waitForHealthy(url: string, label: string): Promise<void> {
  const deadline = Date.now() + startupTimeoutMs;

  while (Date.now() < deadline) {
    if ((await probe(url)) === "healthy") return;
    await sleep(500);
  }

  throw new Error(
    `Timed out waiting for ${label} to become healthy at ${url}.`,
  );
}

async function runSetupCommand(command: string[], env: Record<string, string>) {
  const [bin, ...args] = command;
  const proc = spawn(bin, args, {
    cwd: rootDir,
    env: {
      ...process.env,
      ...env,
    },
    stdio: "inherit",
  });

  await new Promise<void>((resolve, reject) => {
    proc.once("error", reject);
    proc.once("exit", (exitCode) => {
      if (exitCode === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed (${exitCode}): ${command.join(" ")}`));
    });
  });
}

function spawnServer(command: string[], env: Record<string, string>) {
  const [bin, ...args] = command;
  return spawn(bin, args, {
    cwd: rootDir,
    env: {
      ...process.env,
      ...env,
    },
    stdio: "inherit",
  });
}

function stopServer(proc: ChildProcess) {
  try {
    proc.kill("SIGTERM");
  } catch {
    // Process may already have exited.
  }
}

async function writeState(state: E2eState) {
  await mkdir(e2eDir, { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

export default async function globalSetup(_config: FullConfig) {
  const [apiStatus, webStatus] = await Promise.all([
    probe(apiUrl),
    probe(webUrl),
  ]);

  if (apiStatus === "healthy" && webStatus === "healthy") {
    await writeState({
      mode: "reused",
      adminAuthAvailable:
        Boolean(process.env.E2E_ADMIN_USERNAME) &&
        Boolean(process.env.E2E_ADMIN_PASSWORD),
    });
    console.log("[e2e] Reusing healthy local API and web servers.");
    return;
  }

  if (apiStatus !== "down" || webStatus !== "down") {
    throw new Error(
      [
        "[e2e] Cannot start a managed test stack because only part of the local stack is available.",
        `API ${apiUrl}: ${apiStatus}`,
        `Web ${webUrl}: ${webStatus}`,
        "Stop the partial stack, free the occupied port, or start both dev servers before rerunning E2E tests.",
      ].join("\n"),
    );
  }

  const env = getE2eEnv();

  await mkdir(e2eDir, { recursive: true });
  await rm(databasePath, { force: true });
  await rm(`${databasePath}-shm`, { force: true });
  await rm(`${databasePath}-wal`, { force: true });
  await rm(`${databasePath}-journal`, { force: true });
  await writeFile(databasePath, "");

  console.log("[e2e] Preparing isolated test database.");
  await runSetupCommand(["bun", "run", "--cwd", "packages/db", "db:push"], env);

  console.log("[e2e] Starting managed API and web servers.");
  const api = spawnServer(
    [
      "bun",
      "--no-env-file",
      "--watch",
      "apps/server/src/index.ts",
      "packages/api/src",
      "packages/auth/src",
      "packages/db/src",
    ],
    env,
  );
  const web = spawnServer(["bun", "run", "dev:web"], env);

  try {
    await Promise.all([
      waitForHealthy(apiUrl, "API server"),
      waitForHealthy(webUrl, "web app"),
    ]);

    await writeState({
      mode: "managed",
      adminAuthAvailable: true,
    });
  } catch (error) {
    stopServer(web);
    stopServer(api);
    throw error;
  }

  return async () => {
    stopServer(web);
    stopServer(api);
    await Promise.allSettled([
      new Promise((resolve) => web.once("exit", resolve)),
      new Promise((resolve) => api.once("exit", resolve)),
    ]);
  };
}

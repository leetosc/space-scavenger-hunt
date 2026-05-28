import { readFile } from "node:fs/promises";

import { statePath } from "./constants";

export type E2eState = {
  mode: "managed" | "reused";
  adminAuthAvailable: boolean;
};

export async function readE2eState(): Promise<E2eState> {
  const fallback: E2eState = {
    mode: "reused",
    adminAuthAvailable: false,
  };

  try {
    return JSON.parse(await readFile(statePath, "utf8")) as E2eState;
  } catch {
    return fallback;
  }
}

import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@space-scavenger-hunt/env/server";
import type { LanguageModel } from "ai";

export const foundry = createOpenAI({
  baseURL: env.AZURE_AI_FOUNDRY_ENDPOINT,
  apiKey: env.AZURE_AI_FOUNDRY_API_KEY,
});

export function foundryModel(): LanguageModel {
  return foundry(env.AZURE_AI_FOUNDRY_MODEL);
}

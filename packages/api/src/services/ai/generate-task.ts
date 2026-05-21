import prisma from "@space-scavenger-hunt/db";
import { generateText } from "ai";

import { foundryModel } from "./client";

const SYSTEM_PROMPT = `You generate office-appropriate team photo challenges for an astronaut-themed scavenger hunt. Output exactly one sentence describing the challenge.`;

const FALLBACK_TASKS = [
  "Have at least two teammates pose as if you have just touched down on the Moon, with one planting an imaginary flag.",
  "Two or more teammates float-walk like astronauts in low gravity past a single desk and capture the moment.",
  "Build a quick rocket shape with office supplies and have at least two teammates point at it like proud mission controllers.",
];

type GenerateTaskPromptOptions = {
  /** Pre-loaded prompts to avoid; fetched from the DB when omitted. */
  existingTaskPrompts?: string[];
};

function normalizeTaskPrompt(prompt: string): string {
  return prompt.trim().toLowerCase();
}

export async function getExistingAttemptTaskPrompts(): Promise<string[]> {
  const attempts = await prisma.claimAttempt.findMany({
    select: { taskPrompt: true },
  });
  return [...new Set(attempts.map((a) => a.taskPrompt.trim()).filter(Boolean))];
}

function buildUserPrompt(existingTaskPrompts: string[]): string {
  const basePrompt = `Generate one safe, office-appropriate team photo challenge for a scavenger hunt.

Rules:
- It must be verifiable from a single uploaded image.
- It should involve at least 2 people.
- It should be fun and space-themed.
- It must be completable in under 3 minutes.
- It must not require dangerous behavior.
- It must not ask for sensitive information.
- It must not require leaving the office.
- It should not require props other than normal office surroundings.
- Return only the task sentence.`;

  if (existingTaskPrompts.length === 0) {
    return basePrompt;
  }

  const taskList = existingTaskPrompts.map((task, i) => `${i + 1}. "${task}"`).join("\n");

  return `${basePrompt}

These tasks have already been used in this hunt. Your new task must be clearly different from every one of them:
${taskList}

Avoid repeating the same action, scene, or setup as any listed task. Vary the theme, pose, props, and group interaction — change the activity in a noticeable way, not just the wording.`;
}

function isDuplicateTask(text: string, existingTaskPrompts: string[]): boolean {
  const normalized = normalizeTaskPrompt(text);
  return existingTaskPrompts.some((task) => normalizeTaskPrompt(task) === normalized);
}

function pickFallbackTask(existingTaskPrompts: string[]): string {
  const normalizedExisting = new Set(existingTaskPrompts.map(normalizeTaskPrompt));
  const available = FALLBACK_TASKS.filter(
    (task) => !normalizedExisting.has(normalizeTaskPrompt(task)),
  );

  const pool = available.length > 0 ? available : FALLBACK_TASKS;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx]!;
}

export async function generateTaskPrompt(options?: GenerateTaskPromptOptions): Promise<string> {
  const existingTaskPrompts =
    options?.existingTaskPrompts ?? (await getExistingAttemptTaskPrompts());

  try {
    const result = await generateText({
      model: foundryModel(),
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(existingTaskPrompts),
      maxOutputTokens: 200,
    });
    const text = result.text.trim();
    if (text.length > 0 && !isDuplicateTask(text, existingTaskPrompts)) {
      return text;
    }
  } catch (error) {
    console.error("[ai.generateTaskPrompt] falling back due to error:", error);
  }
  return pickFallbackTask(existingTaskPrompts);
}

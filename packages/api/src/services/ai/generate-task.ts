import prisma from "@space-scavenger-hunt/db";
import { generateText } from "ai";

import { foundryModel } from "./client";

const SYSTEM_PROMPT = `You generate family-friendly team photo challenges for twin boys Luke and Leo's first birthday party, a space-themed scavenger hunt in and around their family's house. Output exactly one sentence describing the challenge.`;

const FALLBACK_TASKS = [
  "Have at least two teammates pose as if you have just touched down on the Moon, with one planting an imaginary flag.",
  "Pose together as a rocket crew celebrating your landing on Planet Birthday.",
  "Form a pretend telescope with your hands and point excitedly at an imaginary birthday comet together.",
  "Pose together as friendly aliens waving hello to Luke and Leo from the Moon.",
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
  const basePrompt = `Generate one safe, family-friendly team photo challenge for Luke and Leo's first birthday scavenger hunt at their family's house and yard.

Rules:
- It must be verifiable from a single uploaded image.
- It should involve at least 2 people.
- It should be fun and maybe slightly silly.
- It must be completable in under 3 minutes.
- It must not require dangerous behavior.
- It must not ask for sensitive information.
- It must be possible in a shared party area inside the house or in the yard without leaving the property.
- Do not require private rooms, climbing, roads, pools, moving furniture, or handling household appliances.
- Do not require the birthday babies to participate or be held; guests can complete these tasks themselves.
- Use playful space, birthday, or exploration themes suitable for guests of different ages.
- It should not require props.
- Do not mention the number of people required in the output sentence.
- Return only the task sentence.`;

  if (existingTaskPrompts.length === 0) {
    return basePrompt;
  }

  const taskList = existingTaskPrompts
    .map((task, i) => `${i + 1}. "${task}"`)
    .join("\n");

  return `${basePrompt}

These tasks have already been used in this hunt. Your new task must be clearly different from every one of them:
${taskList}

Avoid repeating the same action, scene, or setup as any listed task. Vary the theme, pose, and group interaction — change the activity in a noticeable way, not just the wording.


Do not mention the number of people required to complete the task.`;
}

function isDuplicateTask(text: string, existingTaskPrompts: string[]): boolean {
  const normalized = normalizeTaskPrompt(text);
  return existingTaskPrompts.some(
    (task) => normalizeTaskPrompt(task) === normalized,
  );
}

function pickFallbackTask(existingTaskPrompts: string[]): string {
  const normalizedExisting = new Set(
    existingTaskPrompts.map(normalizeTaskPrompt),
  );
  const available = FALLBACK_TASKS.filter(
    (task) => !normalizedExisting.has(normalizeTaskPrompt(task)),
  );

  const pool = available.length > 0 ? available : FALLBACK_TASKS;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx]!;
}

export async function generateTaskPrompt(
  options?: GenerateTaskPromptOptions,
): Promise<string> {
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

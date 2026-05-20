import { generateText } from "ai";

import { foundryModel } from "./client";

const SYSTEM_PROMPT = `You generate office-appropriate team photo challenges for an astronaut-themed scavenger hunt. Output exactly one sentence describing the challenge.`;

const USER_PROMPT = `Generate one safe, office-appropriate team photo challenge for a scavenger hunt.

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

const FALLBACK_TASKS = [
  "Have at least two teammates pose as if you have just touched down on the Moon, with one planting an imaginary flag.",
  "Two or more teammates float-walk like astronauts in low gravity past a single desk and capture the moment.",
  "Build a quick rocket shape with office supplies and have at least two teammates point at it like proud mission controllers.",
];

export async function generateTaskPrompt(): Promise<string> {
  try {
    const result = await generateText({
      model: foundryModel(),
      system: SYSTEM_PROMPT,
      prompt: USER_PROMPT,
      maxOutputTokens: 200,
    });
    const text = result.text.trim();
    if (text.length > 0) return text;
  } catch (error) {
    console.error("[ai.generateTaskPrompt] falling back due to error:", error);
  }
  const idx = Math.floor(Math.random() * FALLBACK_TASKS.length);
  return FALLBACK_TASKS[idx]!;
}

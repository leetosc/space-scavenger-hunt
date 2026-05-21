import { generateObject } from "ai";
import { z } from "zod";

import { foundryModel } from "./client";

const SYSTEM_PROMPT = `You generate creative astronaut character profiles for a space-themed office scavenger hunt game. Each astronaut is a hidden character that teams must find by scanning NFC tags placed around the office.`;

const USER_PROMPT = `Generate a unique astronaut character for a scavenger hunt game.

Rules:
- The name should be a fun, space-themed character name (e.g. "Cosmo McStardust", "Nebula Nightshade", "Buzz Lightyarn")
- The description should be 1-2 sentences describing the character's personality or backstory
- Keep it fun, office-appropriate, and space-themed
- Be creative and varied — avoid generic names`;

const FALLBACK_PROFILES = [
  { name: "Cosmo McStardust", description: "A veteran space explorer who insists on narrating every mission in dramatic movie-trailer voice." },
  { name: "Nebula Nightshade", description: "A mysterious astronaut who communicates only through interpretive space-walking gestures." },
  { name: "Captain Quasar", description: "The self-appointed captain of every mission, despite never actually being promoted." },
  { name: "Luna Lightyear", description: "An overly enthusiastic rookie astronaut who treats every coffee break like a moon landing." },
  { name: "Asteroid Andy", description: "Claims to have personally high-fived an asteroid. Nobody believes him, but nobody can disprove it either." },
  { name: "Stella Supernova", description: "A dramatic astronaut whose farewell speeches before every 5-minute spacewalk bring colleagues to tears." },
  { name: "Rocket Raccoon Jr.", description: "No relation to the famous one, but don't tell him that — he's very sensitive about it." },
  { name: "Major Stardust", description: "An astronaut who got promoted to Major purely because of how much glitter gets stuck to their suit." },
];

export async function generateAstronautProfile(): Promise<{ name: string; description: string }> {
  try {
    const result = await generateObject({
      model: foundryModel(),
      system: SYSTEM_PROMPT,
      prompt: USER_PROMPT,
      schema: z.object({
        name: z.string().describe("A fun space-themed character name"),
        description: z.string().describe("1-2 sentence character description"),
      }),
      maxOutputTokens: 300,
    });
    if (result.object.name && result.object.description) {
      return result.object;
    }
  } catch (error) {
    console.error("[ai.generateAstronautProfile] falling back due to error:", error);
  }
  const idx = Math.floor(Math.random() * FALLBACK_PROFILES.length);
  return FALLBACK_PROFILES[idx]!;
}

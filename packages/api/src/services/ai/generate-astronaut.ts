import { generateObject } from "ai";
import { z } from "zod";

import { foundryModel } from "./client";
import { logAiFallback } from "./log-ai-error";

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
  { name: "Comet Clipboard", description: "A mission planner who color-codes every orbit and refuses to launch without a perfectly labeled checklist." },
  { name: "Major Stardust", description: "An astronaut who got promoted to Major purely because of how much glitter gets stuck to their suit." },
];

type AstronautProfile = {
  name: string;
  description: string;
};

type ExistingAstronautProfile = {
  name: string;
  description: string | null;
};

type GenerateAstronautProfileOptions = {
  existingProfiles?: ExistingAstronautProfile[];
};

export type GenerateAstronautProfileResult = {
  profile: AstronautProfile;
  source: "ai" | "fallback";
};

function normalizeProfileText(text: string): string {
  return text.trim().toLowerCase();
}

function buildUserPrompt(existingProfiles: ExistingAstronautProfile[]): string {
  if (existingProfiles.length === 0) {
    return USER_PROMPT;
  }

  const profileList = existingProfiles
    .map(
      (profile, i) =>
        `${i + 1}. ${profile.name}${
          profile.description ? `: ${profile.description}` : ""
        }`,
    )
    .join("\n");

  return `${USER_PROMPT}

These astronauts already exist in this hunt. Your new astronaut must be clearly different from every one of them:
${profileList}

Avoid repeating existing name patterns, titles, personality traits, backstories, jokes, or description structure. Vary the character archetype, comedic angle, and space-office theme in a noticeable way.`;
}

function isDuplicateProfile(
  profile: AstronautProfile,
  existingProfiles: ExistingAstronautProfile[],
): boolean {
  const normalizedName = normalizeProfileText(profile.name);
  const normalizedDescription = normalizeProfileText(
    profile.description ?? "",
  );

  return existingProfiles.some(
    (existing) =>
      normalizeProfileText(existing.name) === normalizedName ||
      (normalizedDescription.length > 0 &&
        normalizeProfileText(existing.description ?? "") ===
          normalizedDescription),
  );
}

function pickFallbackProfile(
  existingProfiles: ExistingAstronautProfile[],
): AstronautProfile {
  const available = FALLBACK_PROFILES.filter(
    (profile) => !isDuplicateProfile(profile, existingProfiles),
  );
  const pool = available.length > 0 ? available : FALLBACK_PROFILES;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx]!;
}

export async function generateAstronautProfile(
  options?: GenerateAstronautProfileOptions,
): Promise<GenerateAstronautProfileResult> {
  const existingProfiles = options?.existingProfiles ?? [];

  try {
    const result = await generateObject({
      model: foundryModel(),
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(existingProfiles),
      schema: z.object({
        name: z.string().describe("A fun space-themed character name"),
        description: z.string().describe("1-2 sentence character description"),
      }),
      maxOutputTokens: 300,
      maxRetries: 0,
    });
    if (
      result.object.name &&
      result.object.description &&
      !isDuplicateProfile(result.object, existingProfiles)
    ) {
      return { profile: result.object, source: "ai" };
    }
  } catch (error) {
    logAiFallback("ai.generateAstronautProfile", error);
  }

  return {
    profile: pickFallbackProfile(existingProfiles),
    source: "fallback",
  };
}

import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@space-scavenger-hunt/env/server";

const ASTRONAUT_PHOTO_ACCESS_TTL_SECONDS = 60 * 60;
const previewPathCache = new Map<string, { path: string; expiresAt: number }>();

function signAstronautPhotoAccess(astronautId: string, expiresAt: number): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`astronaut:${astronautId}:${expiresAt}`)
    .digest("base64url");
}

function parseAstronautPhotoToken(
  astronautId: string,
  token: string,
): { valid: true; expiresAt: number } | { valid: false } {
  const separator = token.indexOf(".");
  if (separator === -1) return { valid: false };

  const expiresAt = Number(token.slice(0, separator));
  const signature = token.slice(separator + 1);
  if (!Number.isFinite(expiresAt) || !signature) return { valid: false };
  if (expiresAt < Math.floor(Date.now() / 1000)) return { valid: false };

  const expected = signAstronautPhotoAccess(astronautId, expiresAt);
  try {
    const valid = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    return valid ? { valid: true, expiresAt } : { valid: false };
  } catch {
    return { valid: false };
  }
}

export function getAstronautPhotoPreviewPath(astronautId: string): string {
  const now = Date.now();
  const cached = previewPathCache.get(astronautId);
  if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
    return cached.path;
  }

  const expiresAt = Math.floor(now / 1000) + ASTRONAUT_PHOTO_ACCESS_TTL_SECONDS;
  const token = `${expiresAt}.${signAstronautPhotoAccess(astronautId, expiresAt)}`;
  const path = `/astronaut-photos/${astronautId}/${token}`;
  previewPathCache.set(astronautId, { path, expiresAt: expiresAt * 1000 });
  return path;
}

export function verifyAstronautPhotoAccessToken(
  astronautId: string,
  token: string,
): boolean {
  return parseAstronautPhotoToken(astronautId, token).valid;
}

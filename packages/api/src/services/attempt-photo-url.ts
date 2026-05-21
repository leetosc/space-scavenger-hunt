import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@space-scavenger-hunt/env/server";

const PHOTO_ACCESS_TTL_SECONDS = 60 * 60;
const previewPathCache = new Map<string, { path: string; expiresAt: number }>();

function signAttemptPhotoAccess(attemptId: string, expiresAt: number): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`${attemptId}:${expiresAt}`)
    .digest("base64url");
}

function parseAttemptPhotoToken(
  attemptId: string,
  token: string,
): { valid: true; expiresAt: number } | { valid: false } {
  const separator = token.indexOf(".");
  if (separator === -1) return { valid: false };

  const expiresAt = Number(token.slice(0, separator));
  const signature = token.slice(separator + 1);
  if (!Number.isFinite(expiresAt) || !signature) return { valid: false };
  if (expiresAt < Math.floor(Date.now() / 1000)) return { valid: false };

  const expected = signAttemptPhotoAccess(attemptId, expiresAt);
  try {
    const valid = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    return valid ? { valid: true, expiresAt } : { valid: false };
  } catch {
    return { valid: false };
  }
}

export function createAttemptPhotoAccessToken(attemptId: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + PHOTO_ACCESS_TTL_SECONDS;
  const signature = signAttemptPhotoAccess(attemptId, expiresAt);
  return `${expiresAt}.${signature}`;
}

/** Same-origin path for Next.js Image optimization (see web rewrites). */
export function getAttemptPhotoPreviewPath(attemptId: string): string {
  const now = Date.now();
  const cached = previewPathCache.get(attemptId);
  if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
    return cached.path;
  }

  const expiresAt = Math.floor(now / 1000) + PHOTO_ACCESS_TTL_SECONDS;
  const token = `${expiresAt}.${signAttemptPhotoAccess(attemptId, expiresAt)}`;
  const path = `/attempt-photos/${attemptId}/${token}`;
  previewPathCache.set(attemptId, { path, expiresAt: expiresAt * 1000 });
  return path;
}

export function verifyAttemptPhotoAccessToken(
  attemptId: string,
  token: string,
): boolean {
  return parseAttemptPhotoToken(attemptId, token).valid;
}

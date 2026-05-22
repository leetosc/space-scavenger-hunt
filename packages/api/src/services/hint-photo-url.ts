import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@space-scavenger-hunt/env/server";

const HINT_PHOTO_ACCESS_TTL_SECONDS = 60 * 60;
const previewPathCache = new Map<string, { path: string; expiresAt: number }>();

function signHintPhotoAccess(hintId: string, expiresAt: number): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`hint:${hintId}:${expiresAt}`)
    .digest("base64url");
}

function parseHintPhotoToken(
  hintId: string,
  token: string,
): { valid: true; expiresAt: number } | { valid: false } {
  const separator = token.indexOf(".");
  if (separator === -1) return { valid: false };

  const expiresAt = Number(token.slice(0, separator));
  const signature = token.slice(separator + 1);
  if (!Number.isFinite(expiresAt) || !signature) return { valid: false };
  if (expiresAt < Math.floor(Date.now() / 1000)) return { valid: false };

  const expected = signHintPhotoAccess(hintId, expiresAt);
  try {
    const valid = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    return valid ? { valid: true, expiresAt } : { valid: false };
  } catch {
    return { valid: false };
  }
}

export function getHintPhotoPreviewPath(hintId: string): string {
  const now = Date.now();
  const cached = previewPathCache.get(hintId);
  if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
    return cached.path;
  }

  const expiresAt = Math.floor(now / 1000) + HINT_PHOTO_ACCESS_TTL_SECONDS;
  const token = `${expiresAt}.${signHintPhotoAccess(hintId, expiresAt)}`;
  const path = `/hint-photos/${hintId}/${token}`;
  previewPathCache.set(hintId, { path, expiresAt: expiresAt * 1000 });
  return path;
}

export function verifyHintPhotoAccessToken(hintId: string, token: string): boolean {
  return parseHintPhotoToken(hintId, token).valid;
}

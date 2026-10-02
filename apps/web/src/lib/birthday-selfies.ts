import { env } from "@space-scavenger-hunt/env/web";

export const SELFIE_STATUS: Record<string, string> = {
  PROCESSING: "Checking photo…",
  PENDING_REVIEW: "Waiting for admin review",
  APPROVED: "Boost earned!",
  AI_REJECTED: "Try another photo",
  REJECTED: "Rejected by admin",
  UPLOAD_FAILED: "Upload failed",
};

export function selfiePhotoUrl(id: string) {
  return `${env.NEXT_PUBLIC_SERVER_URL}/api/selfies/${id}/photo`;
}

import { APICallError } from "ai";

export function getAiErrorMessage(error: unknown): string {
  if (APICallError.isInstance(error)) {
    const status = error.statusCode ? ` (HTTP ${error.statusCode})` : "";
    return `${error.message}${status}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function logAiFallback(context: string, error: unknown): void {
  console.warn(`[${context}] AI unavailable, using fallback: ${getAiErrorMessage(error)}`);
}

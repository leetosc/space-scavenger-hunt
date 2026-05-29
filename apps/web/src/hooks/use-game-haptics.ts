"use client";

import { useCallback, useMemo } from "react";
import { useWebHaptics } from "web-haptics/react";

type GameHapticType =
  | "light"
  | "selection"
  | "medium"
  | "success"
  | "error"
  | "warning"
  | "heavy";

export function useGameHaptics() {
  const { trigger } = useWebHaptics();

  const pulse = useCallback(
    (type: GameHapticType) => {
      void trigger(type);
    },
    [trigger],
  );

  return useMemo(
    () => ({
      tap: () => pulse("light"),
      select: () => pulse("selection"),
      submit: () => pulse("medium"),
      success: () => pulse("success"),
      error: () => pulse("error"),
      warning: () => pulse("warning"),
      impact: () => pulse("heavy"),
    }),
    [pulse],
  );
}

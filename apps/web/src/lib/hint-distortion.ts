export const HINT_DISTORTION_BY_LEVEL = [
  {
    blur: 28,
    scale: 1.14,
    contrast: 0.5,
    saturate: 0.38,
    sliceOpacity: 0.82,
    gridOpacity: 0.42,
    maskOpacity: 0.7,
  },
  {
    blur: 16,
    scale: 1.08,
    contrast: 0.75,
    saturate: 0.75,
    sliceOpacity: 0.28,
    gridOpacity: 0.2,
    maskOpacity: 0.42,
  },
  {
    blur: 7,
    scale: 1.03,
    contrast: 0.8,
    saturate: 0.8,
    sliceOpacity: 0.22,
    gridOpacity: 0.1,
    maskOpacity: 0.18,
  },
  {
    blur: 0,
    scale: 1,
    contrast: 1,
    saturate: 1,
    sliceOpacity: 0,
    gridOpacity: 0,
    maskOpacity: 0,
  },
] as const;

export function getHintDistortion(level: number) {
  return (
    HINT_DISTORTION_BY_LEVEL[
      Math.min(level, HINT_DISTORTION_BY_LEVEL.length - 1)
    ] ?? HINT_DISTORTION_BY_LEVEL[0]
  );
}

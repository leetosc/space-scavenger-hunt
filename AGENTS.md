# Agent Notes

## Verification

- Do not use `bun run build` as a routine verification step in this local/Codex
  environment. The Next.js/Turbopack build has repeatedly hung during
  `Creating an optimized production build ...`.
- Prefer `bun run check-types`, direct package `tsc --noEmit`, and targeted E2E
  checks unless the user explicitly asks for a production build.

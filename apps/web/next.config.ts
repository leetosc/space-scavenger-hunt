import "@space-scavenger-hunt/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // typedRoutes requires a Next.js build/dev cycle to generate `.next/types/routes.d.ts`
  // before TypeScript can resolve them. We keep it off so `tsc --noEmit` can be used
  // in CI without first running `next build`. Re-enable when wiring CI knows to run
  // `next typegen` (or `next build`) before typechecking.
  typedRoutes: false,
  reactCompiler: true,
};

export default nextConfig;

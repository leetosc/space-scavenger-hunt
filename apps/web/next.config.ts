import "@space-scavenger-hunt/env/web";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

const configDir = path.dirname(fileURLToPath(import.meta.url));

function getImageRemoteHosts(): string[] {
  const explicit = process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOSTS?.split(",")
    .map((host) => host.trim())
    .filter(Boolean);
  if (explicit?.length) return explicit;

  // Local monorepo fallback: read Azure account from the server env file.
  dotenv.config({ path: path.join(configDir, "../server/.env") });
  const accountName = process.env.AZURE_STORAGE_CONNECTION_STRING?.match(
    /AccountName=([^;]+)/,
  )?.[1];
  return accountName ? [`${accountName}.blob.core.windows.net`] : [];
}

const imageRemoteHosts = getImageRemoteHosts();

const nextConfig: NextConfig = {
  // typedRoutes requires a Next.js build/dev cycle to generate `.next/types/routes.d.ts`
  // before TypeScript can resolve them. We keep it off so `tsc --noEmit` can be used
  // in CI without first running `next build`. Re-enable when wiring CI knows to run
  // `next typegen` (or `next build`) before typechecking.
  typedRoutes: false,
  reactCompiler: true,
  images: {
    remotePatterns: imageRemoteHosts?.map((hostname) => ({
      protocol: "https",
      hostname,
    })),
  },
};

export default nextConfig;

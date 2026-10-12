import type { Metadata } from "next";

import { getAstronautPageMetadata } from "@/lib/astronaut-metadata";
import { createPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const metadata = await getAstronautPageMetadata(code);
  return metadata ?? createPageMetadata({
    title: "Astronaut Rescue",
    description: "Scan an astronaut's code to view their mission and complete a team photo challenge for Luke & Leo's birthday scavenger hunt.",
    path: `/astronaut/${encodeURIComponent(code)}`,
  });
}

export default function AstronautLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

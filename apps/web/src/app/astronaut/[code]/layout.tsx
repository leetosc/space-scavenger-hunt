import type { Metadata } from "next";

import { getAstronautPageMetadata } from "@/lib/astronaut-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const metadata = await getAstronautPageMetadata(code);
  return metadata ?? { title: "Astronaut not found" };
}

export default function AstronautLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Meet Your Birthday Crew",
  description: "Watch the crews come together on the live kickoff display as Luke & Leo's birthday astronauts get assigned to their spaceships.",
  path: "/kickoff",
});

export default function KickoffLayout({ children }: { children: React.ReactNode }) {
  return children;
}

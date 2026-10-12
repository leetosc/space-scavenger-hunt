import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Astronaut Crew Manifest",
  description: "Meet the hidden astronauts, explore their stories, and see which crew members still need a rescue in the birthday scavenger hunt.",
  path: "/astronauts",
});

export default function AstronautsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

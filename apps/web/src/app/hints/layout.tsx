import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Location Hints",
  description: "Need a clue? Spend your crew's Signal Boosts to sharpen location photos and find the hidden astronauts around the house and yard.",
  path: "/hints",
});

export default function HintsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

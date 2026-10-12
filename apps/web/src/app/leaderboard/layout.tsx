import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Live Leaderboard",
  description: "See which birthday crew is leading the mission! Follow live team rankings and astronaut rescue progress at Luke & Leo's first birthday.",
  path: "/leaderboard",
});

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}

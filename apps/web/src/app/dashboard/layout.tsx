import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Team Dashboard",
  description: "Follow your birthday crew's progress, track astronaut rescues, and manage Signal Boosts for Luke & Leo's scavenger hunt.",
  path: "/dashboard",
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}

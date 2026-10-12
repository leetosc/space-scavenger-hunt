import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Birthday Mission Briefing",
  description: "Learn how to find hidden astronauts, complete silly team photo challenges, and earn bonus Signal Boosts with Luke & Leo selfies.",
  path: "/onboarding",
});

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}

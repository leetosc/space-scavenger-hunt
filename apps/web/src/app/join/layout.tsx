import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Birthday Mission Check-In",
  description: "Check in for Luke & Leo's first birthday scavenger hunt and get ready to join a crew for an astronaut rescue adventure.",
  path: "/join",
});

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Submission Gallery",
  description: "Browse the crews' completed photo challenges and relive the astronaut rescue moments from Luke & Leo's birthday scavenger hunt.",
  path: "/submissions",
});

export default function SubmissionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

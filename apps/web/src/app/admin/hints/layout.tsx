import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Manage Location Hints",
  description: "Prepare location photos, configure clue reveal levels, and manage team hints for the birthday astronaut hunt.",
  path: "/admin/hints",
});

export default function AdminHintsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

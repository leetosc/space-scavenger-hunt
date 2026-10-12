import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Manage Birthday Crews",
  description: "Create birthday teams, customize crew names and icons, and manage astronaut assignments for the scavenger hunt.",
  path: "/admin/teams",
});

export default function AdminTeamsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

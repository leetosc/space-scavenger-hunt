import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Kickoff Controls",
  description: "Assign birthday crews, control the live kickoff display, and launch Luke & Leo's scavenger hunt from mission control.",
  path: "/admin/kickoff",
});

export default function AdminKickoffLayout({ children }: { children: React.ReactNode }) {
  return children;
}

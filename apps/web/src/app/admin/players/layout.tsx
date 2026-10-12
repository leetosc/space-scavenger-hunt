import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Manage Players",
  description: "Manage birthday mission players, check registration details, and coordinate crew participation.",
  path: "/admin/players",
});

export default function AdminPlayersLayout({ children }: { children: React.ReactNode }) {
  return children;
}

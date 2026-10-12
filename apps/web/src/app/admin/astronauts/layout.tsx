import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Manage Astronauts",
  description: "Manage the astronaut roster, portraits, rescue challenges, and codes for Luke & Leo's birthday mission.",
  path: "/admin/astronauts",
});

export default function AdminAstronautsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

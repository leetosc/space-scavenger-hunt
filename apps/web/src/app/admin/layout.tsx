import AdminShell from "@/components/admin/admin-shell";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Mission Control",
  description: "Manage Luke & Leo's birthday scavenger hunt, monitor team progress, and coordinate the astronaut rescue mission.",
  path: "/admin",
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}

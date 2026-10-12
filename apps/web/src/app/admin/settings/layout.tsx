import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Mission Settings",
  description: "Configure the birthday scavenger hunt and manage mission settings from the admin control panel.",
  path: "/admin/settings",
});

export default function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Review Photo Attempts",
  description: "Review team photo challenge attempts, approve astronaut rescues, and manage submission feedback from mission control.",
  path: "/admin/attempts",
});

export default function AdminAttemptsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

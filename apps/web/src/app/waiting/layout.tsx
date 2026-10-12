import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Ready for Launch",
  description: "Your birthday mission is almost ready! Follow crew assignments and wait for mission control to launch Luke & Leo's scavenger hunt.",
  path: "/waiting",
});

export default function WaitingLayout({ children }: { children: React.ReactNode }) {
  return children;
}

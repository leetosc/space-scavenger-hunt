import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Review Birthday Selfies",
  description: "Review player selfies with Luke and Leo and manage the Signal Boost rewards earned by birthday crews.",
  path: "/admin/selfies",
});

export default function AdminSelfiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}

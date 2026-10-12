import { createPageMetadata } from "@/lib/page-metadata";

import AttemptView from "./view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return createPageMetadata({
    title: "Photo Challenge Attempt",
    description: "View a team photo challenge submission, check its review status, and follow the astronaut rescue progress.",
    path: `/attempt/${encodeURIComponent(attemptId)}`,
  });
}

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return <AttemptView attemptId={attemptId} />;
}

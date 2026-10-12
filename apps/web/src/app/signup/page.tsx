import SignUpForm from "@/components/sign-up-form";
import { getNextPath } from "@/lib/auth-redirect";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Join the Birthday Mission",
  description: "Create your player account and get ready to find astronauts and take silly team photos at Luke & Leo's first birthday.",
  path: "/signup",
});

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  return <SignUpForm nextPath={getNextPath(params?.next)} />;
}

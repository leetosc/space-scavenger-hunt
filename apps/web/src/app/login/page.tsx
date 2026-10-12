import SignInForm from "@/components/sign-in-form";
import { getNextPath } from "@/lib/auth-redirect";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Sign In",
  description: "Sign in to join your birthday crew, find hidden astronauts, and continue Luke & Leo's birthday mission.",
  path: "/login",
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  return <SignInForm nextPath={getNextPath(params?.next)} />;
}

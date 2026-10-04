import SignInForm from "@/components/sign-in-form";
import { getNextPath } from "@/lib/auth-redirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  return <SignInForm nextPath={getNextPath(params?.next)} />;
}

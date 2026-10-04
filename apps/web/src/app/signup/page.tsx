import SignUpForm from "@/components/sign-up-form";
import { getNextPath } from "@/lib/auth-redirect";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  return <SignUpForm nextPath={getNextPath(params?.next)} />;
}

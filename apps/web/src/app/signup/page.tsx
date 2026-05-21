import SignUpForm from "@/components/sign-up-form";

function getNextPath(value: string | string[] | undefined): string | undefined {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith("/") || next.startsWith("//")) return undefined;
  return next;
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  return <SignUpForm nextPath={getNextPath(params?.next)} />;
}

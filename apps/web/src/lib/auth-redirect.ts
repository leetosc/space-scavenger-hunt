export function getLoginHref({ pathname, search }: Pick<Location, "pathname" | "search">): string {
  const next = pathname === "/login" || pathname === "/signup"
    ? getNextPath(new URLSearchParams(search).get("next") ?? undefined)
    : pathname + search;
  return next && next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login";
}

export function getNextPath(value: string | string[] | undefined): string | undefined {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !/^\/(?![\/\\])/.test(next) || next.includes("\\")) return undefined;
  if (/^\/(?:login|signup)(?:\/|\?|$)/.test(next)) return undefined;
  return next;
}

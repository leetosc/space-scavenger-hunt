"use client";

import { Skeleton } from "@space-scavenger-hunt/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

const NAV = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/kickoff", label: "Kickoff" },
  { to: "/admin/players", label: "Players" },
  { to: "/admin/teams", label: "Teams" },
  { to: "/admin/astronauts", label: "Astronauts" },
  { to: "/admin/assignments", label: "Assignments" },
  { to: "/admin/attempts", label: "Attempts" },
] as const;

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const me = useQuery({
    ...trpc.player.me.queryOptions(),
    enabled: !!session,
  });

  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [isPending, session, router]);

  if (isPending || me.isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-40" />
      </div>
    );
  }

  if (!session) return null;

  if (me.data && me.data.user.role !== "ADMIN") {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Forbidden</h1>
        <p className="text-muted-foreground text-sm mt-2">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[200px_1fr] min-h-0">
      <aside className="border-r p-4">
        <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">
          Admin
        </h2>
        <nav className="flex flex-col gap-1 text-sm">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                href={item.to}
                className={`rounded px-2 py-1 ${active ? "bg-muted font-medium" : "hover:bg-muted"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="p-6 overflow-auto">{children}</main>
    </div>
  );
}

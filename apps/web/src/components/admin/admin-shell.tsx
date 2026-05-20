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
    <div className="grid grid-cols-[220px_1fr] min-h-0 h-full flex-1">
      <aside className="border-r border-border/40 bg-background/15 backdrop-blur-sm p-5 space-y-4 flex flex-col z-10">
        <h2 className="font-mono text-xs tracking-widest text-cyan-400 font-bold uppercase mb-2">
          Admin Console
        </h2>
        <nav className="flex flex-col gap-1.5">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                href={item.to}
                className={`px-3 py-1.5 text-xs font-mono tracking-wide border-l-2 transition-all ${
                  active 
                    ? "bg-cyan-500/10 border-cyan-400 font-bold text-cyan-300" 
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                }`}
              >
                {item.label.toUpperCase()}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="p-8 overflow-y-auto bg-background/5 flex flex-col">{children}</main>
    </div>
  );
}

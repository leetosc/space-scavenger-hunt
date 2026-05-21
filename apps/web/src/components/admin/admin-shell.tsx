"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@space-scavenger-hunt/ui/components/sheet";
import { Skeleton } from "@space-scavenger-hunt/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const me = useQuery({
    ...trpc.player.me.queryOptions(),
    enabled: !!session,
  });

  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [isPending, session, router]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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

  const sidebar = (
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
  );

  return (
    <div className="flex flex-col md:grid md:grid-cols-[220px_1fr] min-h-0 h-full flex-1">
      {/* Mobile sidebar toggle + Sheet drawer */}
      <div className="md:hidden flex items-center gap-3 px-4 py-2 border-b border-border/40 bg-background/15 backdrop-blur-sm">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center size-8 text-muted-foreground hover:text-cyan-400 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="size-4" />
          </button>

          <SheetContent side="left" className="bg-background/95 backdrop-blur-md border-border/40">
            <SheetHeader>
              <SheetTitle className="text-xs font-mono tracking-widest text-cyan-400 uppercase font-bold">
                Admin Console
              </SheetTitle>
            </SheetHeader>
            <div className="px-4">
              {sidebar}
            </div>
          </SheetContent>
        </Sheet>

        <h2 className="font-mono text-xs tracking-widest text-cyan-400 font-bold uppercase">
          Admin Console
        </h2>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex border-r border-border/40 bg-background/15 backdrop-blur-sm p-5 space-y-4 flex-col z-10">
        <h2 className="font-mono text-xs tracking-widest text-cyan-400 font-bold uppercase mb-2">
          Admin Console
        </h2>
        {sidebar}
      </aside>

      <main className="p-4 sm:p-8 overflow-y-auto bg-background/5 flex flex-col flex-1">{children}</main>
    </div>
  );
}

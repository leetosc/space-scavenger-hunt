"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const { data: session } = authClient.useSession();
  const meQuery = useQuery({
    ...trpc.player.me.queryOptions(),
    enabled: !!session,
  });
  const role = meQuery.data?.user?.role;
  const isAdmin = role === "ADMIN";

  const baseLinks = [
    { to: "/" as const, label: "Mission" },
    { to: "/leaderboard" as const, label: "Leaderboard" },
  ];
  const playerLinks = [{ to: "/team" as const, label: "My Team" }];
  const adminLinks = [
    { to: "/admin" as const, label: "Admin" },
    { to: "/admin/kickoff" as const, label: "Kickoff" },
  ];

  const links = [
    ...baseLinks,
    ...(session ? playerLinks : []),
    ...(isAdmin ? adminLinks : []),
  ];

  return (
    <div className="backdrop-blur-md bg-background/25 border-b border-border/40 relative z-20">
      <div className="flex flex-row items-center justify-between px-6 py-2.5">
        <nav className="flex gap-6 text-xs font-mono tracking-wider uppercase">
          {links.map(({ to, label }) => (
            <Link key={to} href={to} className="transition-colors text-muted-foreground hover:text-cyan-400">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </div>
  );
}

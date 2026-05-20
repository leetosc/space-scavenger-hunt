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
    <div>
      <div className="flex flex-row items-center justify-between px-4 py-2">
        <nav className="flex gap-4 text-sm">
          {links.map(({ to, label }) => (
            <Link key={to} href={to} className="hover:underline">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  );
}

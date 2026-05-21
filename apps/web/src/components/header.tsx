"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@space-scavenger-hunt/ui/components/sheet";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";
import {
  staggerContainer,
  fadeInUp,
  springTransition,
} from "@/lib/animations";
import { trpc } from "@/utils/trpc";

import UserMenu from "./user-menu";

export default function Header() {
  const { data: session } = authClient.useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const meQuery = useQuery({
    ...trpc.player.me.queryOptions(),
    enabled: !!session,
  });
  const role = meQuery.data?.user?.role;
  const isAdmin = role === "ADMIN";

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
      <div className="flex flex-row items-center justify-between px-4 sm:px-6 py-2.5">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <button
              onClick={() => setMobileOpen(true)}
              className="sm:hidden flex items-center justify-center size-9 text-muted-foreground hover:text-cyan-400 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>

            <SheetContent side="left" className="bg-background/95 backdrop-blur-md border-border/40">
              <SheetHeader>
                <SheetTitle className="text-xs font-mono tracking-widest text-cyan-400 uppercase font-bold">
                  Menu
                </SheetTitle>
              </SheetHeader>
              <motion.nav
                className="flex flex-col gap-1 px-4"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {links.map(({ to, label }) => (
                  <motion.div key={to} variants={fadeInUp}>
                    <Link
                      href={to}
                      className="text-sm font-mono tracking-wider uppercase py-2.5 px-3 transition-colors text-muted-foreground hover:text-cyan-400 hover:bg-cyan-400/5 block"
                    >
                      {label}
                    </Link>
                  </motion.div>
                ))}
              </motion.nav>
            </SheetContent>
          </Sheet>

          <Link
            href="/"
            className="flex shrink-0 items-center transition-opacity hover:opacity-80"
            aria-label="Space Scavenger Hunt home"
          >
            <motion.div
              whileHover={{ rotate: 12, scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              transition={springTransition}
            >
              <Image
                src="/spacelogo.png"
                alt="Space Scavenger Hunt"
                width={36}
                height={36}
                className="size-9"
                priority
              />
            </motion.div>
          </Link>

          <motion.nav
            className="hidden sm:flex gap-6 text-xs font-mono tracking-wider uppercase"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {links.map(({ to, label }) => (
              <motion.div key={to} variants={fadeInUp}>
                <Link
                  href={to}
                  className="relative transition-colors text-muted-foreground hover:text-cyan-400 whitespace-nowrap group"
                >
                  {label}
                  <span className="absolute -bottom-1 left-0 h-[1px] w-0 bg-cyan-400 transition-all duration-300 group-hover:w-full" />
                </Link>
              </motion.div>
            ))}
          </motion.nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <UserMenu />
        </div>
      </div>
    </div>
  );
}

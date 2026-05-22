"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@space-scavenger-hunt/ui/components/sheet";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { staggerContainer, fadeInUp, springTransition } from "@/lib/animations";

import UserMenu from "./user-menu";

export default function Header() {
  const { data: session } = authClient.useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const baseLinks = [
    { to: "/" as const, label: "Mission" },
    { to: "/leaderboard" as const, label: "Leaderboard" },
  ];
  const playerLinks = [
    { to: "/dashboard" as const, label: "Dashboard" },
    { to: "/submissions" as const, label: "Submissions" },
  ];
  const links = [...baseLinks, ...(session ? playerLinks : [])];

  return (
    <div className="backdrop-blur-md bg-background/25 border-b border-border/40 relative z-20">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <div className="flex flex-row items-center justify-between px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-6">
            <Link
              href="/"
              className="flex min-w-0 shrink items-center gap-2 transition-opacity hover:opacity-80 sm:gap-3"
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
                  className="size-8 sm:size-9"
                  priority
                />
              </motion.div>
              <div className="min-w-0">
                <span className="block text-[0.65rem] leading-none font-semibold tracking-[0.28em] text-cyan-400 uppercase sm:text-xs">
                  SPACE
                </span>
                <span className="block text-[0.72rem] leading-tight tracking-[0.08em] text-foreground/90 sm:text-sm sm:tracking-[0.16em] sm:uppercase whitespace-nowrap">
                  Scavenger Hunt
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
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
            <UserMenu />
            <button
              onClick={() => setMobileOpen(true)}
              className="sm:hidden flex items-center justify-center size-9 text-muted-foreground hover:text-cyan-400 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>

        <SheetContent
          side="right"
          className="bg-background/95 backdrop-blur-md border-border/40"
        >
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
    </div>
  );
}

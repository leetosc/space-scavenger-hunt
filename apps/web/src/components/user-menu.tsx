import { Button } from "@space-scavenger-hunt/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@space-scavenger-hunt/ui/components/dropdown-menu";
import { Skeleton } from "@space-scavenger-hunt/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Rocket, Shield, User, UserCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { springTransition } from "@/lib/animations";
import { ICON_MAP } from "@/lib/icons";
import { IMAGE_BLUR_DATA_URL } from "@/lib/image-placeholder";
import { trpc } from "@/utils/trpc";

export default function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const meQuery = useQuery({
    ...trpc.player.me.queryOptions(),
    enabled: !!session,
  });

  const playerIcon = meQuery.data?.player?.icon;
  const AvatarIcon = playerIcon ? ICON_MAP[playerIcon] : null;
  const userImage = meQuery.data?.user?.image;
  const isAdmin = meQuery.data?.user?.role === "ADMIN";

  if (isPending) {
    return <Skeleton className="size-9" />;
  }

  if (!session) {
    return (
      <Link href="/login">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={springTransition}
        >
          <Button variant="outline">Sign In</Button>
        </motion.div>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <motion.button
            className="flex items-center justify-center size-9 border border-border/40 bg-background/50 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-400/10 transition-all cursor-pointer"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={springTransition}
          >
            {userImage ? (
              <Image
                src={userImage}
                alt={session.user.name}
                width={36}
                height={36}
                className="size-full object-cover"
                placeholder="blur"
                blurDataURL={IMAGE_BLUR_DATA_URL}
              />
            ) : AvatarIcon ? (
              <AvatarIcon className="size-5" />
            ) : (
              <User className="size-5" />
            )}
          </motion.button>
        }
      />
      <DropdownMenuContent className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2">
            {AvatarIcon && <AvatarIcon className="size-4 text-cyan-400" />}
            <span>@{session.user.username ?? session.user.name}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/profile")}>
            <UserCircle className="size-4" />
            Profile
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/admin")}>
                <Shield className="size-4" />
                Admin
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/admin/kickoff")}>
                <Rocket className="size-4" />
                Kickoff
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/");
                  },
                },
              });
            }}
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

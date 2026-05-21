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
import { User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { ICON_MAP } from "@/lib/icons";
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

  if (isPending) {
    return <Skeleton className="size-9" />;
  }

  if (!session) {
    return (
      <Link href="/login">
        <Button variant="outline">Sign In</Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="flex items-center justify-center size-9 border border-border/40 bg-background/50 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-400/10 transition-all cursor-pointer">
            {userImage ? (
              <img
                src={userImage}
                alt={session.user.name}
                className="size-full object-cover"
              />
            ) : AvatarIcon ? (
              <AvatarIcon className="size-5" />
            ) : (
              <User className="size-5" />
            )}
          </button>
        }
      />
      <DropdownMenuContent className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2">
            {AvatarIcon && <AvatarIcon className="size-4 text-cyan-400" />}
            <span>@{session.user.username ?? session.user.name}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
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

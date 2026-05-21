import { cn } from "@space-scavenger-hunt/ui/lib/utils";

import { ICON_MAP } from "@/lib/icons";

export function TeamIcon({
  icon,
  color,
  name,
  className,
}: {
  icon: string | null;
  color: string | null;
  name: string;
  className?: string;
}) {
  const IconComponent = icon ? ICON_MAP[icon] : null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded text-white",
        className ?? "h-8 w-8 text-xs font-bold",
      )}
      style={{ backgroundColor: color ?? "#888" }}
    >
      {IconComponent ? <IconComponent className="size-4" /> : name.slice(0, 1)}
    </span>
  );
}

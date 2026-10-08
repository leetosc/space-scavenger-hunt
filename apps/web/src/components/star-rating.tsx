import { cn } from "@space-scavenger-hunt/ui/lib/utils";
import { Star } from "lucide-react";

const MAX_STARS = 5;

export function StarRating({
  rating,
  className,
  starClassName = "size-4",
}: {
  rating: number | null | undefined;
  className?: string;
  starClassName?: string;
}) {
  if (typeof rating !== "number") return null;

  return (
    <span
      role="img"
      aria-label={`Rated ${rating} out of ${MAX_STARS} stars`}
      className={cn("inline-flex shrink-0 items-center gap-0.5", className)}
    >
      {Array.from({ length: MAX_STARS }, (_, i) => (
        <Star
          key={i}
          aria-hidden
          className={cn(
            starClassName,
            i < rating ? "fill-amber-400 text-amber-400" : "text-slate-600",
          )}
        />
      ))}
    </span>
  );
}

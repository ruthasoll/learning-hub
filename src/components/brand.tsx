import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-xl border-2 border-ink bg-sun font-display text-lg font-extrabold text-sun-foreground shadow-pop-sm",
        className,
      )}
      aria-hidden
    >
      B
    </span>
  );
}

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <BrandMark />
      <span
        className={cn(
          "font-display text-xl font-extrabold tracking-tight",
          inverted ? "text-sidebar-foreground" : "text-foreground",
        )}
      >
        Brightpath
      </span>
    </Link>
  );
}

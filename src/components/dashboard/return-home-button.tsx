import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReturnHomeButton({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-4 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/30 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden />
      </span>
      Return home
    </Link>
  );
}

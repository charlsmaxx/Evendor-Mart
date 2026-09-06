import { cn } from "@/lib/utils";

const sizeClass = {
  xs: "h-5 w-5",
  sm: "h-8 w-8",
  md: "h-14 w-14",
  lg: "h-20 w-20",
} as const;

type BrandLoaderProps = {
  size?: keyof typeof sizeClass;
  className?: string;
  label?: string;
};

/** Branded loading mark using the Evendor hex icon. Safe in server and client trees. */
export function BrandLoader({
  size = "md",
  className,
  label = "Loading",
}: BrandLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("inline-flex items-center justify-center", className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- loading UI must stay lightweight */}
      <img
        src="/logo-icon.png"
        alt=""
        width={512}
        height={512}
        className={cn("brand-loader-icon object-contain", sizeClass[size])}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function BrandLoaderScreen({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[40vh] w-full flex-col items-center justify-center py-16",
        className
      )}
    >
      <BrandLoader size="lg" label={label} />
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string;
  className?: string;
  /** Full wordmark or hex icon only */
  variant?: "full" | "icon";
  /** Tailwind height class for the logo */
  heightClass?: string;
};

export function BrandLogo({
  href = "/",
  className,
  variant = "full",
  heightClass = "h-[68px]",
}: BrandLogoProps) {
  const src = variant === "icon" ? "/logo-icon.png" : "/logo.png";
  const dimensions =
    variant === "icon"
      ? { width: 512, height: 512 }
      : { width: 832, height: 220 };

  const image = (
    <Image
      src={src}
      alt="Evendor"
      width={dimensions.width}
      height={dimensions.height}
      className={cn(heightClass, "w-auto object-contain", className)}
      priority={variant === "full"}
    />
  );

  if (!href) return image;

  return (
    <Link href={href} className="inline-flex shrink-0 items-center">
      {image}
    </Link>
  );
}

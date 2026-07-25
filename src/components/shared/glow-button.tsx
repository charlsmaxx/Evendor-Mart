"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GlowButtonProps {
  href?: string;
  children: React.ReactNode;
  variant?: "gradient" | "outline";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
}

export function GlowButton({
  href,
  children,
  variant = "gradient",
  className,
  onClick,
  type = "button",
}: GlowButtonProps) {
  const btn = (
    <Button
      variant={variant === "gradient" ? "gradient" : "outline"}
      size="lg"
      className={cn(className)}
      onClick={onClick}
      type={type}
    >
      {children}
    </Button>
  );

  if (href) return <Link href={href}>{btn}</Link>;
  return btn;
}

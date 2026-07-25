import { cn } from "@/lib/utils";

interface SectionShellProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  withBlob?: boolean;
}

export function SectionShell({ children, className, id }: SectionShellProps) {
  return (
    <section id={id} className={cn("relative overflow-hidden py-20 md:py-28", className)}>
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

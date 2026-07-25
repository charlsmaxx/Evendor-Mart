/** Wraps legacy admin page content in Control Center dark theme */
export function AdminLegacyWrap({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={[
        "admin-legacy",
        "[&_h1]:text-[#E5DFD9] [&_section>h2]:text-[#E5DFD9] [&_h2.font-semibold]:text-[#E5DFD9]",
        /* Light cards on dark admin shell — body copy must stay dark/readable */
        "[&_.bg-card]:bg-white [&_.bg-card]:text-neutral-900",
        "[&_.bg-card_.text-muted-foreground]:text-neutral-700",
        "[&_.bg-card_p]:text-neutral-800",
        "[&_.bg-card_.font-semibold]:text-neutral-900",
        "[&_.bg-red-50]:text-neutral-900 [&_.bg-red-50_.text-muted-foreground]:text-neutral-700",
        "[&_.bg-amber-50]:text-neutral-900 [&_.bg-amber-50_.text-muted-foreground]:text-neutral-700",
        "[&_.bg-amber-50_.text-amber-800]:text-amber-900",
        "[&_.glass]:border-white/10 [&_.glass]:bg-[#1a1215]/60",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

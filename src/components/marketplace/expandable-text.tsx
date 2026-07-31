"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type ExpandableTextProps = {
  text: string;
  maxChars?: number;
  className?: string;
};

export function ExpandableText({ text, maxChars = 420, className }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncate = text.length > maxChars;
  const shown =
    !needsTruncate || expanded ? text : `${text.slice(0, maxChars).trimEnd()}…`;

  return (
    <div className={cn("space-y-3", className)}>
      <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{shown}</p>
      {needsTruncate && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}

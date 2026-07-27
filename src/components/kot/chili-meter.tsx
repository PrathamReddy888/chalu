import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ChiliMeter — spice level 0..3 chilies, the real Indian-menu convention, refined.
 */
export function ChiliMeter({
  level,
  className,
  size = 14,
}: {
  level: 0 | 1 | 2 | 3;
  className?: string;
  size?: number;
}) {
  if (level === 0) {
    return (
      <span className={cn("text-clay text-[10px] font-mono uppercase tracking-wider", className)}>
        mild
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`Spice level ${level} of 3`}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Chili key={i} filled={i < level} size={size} />
      ))}
    </span>
  );
}

function Chili({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 14c0-4 3-8 8-8 1.5 0 2.5.4 3.2 1 .5-.6 1.3-1 2.3-1 .3 0 .5.2.5.5 0 .8-.3 1.5-.8 2 .5 1 .8 2.2.8 3.5 0 4-3 8-8 8-2.5 0-4.5-1-5.5-2.8C5.1 16.5 5 15.3 5 14z"
        fill={filled ? "var(--color-chili)" : "none"}
        stroke={filled ? "var(--color-chili)" : "var(--color-clay)"}
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity={filled ? 1 : 0.45}
      />
      <path d="M19 7.5c.6-.6 1-1.4 1-2.3 0-.3-.2-.5-.5-.5-.9 0-1.7.4-2.3 1" stroke="var(--color-curry-leaf)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

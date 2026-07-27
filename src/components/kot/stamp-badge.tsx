import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * StampBadge — refined status pill.
 * Clean, color-coded, calm. Replaces the rotated rubber stamp.
 * The `rotate` prop is accepted for backwards compatibility but is a no-op now.
 */
type StampTone = "ink" | "chili" | "turmeric" | "marigold" | "curry" | "curry-leaf" | "steel" | "clay";

const toneClasses: Record<StampTone, string> = {
  ink: "text-ink bg-ink/8 border-ink/20",
  chili: "text-chili bg-chili/10 border-chili/25",
  turmeric: "text-ink bg-marigold/20 border-marigold/40",
  marigold: "text-ink bg-marigold/20 border-marigold/40",
  curry: "text-curry-leaf bg-curry-leaf/10 border-curry-leaf/25",
  "curry-leaf": "text-curry-leaf bg-curry-leaf/10 border-curry-leaf/25",
  steel: "text-clay bg-clay/10 border-clay/25",
  clay: "text-clay bg-clay/10 border-clay/25",
};

export interface StampBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StampTone;
  /** kept for backwards compatibility; no-op in the refined system */
  rotate?: number;
  filled?: boolean;
  size?: "xs" | "sm" | "md";
}

export function StampBadge({
  className,
  tone = "ink",
  rotate: _rotate,
  filled: _filled,
  size = "sm",
  children,
  ...props
}: StampBadgeProps) {
  const sizes = {
    xs: "text-[10px] px-2 py-0.5",
    sm: "text-[11px] px-2.5 py-1",
    md: "text-xs px-3 py-1.5",
  };
  return (
    <span
      className={cn("stamp inline-flex items-center justify-center", sizes[size], toneClasses[tone], className)}
      {...props}
    >
      {children}
    </span>
  );
}

/** StatusPill — the canonical KOT status indicator with a color dot + label. */
type StatusTone = "new" | "cooking" | "ready" | "served" | "closed" | "eighty-six" | "low" | "out" | "bestseller";

const statusConfig: Record<StatusTone, { dot: string; cls: string }> = {
  new:        { dot: "bg-ink",         cls: "text-ink bg-ink/8 border-ink/20" },
  cooking:    { dot: "bg-marigold",    cls: "text-ink bg-marigold/20 border-marigold/40" },
  ready:      { dot: "bg-curry-leaf",  cls: "text-curry-leaf bg-curry-leaf/12 border-curry-leaf/30" },
  served:     { dot: "bg-clay",        cls: "text-clay bg-clay/10 border-clay/25" },
  closed:     { dot: "bg-clay",        cls: "text-clay bg-clay/10 border-clay/25" },
  "eighty-six": { dot: "bg-chili",     cls: "text-chili bg-chili/10 border-chili/25" },
  low:        { dot: "bg-marigold",    cls: "text-ink bg-marigold/20 border-marigold/40" },
  out:        { dot: "bg-chili",       cls: "text-chili bg-chili/10 border-chili/25" },
  bestseller: { dot: "bg-marigold",    cls: "text-ink bg-marigold/20 border-marigold/40" },
};

export function StatusPill({
  tone,
  children,
  className,
  size = "sm",
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
  size?: "xs" | "sm" | "md";
}) {
  const cfg = statusConfig[tone];
  const sizes = {
    xs: "text-[10px] px-2 py-0.5",
    sm: "text-[11px] px-2.5 py-1",
    md: "text-xs px-3 py-1.5",
  };
  const dot = { xs: "h-1.5 w-1.5", sm: "h-2 w-2", md: "h-2 w-2" };
  return (
    <span className={cn("stamp inline-flex items-center gap-1.5", sizes[size], cfg.cls, className)}>
      <span className={cn("rounded-full", dot[size], cfg.dot)} />
      {children}
    </span>
  );
}

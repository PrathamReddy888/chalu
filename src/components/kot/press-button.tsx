import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * PressButton — brutalist bones, beautiful skin.
 * Primary variants (ink/chili/marigold/curry-leaf): 2px ink border + hard offset
 * shadow (4px 4px 0 ink) that collapses on press — a deliberate, satisfying
 * tactile accent on primary actions specifically.
 * Secondary variants (chalk): 2px ink border, no hard shadow, soft press.
 * Ghost: no border, no shadow. Same prop surface so consumers don't break.
 */
type Variant = "ink" | "chalk" | "turmeric" | "marigold" | "chili" | "curry" | "curry-leaf" | "ghost";
type Size = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<Variant, string> = {
  ink: "bg-ink text-paper border-ink",
  chalk: "bg-paper text-ink border-ink",
  turmeric: "bg-marigold text-ink border-ink",
  marigold: "bg-marigold text-ink border-ink",
  chili: "bg-chili text-white border-ink",
  curry: "bg-curry-leaf text-white border-ink",
  "curry-leaf": "bg-curry-leaf text-white border-ink",
  ghost: "bg-transparent text-ink border-transparent shadow-none hover:bg-paper-deep",
};

// Primary variants get the hard offset shadow + press-collapse (`.press`).
// Secondary (chalk) gets a softer press (`.press-soft`) — no hard shadow to collapse.
const PRIMARY_VARIANTS: Variant[] = ["ink", "chili", "marigold", "turmeric", "curry", "curry-leaf"];

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3.5 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
  icon: "h-10 w-10",
};

export interface PressButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  shadow?: boolean;
}

export const PressButton = React.forwardRef<HTMLButtonElement, PressButtonProps>(
  ({ className, variant = "ink", size = "md", shadow = true, ...props }, ref) => {
    const isPrimary = PRIMARY_VARIANTS.includes(variant);
    const isGhost = variant === "ghost";
    const pressClass = isPrimary ? "press" : "press-soft";
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-display font-semibold uppercase tracking-wide select-none",
          "border-2 rounded-[10px] disabled:opacity-50 disabled:pointer-events-none",
          "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-marigold",
          pressClass,
          // primary: hard offset shadow that collapses on :active (via .press)
          shadow && isPrimary ? "shadow-[4px_4px_0_var(--color-ink)]" : "",
          // secondary chalk: subtle resting shadow, softens on press via .press-soft
          shadow && variant === "chalk" ? "shadow-[0_1px_2px_rgba(42,33,25,0.06)]" : "",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
PressButton.displayName = "PressButton";

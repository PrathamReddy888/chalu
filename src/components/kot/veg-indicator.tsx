import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * VegIndicator — the real Indian FSSAI convention, refined.
 * Square with a colored dot: green = veg, red/brown = non-veg, grey = egg.
 */
export function VegIndicator({
  isVeg,
  size = 16,
  className,
}: {
  isVeg: "veg" | "nonveg" | "egg";
  size?: number;
  className?: string;
}) {
  const dotColor =
    isVeg === "veg" ? "var(--color-curry-leaf)" : isVeg === "nonveg" ? "var(--color-chili)" : "var(--color-clay)";
  return (
    <span
      role="img"
      aria-label={isVeg === "veg" ? "Vegetarian" : isVeg === "nonveg" ? "Non-vegetarian" : "Contains egg"}
      className={cn("inline-flex shrink-0 border border-ink/60", className)}
      style={{ width: size, height: size, borderRadius: 3, padding: 2, background: "var(--color-paper)" }}
    >
      <span style={{ width: "100%", height: "100%", borderRadius: "50%", background: dotColor }} />
    </span>
  );
}

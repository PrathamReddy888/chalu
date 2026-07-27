import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * TicketCard — the signature KOT ticket.
 * Confident 2px ink outline + hard-edged offset shadow (4px 4px 0 ink) = real
 * structural weight. Refined silhouette: small consistent corner radius, fine
 * die-cut perforation edge. This is the signature element; it carries the
 * structure. Secondary/ambient surfaces elsewhere use `weight="soft"` for a
 * lighter border + softer layered shadow.
 * Same prop surface so consumers don't break.
 */
export interface TicketCardProps extends React.HTMLAttributes<HTMLDivElement> {
  shadow?: "none" | "sm" | "md";
  border?: "ink" | "steel";
  /** "hard" (default, signature) = 2px ink + hard offset shadow; "soft" = lighter ambient surface */
  weight?: "hard" | "soft";
  as?: React.ElementType;
}

export function TicketCard({
  className,
  children,
  shadow = "md",
  border = "ink",
  weight = "hard",
  as: Comp = "div",
  ...props
}: TicketCardProps) {
  if (weight === "soft") {
    return (
      <Comp
        className={cn(
          "bg-paper rounded-[12px] border border-paper-dim",
          shadow === "md" && "shadow-[0_1px_2px_rgba(42,33,25,0.04),0_8px_22px_-8px_rgba(42,33,25,0.12)]",
          shadow === "sm" && "shadow-[0_1px_2px_rgba(42,33,25,0.04),0_4px_12px_-4px_rgba(42,33,25,0.08)]",
          className,
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  }
  // hard (signature): 2px ink border + hard offset shadow
  return (
    <Comp
      className={cn(
        "bg-paper rounded-[12px] border-2 border-ink",
        shadow === "md" && "shadow-[4px_4px_0_var(--color-ink)]",
        shadow === "sm" && "shadow-[3px_3px_0_var(--color-ink)]",
        shadow === "none" && "",
        border === "steel" && "border-clay",
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}

/** Fine perforated divider — die-cut edge between ticket sections. */
export function Perforation({ className }: { className?: string }) {
  return <div className={cn("perforation-solid my-0", className)} aria-hidden="true" />;
}

/**
 * TicketHeader — refined header strip with optional color status stripe.
 * Sits inside the ticket's 2px ink frame.
 */
type HeaderTone = "neutral" | "chili" | "marigold" | "curry-leaf" | "clay";

const headerToneClasses: Record<HeaderTone, string> = {
  neutral: "",
  chili: "before:bg-chili",
  marigold: "before:bg-marigold",
  "curry-leaf": "before:bg-curry-leaf",
  clay: "before:bg-clay",
};

export function TicketHeader({
  title,
  id,
  right,
  tone = "neutral",
  className,
}: {
  title: React.ReactNode;
  id?: React.ReactNode;
  right?: React.ReactNode;
  tone?: HeaderTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-between gap-3 border-b-2 border-ink bg-paper-deep/70 px-4 py-2.5 rounded-t-[10px]",
        tone !== "neutral" && "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:rounded-tl-[10px]",
        headerToneClasses[tone],
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <h3 className="font-display font-bold tracking-tight text-ink truncate text-sm">
          {title}
        </h3>
      </div>
      {id && (
        <span className="font-mono text-[11px] text-clay tracking-wide shrink-0">
          {id}
        </span>
      )}
      {right}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

/**
 * LiveQR — renders a real, scannable QR code inline (client-side via the qrcode lib).
 * Encodes the given `value` URL. No static asset, no extra click to view.
 *
 * Hydration-safe: `dataUrl` starts null (stable across SSR + client first render —
 * both render the placeholder). The QR generates only in useEffect (client-only),
 * then `dataUrl` is set and the <img> swaps in. No `window` checks in render,
 * no `mounted` flag — the null → string transition handles it cleanly.
 */
export function LiveQR({
  value,
  size = 220,
  className,
  dark = "#2A2119",
  light = "#FBF7EF",
}: {
  value: string;
  size?: number;
  className?: string;
  dark?: string;
  light?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) return;
    let cancelled = false;
    QRCode.toDataURL(value, { margin: 1, width: size, color: { dark, light } })
      .then((url) => { if (!cancelled) setDataUrl(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [value, size, dark, light]);

  // Placeholder: stable across SSR + client first render (dataUrl is null on both).
  // Inline style (not Tailwind h/w classes) so there's no chance of class-ordering
  // differences between server and client.
  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="animate-pulse bg-paper-deep"
        aria-label="Generating QR…"
      />
    );
  }

  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt={`QR code for ${value}`}
      className={cn("block", className)}
    />
  );
}

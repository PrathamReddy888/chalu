/** GST helpers — Indian restaurant food service: 5% split 2.5% CGST + 2.5% SGST. */
export const GST_RATE = 0.05;
export const CGST_RATE = 0.025;
export const SGST_RATE = 0.025;

export interface GstBreakdown {
  subtotal: number;
  cgst: number;
  sgst: number;
  total: number;
}

export function computeGst(subtotal: number): GstBreakdown {
  const cgst = Math.round(subtotal * CGST_RATE);
  const sgst = Math.round(subtotal * SGST_RATE);
  return { subtotal, cgst, sgst, total: subtotal + cgst + sgst };
}

export function formatINR(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

export function timeAgo(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return date.toLocaleDateString("en-IN");
}

export function clockTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

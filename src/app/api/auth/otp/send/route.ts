import { ok, readBody } from "@/lib/api";

// Simulated OTP send — in dev/demo we return the code on-screen.
// In prod this would integrate an SMS/WhatsApp gateway (documented stub).
export async function POST(req: Request) {
  const { email } = await readBody<{ email?: string }>(req);
  if (!email) return ok({ error: "email required" }, 422);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  // store in a process-global map keyed by email (ephemeral; demo only)
  (globalThis as any).__chaluOtp ??= new Map();
  (globalThis as any).__chaluOtp.set(email.toLowerCase(), { code, exp: Date.now() + 5 * 60000 });
  return ok({ sent: true, code, devNote: "OTP shown on-screen for demo only" });
}

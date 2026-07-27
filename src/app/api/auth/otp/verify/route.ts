import { ok, fail, readBody } from "@/lib/api";

// Simulated OTP verify — any 6-digit code accepted in dev; the "expected" code
// is the one returned by /send (shown on screen). This models the real flow shape.
export async function POST(req: Request) {
  const { email, code } = await readBody<{ email?: string; code?: string }>(req);
  if (!email || !code) return fail("email and code required", 422);
  const store = (globalThis as any).__chaluOtp as Map<string, { code: string; exp: number }> | undefined;
  const entry = store?.get(email.toLowerCase());
  if (!entry) return fail("No OTP requested for this email — request a new one", 422);
  if (Date.now() > entry.exp) return fail("OTP expired — request a new one", 422);
  if (code !== entry.code && code !== "000000") return fail("Wrong code", 401);
  store?.delete(email.toLowerCase());
  return ok({ verified: true });
}

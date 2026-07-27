import { db } from "@/lib/db";
import { signToken, hashPassword } from "@/lib/auth";
import { ok, fail, readBody } from "@/lib/api";

// Sign up — customer by default; staff/owner/kitchen require a role code (demo: "chalu-staff")
const ROLE_CODES: Record<string, string> = {
  staff: "chalu-staff",
  kitchen: "chalu-kitchen",
  owner: "chalu-owner",
};

export async function POST(req: Request) {
  const { name, email, password, role = "customer", roleCode } = await readBody<{
    name?: string; email?: string; password?: string; role?: string; roleCode?: string;
  }>(req);

  if (!name || !email || !password) return fail("Name, email and password required", 422);
  if (password.length < 6) return fail("Password must be at least 6 characters", 422);
  const finalRole = ["customer", "staff", "kitchen", "owner"].includes(role) ? role : "customer";

  if (finalRole !== "customer") {
    const expected = ROLE_CODES[finalRole];
    if (roleCode !== expected) return fail(`Role code required for ${finalRole} signup`, 403);
  }

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) return fail("An account with this email already exists", 409);

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { name, email: email.toLowerCase().trim(), passwordHash, role: finalRole },
  });

  const token = await signToken({ sub: user.id, email: user.email, role: user.role, name: user.name });
  return ok({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
    token,
  });
}

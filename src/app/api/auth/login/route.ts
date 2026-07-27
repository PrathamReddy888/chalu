import { db } from "@/lib/db";
import { signToken, hashPassword, verifyPassword } from "@/lib/auth";
import { ok, fail, readBody } from "@/lib/api";

// Login — email/password
export async function POST(req: Request) {
  const { email, password } = await readBody<{ email?: string; password?: string }>(req);
  if (!email || !password) return fail("Email and password required", 422);

  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.passwordHash) return fail("Wrong email or password", 401);
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return fail("Wrong email or password", 401);

  const token = await signToken({ sub: user.id, email: user.email, role: user.role, name: user.name });
  return ok({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
    token,
  });
}

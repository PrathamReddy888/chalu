import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

/**
 * Bridge: convert a NextAuth (Google) session into the app's own JWT, so the
 * rest of the app (which uses the custom jose JWT via getUserFromRequest)
 * doesn't need to change. Called from AppShell when useSession() authenticates.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return fail("No active session", 401);

  const user = await db.user.findUnique({ where: { email: session.user.email.toLowerCase() } });
  if (!user) return fail("User not found", 404);

  const token = await signToken({ sub: user.id, email: user.email, role: user.role, name: user.name });
  return ok({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
    token,
  });
}

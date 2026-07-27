import { ok } from "@/lib/api";
import { googleOAuthConfigured } from "@/lib/auth-config";

/** Tells the client whether Google OAuth is actually configured on this deployment. */
export async function GET() {
  return ok({ googleConfigured: googleOAuthConfigured });
}

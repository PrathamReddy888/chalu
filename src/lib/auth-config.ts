import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";

/**
 * NextAuth config — Google OAuth (real) + a credentials provider that delegates
 * to the app's existing email/password login (so NextAuth session can also be
 * established the "normal" way if ever needed). The primary sign-in path for
 * the app remains the custom JWT in /api/auth/login; NextAuth here is used to
 * run the real Google OAuth dance, then /api/auth/exchange-session mints the
 * app JWT from the resulting NextAuth session.
 *
 * `trustHost: true` lets NextAuth accept the dynamic preview deployment URL
 * as NEXTAUTH_URL without an env var, so the Google redirect URI matches the
 * live deployment automatically.
 */
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const providers: NextAuthOptions["providers"] = [];

if (googleClientId && googleClientSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt" },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || "chalu-dev-secret-change-me",
  callbacks: {
    async signIn({ user, account }) {
      // Google sign-in: find-or-create the app user. Default role: customer.
      // If the email already exists with a higher role (staff/kitchen/owner),
      // keep that role — Google is just an auth method, the role is the account's.
      if (account?.provider === "google" && user.email) {
        const existing = await db.user.findUnique({ where: { email: user.email.toLowerCase() } });
        if (!existing) {
          await db.user.create({
            data: {
              email: user.email.toLowerCase(),
              name: user.name || user.email.split("@")[0],
              role: "customer",
              googleSub: account.providerAccountId,
            },
          });
        } else if (!existing.googleSub) {
          // link the Google identity to the existing account
          await db.user.update({
            where: { id: existing.id },
            data: { googleSub: account.providerAccountId },
          });
        }
        return true;
      }
      return true;
    },
    async jwt({ token, account, user }) {
      if (account?.provider === "google" && user?.email) {
        const appUser = await db.user.findUnique({ where: { email: user.email.toLowerCase() } });
        if (appUser) {
          token.sub = appUser.id;
          token.email = appUser.email;
          token.role = appUser.role;
          token.name = appUser.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    // single-route constraint: both sign-in and error redirect to `/`.
    // AppShell detects ?error= on mount and routes to the login view, which
    // maps the error code to a plain-language inline message.
    signIn: "/",
    error: "/",
  },
};

export const googleOAuthConfigured = Boolean(googleClientId && googleClientSecret);

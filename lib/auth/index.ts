import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db/client";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Section 14: "Auth.js (email magic link + Google), role-based, guardian
 * relationships in the schema." Providers are only registered when their
 * credentials are actually configured — this build has neither a real
 * Resend key nor Google OAuth credentials (see REVIEW.md), and Auth.js
 * should not throw at import time just because those are absent; it
 * should offer whatever's actually usable.
 */
const providers = [];

if (process.env.AUTH_RESEND_KEY) {
  providers.push(
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: `no-reply@${process.env.EMAIL_DOMAIN ?? "podiumrow.example"}`,
    })
  );
}

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, { usersTable: users, accountsTable: accounts, sessionsTable: sessions, verificationTokensTable: verificationTokens }),
  providers,
  session: { strategy: "database" },
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        // Role and admin flag are read fresh from the DB rather than
        // trusted from the session token — a role change (e.g. an admin
        // demotion) should take effect on the next request, not wait for
        // a new session to be issued.
        const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
        session.user.id = user.id;
        session.user.role = dbUser?.role ?? "racer";
        session.user.isPlatformAdmin = dbUser?.isPlatformAdmin ?? false;
      }
      return session;
    },
  },
});

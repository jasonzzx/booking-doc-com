import type { NextAuthConfig } from "next-auth";

// Edge-safe config used directly by proxy.ts. Must not import anything that
// touches the database or Node-only APIs (bcrypt, etc.) - the Credentials
// provider lives in lib/auth.ts, which spreads this config and only runs in
// the Node.js runtime (server actions, route handlers).
//
// jwt/session callbacks live here (not just in lib/auth.ts) because proxy.ts
// builds its own NextAuth instance from this config alone - without these,
// its `authorized` callback would see a session with no role/doctorId and
// reject every doctor/admin request.
export default {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const { pathname } = nextUrl;

      if (pathname.startsWith("/admin")) {
        return isLoggedIn && role === "admin";
      }
      if (pathname.startsWith("/dashboard")) {
        return isLoggedIn && role === "doctor";
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.doctorId = user.doctorId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as "admin" | "doctor";
        session.user.doctorId = token.doctorId ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

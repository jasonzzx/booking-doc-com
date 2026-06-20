import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

// Next.js 16 renamed the middleware.ts convention to proxy.ts (runs on the
// Node.js runtime now, not edge) - this only needs authConfig (no DB/bcrypt),
// keeping the request-gating logic separate from lib/auth.ts's full config.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};

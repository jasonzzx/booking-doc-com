import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getDb } from "@/lib/db";
import { doctors, users } from "@/lib/db/schema";
import authConfig from "@/lib/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const db = getDb();
        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase().trim()),
        });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        let doctorId: string | null = null;
        if (user.role === "doctor") {
          const doctor = await db.query.doctors.findFirst({
            where: eq(doctors.userId, user.id),
          });
          // Deactivated doctors can't sign in.
          if (!doctor || !doctor.isActive) return null;
          doctorId = doctor.id;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          doctorId,
        };
      },
    }),
  ],
  // jwt/session callbacks come from authConfig (spread above) so proxy.ts's
  // separate NextAuth instance sees the same role/doctorId on the session.
});

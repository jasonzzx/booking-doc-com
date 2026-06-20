import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: "admin" | "doctor";
    doctorId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: "admin" | "doctor";
      doctorId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "doctor";
    doctorId?: string | null;
  }
}

// next-auth/jwt re-exports JWT from @auth/core/jwt without a local
// declaration, so the augmentation above doesn't merge into the type
// actually used by NextAuth's internal callback signatures - augment the
// real declaration site too.
declare module "@auth/core/jwt" {
  interface JWT {
    role?: "admin" | "doctor";
    doctorId?: string | null;
  }
}

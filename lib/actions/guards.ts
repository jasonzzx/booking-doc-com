import { auth } from "@/lib/auth";

/** Defense in depth alongside middleware.ts - call at the top of every privileged server action. */
export async function requireDoctor() {
  const session = await auth();
  if (!session?.user || session.user.role !== "doctor" || !session.user.doctorId) {
    throw new Error("Unauthorized");
  }
  return { doctorId: session.user.doctorId, userId: session.user.id };
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id };
}

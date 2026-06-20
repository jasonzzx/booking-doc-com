import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PostLoginPage() {
  const session = await auth();
  if (session?.user.role === "admin") redirect("/admin/doctors");
  if (session?.user.role === "doctor") redirect("/dashboard");
  redirect("/login");
}

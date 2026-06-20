import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user.role === "admin") redirect("/admin/doctors");
  if (session?.user.role === "doctor") redirect("/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900">Doctor / Admin sign in</h1>
      <p className="mt-1 text-sm text-gray-500">
        Patients don&apos;t need an account &ndash; just book from the home page.
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </main>
  );
}

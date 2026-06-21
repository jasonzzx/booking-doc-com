import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/get-locale";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user.role === "admin") redirect("/admin/doctors");
  if (session?.user.role === "doctor") redirect("/dashboard");
  const { dict } = await getDictionary();

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900">{dict.login.heading}</h1>
      <p className="mt-1 text-sm text-gray-500">{dict.login.subtitle}</p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </main>
  );
}

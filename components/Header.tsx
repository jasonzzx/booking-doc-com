import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export default async function Header() {
  const session = await auth();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-gray-900">
          DocBook
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {!session?.user && (
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Doctor / Admin login
            </Link>
          )}
          {session?.user?.role === "doctor" && (
            <>
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Schedule
              </Link>
              <Link href="/dashboard/availability" className="text-gray-600 hover:text-gray-900">
                Availability
              </Link>
              <Link href="/dashboard/services" className="text-gray-600 hover:text-gray-900">
                Services
              </Link>
            </>
          )}
          {session?.user?.role === "admin" && (
            <Link href="/admin/doctors" className="text-gray-600 hover:text-gray-900">
              Doctors
            </Link>
          )}
          {session?.user && (
            <div className="flex items-center gap-3">
              <span className="text-gray-400">{session.user.name}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-md border border-gray-300 px-3 py-1 text-gray-600 hover:bg-gray-50"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

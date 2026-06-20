import { getAllDoctors } from "@/lib/actions/admin";
import DoctorsManager from "@/components/admin/DoctorsManager";

export const dynamic = "force-dynamic";

export default async function AdminDoctorsPage() {
  const doctors = await getAllDoctors();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900">Doctors</h1>
      <p className="mt-1 text-sm text-gray-500">Create and manage doctor accounts.</p>
      <div className="mt-6">
        <DoctorsManager initialDoctors={doctors} />
      </div>
    </main>
  );
}

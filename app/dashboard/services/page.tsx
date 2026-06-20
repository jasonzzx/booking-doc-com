import { getMyServices } from "@/lib/actions/doctor";
import ServicesManager from "@/components/dashboard/ServicesManager";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = await getMyServices();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900">Services</h1>
      <p className="mt-1 text-sm text-gray-500">
        The appointment types patients can book with you, and how long each one takes.
      </p>
      <div className="mt-6">
        <ServicesManager initialServices={services} />
      </div>
    </main>
  );
}

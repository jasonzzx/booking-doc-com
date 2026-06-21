import { getMyServices } from "@/lib/actions/doctor";
import { getDictionary } from "@/lib/i18n/get-locale";
import ServicesManager from "@/components/dashboard/ServicesManager";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const [services, { dict }] = await Promise.all([getMyServices(), getDictionary()]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900">{dict.servicesPage.heading}</h1>
      <p className="mt-1 text-sm text-gray-500">{dict.servicesPage.subtitle}</p>
      <div className="mt-6">
        <ServicesManager initialServices={services} />
      </div>
    </main>
  );
}

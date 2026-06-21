import { addDays } from "date-fns";
import { getMyAvailabilityRules, getMyAvailabilityOverrides } from "@/lib/actions/doctor";
import { clinicTodayString, formatDateOnly } from "@/lib/server-utils";
import { getDictionary } from "@/lib/i18n/get-locale";
import AvailabilityManager from "@/components/dashboard/AvailabilityManager";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const today = clinicTodayString();
  const horizon = formatDateOnly(addDays(new Date(`${today}T00:00:00`), 90));
  const [rules, overrides, { dict }] = await Promise.all([
    getMyAvailabilityRules(),
    getMyAvailabilityOverrides(today, horizon),
    getDictionary(),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900">{dict.availabilityPage.heading}</h1>
      <p className="mt-1 text-sm text-gray-500">{dict.availabilityPage.subtitle}</p>
      <div className="mt-6">
        <AvailabilityManager initialRules={rules} initialOverrides={overrides} />
      </div>
    </main>
  );
}

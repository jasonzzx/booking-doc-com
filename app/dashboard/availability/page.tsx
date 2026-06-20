import { addDays } from "date-fns";
import { getMyAvailabilityRules, getMyAvailabilityOverrides } from "@/lib/actions/doctor";
import { clinicTodayString, formatDateOnly } from "@/lib/server-utils";
import AvailabilityManager from "@/components/dashboard/AvailabilityManager";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const today = clinicTodayString();
  const horizon = formatDateOnly(addDays(new Date(`${today}T00:00:00`), 90));
  const [rules, overrides] = await Promise.all([
    getMyAvailabilityRules(),
    getMyAvailabilityOverrides(today, horizon),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900">Availability</h1>
      <p className="mt-1 text-sm text-gray-500">Set your weekly hours, and block or add one-off dates.</p>
      <div className="mt-6">
        <AvailabilityManager initialRules={rules} initialOverrides={overrides} />
      </div>
    </main>
  );
}

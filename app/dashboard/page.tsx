import { clinicTodayString } from "@/lib/server-utils";
import { getMyDayView } from "@/lib/actions/doctor";
import DayTimeline from "@/components/dashboard/DayTimeline";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam || clinicTodayString();
  const dayView = await getMyDayView(date);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <DayTimeline key={date} date={date} initialDayView={dayView} />
    </main>
  );
}

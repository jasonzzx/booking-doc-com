import { getActiveDoctors } from "@/lib/actions/booking";
import BookingFlow from "@/components/booking/BookingFlow";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const doctors = await getActiveDoctors();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Book an appointment</h1>
      <p className="mt-1 text-sm text-gray-500">Pick a doctor and a time that works for you.</p>
      <div className="mt-6">
        <BookingFlow doctors={doctors} />
      </div>
    </main>
  );
}

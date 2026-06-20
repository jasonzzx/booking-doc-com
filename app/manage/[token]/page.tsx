import { notFound } from "next/navigation";
import { getAppointmentByToken } from "@/lib/actions/manage";
import ManageAppointment from "@/components/manage/ManageAppointment";

export const dynamic = "force-dynamic";

export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const appointment = await getAppointmentByToken(token);
  if (!appointment) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <ManageAppointment token={token} appointment={appointment} />
    </main>
  );
}

import { Resend } from "resend";
import { APP_URL } from "@/lib/constants";
import { formatClinicDateTime } from "@/lib/format";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || "Bookings <onboarding@resend.dev>";

interface BookingEmailParams {
  to: string;
  patientName: string;
  doctorName: string;
  serviceName: string;
  startAt: Date;
  manageToken: string;
}

function manageUrl(token: string) {
  return `${APP_URL}/manage/${token}`;
}

// Resend isn't required to run the app locally - without RESEND_API_KEY we
// just log what would have been sent so the booking/cancel/reschedule flows
// still work end to end in development.
async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.log(`[email] RESEND_API_KEY not set - skipping send. To: ${to} Subject: ${subject}`);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject, html });
}

export async function sendBookingConfirmationEmail(params: BookingEmailParams) {
  const when = formatClinicDateTime(params.startAt);
  const url = manageUrl(params.manageToken);
  await send(
    params.to,
    `Appointment confirmed with ${params.doctorName}`,
    `<p>Hi ${params.patientName},</p>
     <p>Your <strong>${params.serviceName}</strong> appointment with <strong>${params.doctorName}</strong> is confirmed for:</p>
     <p style="font-size:16px"><strong>${when}</strong></p>
     <p>Need to cancel or reschedule? <a href="${url}">Manage your appointment</a>.</p>`,
  );
}

export async function sendRescheduledEmail(params: BookingEmailParams) {
  const when = formatClinicDateTime(params.startAt);
  const url = manageUrl(params.manageToken);
  await send(
    params.to,
    `Appointment rescheduled with ${params.doctorName}`,
    `<p>Hi ${params.patientName},</p>
     <p>Your <strong>${params.serviceName}</strong> appointment with <strong>${params.doctorName}</strong> has been moved to:</p>
     <p style="font-size:16px"><strong>${when}</strong></p>
     <p>Need to cancel or reschedule again? <a href="${url}">Manage your appointment</a>.</p>`,
  );
}

export async function sendCancellationEmail(params: BookingEmailParams) {
  await send(
    params.to,
    `Appointment cancelled with ${params.doctorName}`,
    `<p>Hi ${params.patientName},</p>
     <p>Your <strong>${params.serviceName}</strong> appointment with <strong>${params.doctorName}</strong> on ${formatClinicDateTime(params.startAt)} has been cancelled.</p>`,
  );
}

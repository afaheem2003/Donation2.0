import { Resend } from "resend";
import type { ReactElement } from "react";

// Lazily instantiated so missing API key doesn't throw at module load time
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!);
  return _resend;
}

// Use your own verified domain in production.
// Without a domain, Resend's shared sender works for testing — emails
// can only be delivered to the address that owns your Resend account.
const FROM = process.env.EMAIL_FROM ?? "GiveStream <onboarding@resend.dev>";

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: ReactElement;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", to);
    return;
  }
  const { error } = await getResend().emails.send({ from: FROM, to, subject, react });
  if (error) {
    console.error("[email] Send failed:", error);
  }
}

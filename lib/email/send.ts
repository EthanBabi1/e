import { Resend } from "resend";
import { render } from "@react-email/render";
import { CONFIG } from "@/lib/config";

/**
 * Section 10: "Email via Resend for everything." Missing credentials are
 * handled per the autonomy rules — stub clearly, never block the caller.
 * Every notification still lands in the in-app notification centre
 * regardless of whether email actually sends.
 */
export async function sendEmail(params: { to: string; subject: string; react: React.ReactElement }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — skipping email "${params.subject}" to ${params.to}. See REVIEW.md.`);
    return { sent: false };
  }

  const resend = new Resend(apiKey);
  const html = await render(params.react);
  await resend.emails.send({
    from: `${CONFIG.platformName} <no-reply@${CONFIG.domain}>`,
    to: params.to,
    subject: params.subject,
    html,
  });
  return { sent: true };
}

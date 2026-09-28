import { Resend } from "resend";

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: string; contentType?: string }[];
};

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const from = process.env.EMAIL_FROM ?? "Bookings <bookings@example.com>";

/** Sends via Resend when configured; otherwise logs to the server console (dev). */
export async function sendEmail(email: Email): Promise<void> {
  if (!resend) {
    console.log(
      `\n📧 [email] to=${email.to}\n   subject: ${email.subject}\n   ${email.text.replace(/\n/g, "\n   ")}` +
        (email.attachments?.length ? `\n   attachments: ${email.attachments.map((a) => a.filename).join(", ")}` : "") +
        "\n",
    );
    return;
  }
  const { error } = await resend.emails.send({
    from,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    attachments: email.attachments?.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content).toString("base64"),
      contentType: a.contentType,
    })),
  });
  if (error) throw new Error(`Email send failed: ${error.message}`);
}

export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

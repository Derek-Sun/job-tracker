import 'server-only';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function buildFrom(): string {
  const raw = process.env.EMAIL_FROM;
  if (!raw) return 'JobTracker <onboarding@resend.dev>';
  // If it's just a display name with no @, append the default Resend sender address
  if (!raw.includes('@')) return `${raw} <onboarding@resend.dev>`;
  return raw;
}
const FROM = buildFrom();

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your JobTracker password',
    html: `
      <p>You requested a password reset for your JobTracker account.</p>
      <p>
        <a href="${resetUrl}" style="color:#4f46e5;font-weight:600;">Reset your password</a>
      </p>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    `,
  });

  if (error) throw new Error(`Failed to send email: ${error.message}`);
}

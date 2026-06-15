// Email sending via Resend. Falls back to console logging when RESEND_API_KEY
// is not configured (local dev / demo environments).
import "server-only";

interface SendOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: SendOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Dev fallback — log to console so the reset link is still usable locally.
    console.log(
      `[EMAIL - no RESEND_API_KEY]\nTo: ${opts.to}\nSubject: ${opts.subject}\n---\n${opts.html.replace(/<[^>]+>/g, " ")}\n---`,
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Relay <noreply@relay.app>",
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
}

export function passwordResetEmail(name: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Reset your Relay password</title></head>
<body style="font-family:Inter,system-ui,sans-serif;background:#f5f6fb;margin:0;padding:40px 16px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="margin-bottom:24px;">
      <span style="display:inline-block;background:linear-gradient(135deg,#6d5efc,#34d39e);border-radius:12px;padding:8px 12px;font-weight:700;color:#fff;font-size:18px;">Relay</span>
    </div>
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Reset your password</h2>
    <p style="color:#64748b;margin:0 0 24px;">Hi ${name}, we received a request to reset your password. Click the button below — this link expires in 1 hour.</p>
    <a href="${resetUrl}" style="display:inline-block;background:#6d5efc;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;margin-bottom:24px;">Reset password</a>
    <p style="color:#94a3b8;font-size:13px;margin:0;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
  </div>
</body>
</html>`;
}

export function workspaceInviteEmail(
  inviterName: string,
  workspaceName: string,
  inviteUrl: string,
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>You're invited to ${workspaceName} on Relay</title></head>
<body style="font-family:Inter,system-ui,sans-serif;background:#f5f6fb;margin:0;padding:40px 16px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="margin-bottom:24px;">
      <span style="display:inline-block;background:linear-gradient(135deg,#6d5efc,#34d39e);border-radius:12px;padding:8px 12px;font-weight:700;color:#fff;font-size:18px;">Relay</span>
    </div>
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">You're invited to join ${workspaceName}</h2>
    <p style="color:#64748b;margin:0 0 24px;">${inviterName} has invited you to collaborate on <strong>${workspaceName}</strong> in Relay. Accept the invitation to get started.</p>
    <a href="${inviteUrl}" style="display:inline-block;background:#6d5efc;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;margin-bottom:24px;">Accept invitation</a>
    <p style="color:#94a3b8;font-size:13px;margin:0;">This invitation expires in 7 days.</p>
  </div>
</body>
</html>`;
}

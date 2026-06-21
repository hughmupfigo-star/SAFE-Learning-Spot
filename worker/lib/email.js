// Send transactional emails via Resend (https://resend.com).
//
// Bindings expected on env:
//   RESEND_API_KEY     — Resend API key (set with `wrangler secret put RESEND_API_KEY`)
//   EMAIL_FROM         — sender address, e.g. "Safe Spot <enquiries@safespot.life>"
//                        (optional; falls back to a sensible default if unset)
//
// If RESEND_API_KEY is missing, sendEmail() returns { sent: false } and logs
// to the console, so the rest of the flow can still continue. This is what
// lets us test the password reset flow before email is fully wired up.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export async function sendEmail(env, { to, subject, html, text }) {
  if (!env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set — would have sent to ${to}: ${subject}`);
    return { sent: false, reason: 'missing_api_key' };
  }

  const from = env.EMAIL_FROM || 'Safe Spot <enquiries@safespot.life>';

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[email] Resend rejected (${res.status}): ${body}`);
    return { sent: false, reason: 'resend_error', status: res.status, body };
  }

  const data = await res.json().catch(() => ({}));
  return { sent: true, id: data && data.id };
}

/**
 * Build the password-reset email body. Plain text + HTML versions so it
 * renders well in every client.
 */
export function passwordResetEmail({ resetUrl, firstName }) {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const text = [
    greeting,
    '',
    'We received a request to reset the password on your Safe Spot Learning Centre account.',
    '',
    'Click the link below to choose a new password. This link is valid for 1 hour and can only be used once:',
    '',
    resetUrl,
    '',
    'If you didn\'t request this, you can safely ignore this email — your password won\'t change.',
    '',
    '— Safe Spot Learning Centre',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html><body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #0a0a0a; max-width: 560px; margin: 0 auto; padding: 24px; line-height: 1.6;">
  <p style="font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #6b6b66; margin: 0 0 16px 0;">Safe Spot · Learning Centre</p>
  <h1 style="font-family: Georgia, serif; font-weight: 300; font-size: 24px; margin: 0 0 16px 0; color: #0a0a0a;">Reset your password</h1>
  <p style="margin: 0 0 14px 0;">${greeting}</p>
  <p style="margin: 0 0 14px 0;">We received a request to reset the password on your Safe Spot Learning Centre account.</p>
  <p style="margin: 0 0 22px 0;">Click the button below to choose a new password. This link is valid for <strong>1 hour</strong> and can only be used once.</p>
  <p style="margin: 0 0 24px 0;">
    <a href="${resetUrl}" style="display: inline-block; background: #0a0a0a; color: #fafaf7; padding: 13px 22px; border-radius: 5px; text-decoration: none; font-size: 14px;">Choose a new password</a>
  </p>
  <p style="font-size: 13px; color: #6b6b66; margin: 0 0 14px 0;">Or copy and paste this URL into your browser:<br><a href="${resetUrl}" style="color: #6b6b66; word-break: break-all;">${resetUrl}</a></p>
  <p style="font-size: 13px; color: #6b6b66; margin: 22px 0 0 0;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
</body></html>`;

  return { html, text };
}

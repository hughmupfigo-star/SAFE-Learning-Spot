/* ============================================================================
   Safe Learning Spot — email sender (pluggable)
   ----------------------------------------------------------------------------
   One place to plug in your transactional-email provider. Out of the box it
   supports Resend (https://resend.com) via a simple HTTP call — no extra npm
   packages needed (uses the built-in fetch in Node 18+).

   TO TURN ON REAL EMAILS, set these environment variables:
     RESEND_API_KEY = re_xxxxxxxx        (from your Resend dashboard)
     EMAIL_FROM     = Safe Spot <noreply@yourdomain>   (a verified sender)

   If no provider is configured, emails are written to the server log instead
   (so password reset still works for testing — you can copy the link from the
   logs). Swapping in SendGrid, Postmark, Mailgun, or SMTP is a small change to
   sendEmail() below.
   ========================================================================== */

export async function sendEmail(to, subject, html) {
  // ----- Provider: Resend (recommended, no dependencies) -----
  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Safe Spot <onboarding@resend.dev>',
        to: [to],
        subject,
        html
      })
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error('Email send failed (' + res.status + '): ' + detail);
    }
    return;
  }

  // ----- Fallback: no provider configured — log it so testing still works -----
  console.log('\n[email: no provider configured]'
    + '\n  To:      ' + to
    + '\n  Subject: ' + subject
    + '\n  Body:    ' + html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    + '\n  (Set RESEND_API_KEY + EMAIL_FROM to send real emails.)\n');
}

export async function sendResetEmail(to, link) {
  const html =
    '<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;line-height:1.6">'
    + '<p>You asked to reset your <strong>Safe Spot</strong> password.</p>'
    + '<p><a href="' + link + '" style="display:inline-block;padding:12px 22px;background:#0a0a0a;color:#fff;text-decoration:none;border-radius:4px">Choose a new password</a></p>'
    + '<p style="font-size:13px;color:#666">Or paste this link into your browser:<br>' + link + '</p>'
    + '<p style="font-size:13px;color:#666">This link expires in 1 hour. If you didn&rsquo;t request it, you can safely ignore this email.</p>'
    + '</div>';
  return sendEmail(to, 'Reset your Safe Spot password', html);
}

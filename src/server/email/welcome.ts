/** Email-client-friendly tables + inline styles. No scripts, external fonts, tracking pixels or tokens. */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function renderWelcomeEmail(input: { name?: string | null; appUrl: string }) {
  const base = new URL(input.appUrl);
  if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password) {
    throw new Error('Welcome email requires a public HTTP(S) APP_URL without embedded credentials.');
  }
  // Canonical server configuration only, never a browser-provided callback URL.
  const dashboard = new URL('/dashboard', base).href;
  const image = new URL('/email/arch-mark.png', base).href;
  const name = input.name?.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 100);
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  const body = [
    greeting, '', 'Welcome to ARCH.', 'Less noise. More clarity.', '',
    'Your account is ready. Open your workspace to create or join an organization, connect your services, and coordinate your first incident response.',
    '', `Open ARCH: ${dashboard}`, '',
    'You received this one-time welcome because this email address was used to create an ARCH account.',
    'This is not an email verification or password-reset message. If you did not sign up, you can ignore it.',
  ].join('\n');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Welcome to ARCH</title></head>
<body style="margin:0;padding:0;background:#f1f3f5;color:#18202c;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your ARCH account is ready. Less noise. More clarity.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f5;"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #dfe3e8;border-radius:16px;">
<tr><td style="padding:32px;background:#10141c;border-radius:16px 16px 0 0;">
<img src="${escapeHtml(image)}" alt="ARCH dragon logo" width="64" height="64" style="display:block;border:0;margin-bottom:20px;">
<p style="margin:0 0 12px;color:#a8b5ca;font-size:13px;letter-spacing:3px;">ARCH</p>
<h1 style="margin:0;color:#ffffff;font-size:32px;line-height:1.2;">Less noise.<br>More clarity.</h1>
</td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${escapeHtml(greeting)}</p>
<h2 style="margin:0 0 16px;font-size:24px;">Welcome to ARCH.</h2>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Your account is ready. Bring your alerts, context, and response decisions into one focused workspace.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#18202c" style="border-radius:8px;"><a href="${escapeHtml(dashboard)}" style="display:inline-block;padding:14px 24px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;">Open your workspace</a></td></tr></table>
<p style="margin:24px 0 8px;font-size:16px;font-weight:bold;">A good place to start</p>
<ol style="padding-left:22px;font-size:15px;line-height:1.8;"><li>Create or join your organization.</li><li>Add the services your team responds for.</li><li>Keep your first incident and response timeline in one place.</li></ol>
<p style="font-size:13px;line-height:1.6;color:#596579;">Button not working? Open <a href="${escapeHtml(dashboard)}" style="color:#18202c;word-break:break-all;">${escapeHtml(dashboard)}</a></p>
</td></tr>
<tr><td style="padding:24px 32px;border-top:1px solid #e7eaf0;color:#596579;font-size:12px;line-height:1.7;">You received this one-time welcome because this email address was used to create an ARCH account. This is not email verification or a password reset. If you did not sign up, you can ignore this message.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: 'Welcome to ARCH — less noise, more clarity', body, html };
}

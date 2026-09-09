// ─────────────────────────────────────────────────────────────────────────────
// lib/resend-client.js
// Resend API integration for Bitty Box transactional emails & delivery
// ─────────────────────────────────────────────────────────────────────────────

const RESEND_API_BASE = 'https://api.resend.com';
const DEFAULT_API_KEY = process.env.RESEND_API_KEY || '';
// Authentication identity is a trust boundary, not a deployment preference.
// Keep it fixed so a stale environment variable cannot silently change the sender.
const DEFAULT_FROM = 'Bitty Box Support <support@bittybox.org>';
const DEFAULT_REPLY_TO = 'support@bittybox.org';

/**
 * Send an email via Resend API
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email address or array of addresses
 * @param {string} options.subject - Subject line
 * @param {string} [options.html] - HTML body
 * @param {string} [options.text] - Plaintext body
 * @param {string} [options.from] - Sender email (defaults to support@bittybox.org)
 * @param {string|string[]} [options.replyTo] - Reply-To identity
 * @param {string} [options.apiKey] - Override API key
 * @returns {Promise<{ success: boolean, id?: string, error?: string }>}
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = DEFAULT_FROM,
  replyTo,
  apiKey = DEFAULT_API_KEY,
} = {}) {
  if (!to || !subject || (!html && !text)) {
    throw new Error('sendEmail requires "to", "subject", and either "html" or "text"');
  }

  if (!apiKey) {
    return {
      success: false,
      error: 'RESEND_API_KEY is not configured',
    };
  }

  const payload = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    ...(replyTo ? { reply_to: Array.isArray(replyTo) ? replyTo : [replyTo] } : {}),
    ...(html ? { html } : {}),
    ...(text ? { text } : {}),
  };

  try {
    const res = await fetch(`${RESEND_API_BASE}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        error: data.message || data.error || 'Failed to send email',
      };
    }

    return {
      success: true,
      id: data.id,
      from,
      to: payload.to,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * List verified sending domains from Resend
 */
export async function listDomains(apiKey = DEFAULT_API_KEY) {
  try {
    const res = await fetch(`${RESEND_API_BASE}/domains`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Check API key validity & account health
 */
export async function checkHealth(apiKey = DEFAULT_API_KEY) {
  try {
    const res = await fetch(`${RESEND_API_BASE}/api-keys`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const data = await res.json();
    return {
      connected: res.ok,
      status: res.status,
      keys: data.data || [],
    };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

/**
 * Send the canonical Bitty Box access-clearance email via Resend.
 */
export async function sendMagicLinkEmail({
  to,
  displayName = '',
  magicLink,
  apiKey = DEFAULT_API_KEY,
} = {}) {
  const recipientName = displayName || String(to || '').split('@')[0] || 'Builder';
  const escapedName = recipientName.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character] || character));
  const subject = 'Bitty Box access clearance';

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#0b0b0d;color:#f4f1ea;font-family:Arial,Helvetica,sans-serif">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden">Your Bitty Box access clearance expires in 15 minutes.</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0b0b0d;padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#151517;border:1px solid #39393d;border-radius:18px;overflow:hidden">
          <tr><td style="height:4px;background:#d8bb82"></td></tr>
          <tr><td style="padding:32px 32px 14px">
            <p style="margin:0;color:#d8bb82;font-size:12px;font-weight:700;letter-spacing:2px">BITTY BOX / AUTHENTICATION</p>
            <p style="display:inline-block;margin:22px 0 14px;padding:7px 10px;border:1px solid #675934;border-radius:999px;color:#f1d79e;background:#292517;font-size:11px;font-weight:700;letter-spacing:1.2px">ACCESS CLEARANCE</p>
            <h1 style="margin:0 0 14px;color:#ffffff;font-size:28px;line-height:1.15;font-weight:700">Your workspace is ready.</h1>
            <p style="margin:0;color:#c9c6bf;font-size:16px;line-height:1.55">Hello ${escapedName},</p>
            <p style="margin:14px 0 0;color:#c9c6bf;font-size:16px;line-height:1.55">You asked to enter Bitty Box. Use this one-time clearance to open your workspace.</p>
          </td></tr>
          <tr><td style="padding:16px 32px 30px">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-radius:10px;background:#d8bb82"><a href="${magicLink}" style="display:inline-block;padding:15px 22px;border-radius:10px;color:#17130a;font-size:14px;font-weight:700;letter-spacing:.4px;text-decoration:none">OPEN MY BITTY BOX</a></td></tr></table>
          </td></tr>
          <tr><td style="padding:0 32px 28px">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#202024;border:1px solid #39393d;border-radius:10px"><tr><td style="padding:15px 16px">
              <p style="margin:0 0 4px;color:#f1d79e;font-size:12px;font-weight:700;letter-spacing:.5px">EXPIRES IN 15 MINUTES</p>
              <p style="margin:0;color:#aaa7a0;font-size:13px;line-height:1.45">This link works once. Request another if it expires.</p>
            </td></tr></table>
          </td></tr>
          <tr><td style="padding:22px 32px;border-top:1px solid #39393d;background:#111113">
            <p style="margin:0 0 7px;color:#f4f1ea;font-size:13px;font-weight:700">Check the sender before you click.</p>
            <p style="margin:0;color:#aaa7a0;font-size:13px;line-height:1.5">Legitimate Bitty Box sign-in emails come from <a href="mailto:support@bittybox.org" style="color:#f1d79e;text-decoration:none">Bitty Box Support &lt;support@bittybox.org&gt;</a>. We will never ask for your password in this email.</p>
          </td></tr>
          <tr><td style="padding:18px 32px 28px;background:#111113">
            <p style="margin:0;color:#77746f;font-size:12px;line-height:1.5">If you did not request access, ignore this message. No action is needed.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `BITTY BOX / ACCESS CLEARANCE\n\nHello ${recipientName},\n\nYou asked to enter Bitty Box. Use this one-time clearance to open your workspace.\n\nOPEN MY BITTY BOX\n${magicLink}\n\nExpires in 15 minutes. This link works once.\n\nCHECK THE SENDER\nOnly trust sign-in links delivered from support@bittybox.org. Bitty Box will never ask for your password in this email.\n\nIf you did not request access, ignore this message. No action is needed.`;

  return sendEmail({
    to,
    subject,
    html,
    text,
    from: DEFAULT_FROM,
    replyTo: DEFAULT_REPLY_TO,
    apiKey,
  });
}

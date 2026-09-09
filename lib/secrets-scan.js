/**
 * secrets-scan.js — Pre-creation sensitive-value detection for Bitty Box.
 *
 * Bitty Box embeds the rendered payload into the URL fragment (a client-side
 * data: URI). For NON-password-protected links that payload is plaintext
 * base64 — anyone holding the link can read it. Even encrypted links carry the
 * ciphertext in the URL. This scanner surfaces credentials / secrets BEFORE a
 * link is created so a creator is warned (and, when sensitive + unencrypted,
 * must acknowledge) instead of accidentally leaking a live token.
 *
 * Design rules:
 *  - DETECTION ONLY. This module never mutates or blocks on its own; it returns
 *    structured findings. The caller decides what to do with them.
 *  - Warn-by-default: integration is non-destructive — links still create.
 *  - Samples are redacted (head/tail only) so we never echo a full secret back.
 */

// Each rule: { id, type, classification, re }
// classification: 'critical' | 'high' | 'medium'
//  - critical: direct credential material (private keys, live secret keys, DB creds)
//  - high:     tokens / API keys that grant access
//  - medium:   generic secret-looking assignments worth a second look
const RULES = [
  // ----- Critical: raw key material -----
  {
    id: 'rsa_private_key',
    type: 'Private Key (RSA/EC/OPENSSH/PGP)',
    classification: 'critical',
    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/,
  },
  {
    id: 'aws_secret_key',
    type: 'AWS Secret Access Key',
    classification: 'critical',
    // aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY (40 chars)
    re: /(?:aws_secret_access_key|aws_secret)\s*[:=]\s*['"]([A-Za-z0-9/+=]{40})['"]/i,
  },
  {
    id: 'db_connection_string',
    type: 'Database Connection String',
    classification: 'critical',
    // postgres://user:pass@host, mysql://user:pass@host, mongodb+srv://user:pass@host
    re: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp|mongodb)\:\/\/[^:\s\/]+:([^@\s\/]+)@/i,
  },
  {
    id: 'jwt',
    type: 'JSON Web Token (JWT)',
    classification: 'critical',
    // header.payload.signature — only flag if it looks signed (3 segments)
    re: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{8,}/,
  },

  // ----- High: live tokens / API keys -----
  {
    id: 'stripe_secret',
    type: 'Stripe Secret Key',
    classification: 'high',
    re: /\b(?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{16,}/,
  },
  {
    id: 'openai_key',
    type: 'OpenAI API Key',
    classification: 'high',
    re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/,
  },
  {
    id: 'aws_access_key',
    type: 'AWS Access Key ID',
    classification: 'high',
    re: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    id: 'google_api_key',
    type: 'Google API Key',
    classification: 'high',
    re: /\bAIza[0-9A-Za-z_\-]{35}\b/,
  },
  {
    id: 'github_token',
    type: 'GitHub Personal Access Token',
    classification: 'high',
    re: /\b(?:ghp|gho|ghu|ghs|ghr)_[0-9A-Za-z]{36}\b|\bgithub_pat_[0-9A-Za-z_]{40,}\b/,
  },
  {
    id: 'slack_token',
    type: 'Slack Token',
    classification: 'high',
    re: /\bxox[baprs]-[0-9A-Za-z-]{10,}/,
  },
  {
    id: 'sendgrid_key',
    type: 'SendGrid API Key',
    classification: 'high',
    re: /\bSG\.[A-Za-z0-9_\-]{16,}\.[A-Za-z0-9_\-]{16,}/,
  },
  {
    id: 'twilio_sid',
    type: 'Twilio Account SID',
    classification: 'high',
    re: /\bAC[0-9a-fA-F]{32}\b/,
  },
  {
    id: 'npm_token',
    type: 'npm Token',
    classification: 'high',
    re: /\bnpm_[0-9A-Za-z]{36}\b/,
  },
  {
    id: 'cloudflare_global_key',
    type: 'Cloudflare Global API Key',
    classification: 'high',
    re: /\b(?:cloudflare|cf)[_\-]?(?:api[_\-]?key|global[_\-]?api[_\-]?key)['"\s:=]+[A-Za-z0-9]{32,}/i,
  },
  {
    id: 'bearer_token',
    type: 'Bearer Authorization Token',
    classification: 'high',
    re: /\bBearer\s+[A-Za-z0-9_\-\.=]{16,}/,
  },

  // ----- Medium: generic secret-looking assignments -----
  {
    id: 'generic_secret_assignment',
    type: 'Possible Secret Assignment',
    classification: 'medium',
    // key = "value" where key looks like secret/token/password/key and value >= 12 chars
    re: /\b(?:api[_-]?key|apikey|secret|token|access[_-]?token|client[_-]?secret|passwd|password|private[_-]?key)\b\s*[:=]\s*['"]([A-Za-z0-9_\-.\/+=]{12,64})['"]/i,
  },
];

/**
 * Redact a captured secret string to head/tail so we never echo the whole value.
 */
function redact(sample, headLen = 4, tailLen = 4) {
  if (!sample) return '';
  const s = String(sample);
  if (s.length <= headLen + tailLen + 1) return '••••';
  return s.slice(0, headLen) + '••••' + s.slice(-tailLen);
}

/**
 * Count line number of the first match offset within the content.
 */
function lineOf(content, index) {
  if (index < 0) return 1;
  const before = content.slice(0, index);
  return before.split('\n').length;
}

/**
 * Scan a payload for sensitive values.
 *
 * @param {string} content  Raw content being turned into a Bitty link.
 * @param {object} [opts]
 * @param {boolean} [opts.encrypted]  Whether the link will be password-encrypted.
 *        When true, the payload is AES-GCM protected in the URL, so the warning
 *        is downgraded (still surfaced, but does not force acknowledgment).
 * @returns {{
 *   found: boolean,
 *   requiresOverride: boolean,
 *   matches: Array<{type:string, classification:string, sample:string, line:number}>
 * }}
 */
export function scanForSecrets(content, opts = {}) {
  const text = typeof content === 'string' ? content : String(content ?? '');
  const encrypted = !!opts.encrypted;

  const matches = [];
  const seenTypes = new Set();

  for (const rule of RULES) {
    // Clone with a global flag so distinct matches advance lastIndex correctly.
    const re = new RegExp(rule.re.source, rule.re.flags.includes('g') ? rule.re.flags : rule.re.flags + 'g');
    re.lastIndex = 0;
    let m;
    // Limit to first 5 hits per rule to bound work on huge inputs.
    let hits = 0;
    while ((m = re.exec(text)) !== null && hits < 5) {
      hits++;
      const captured = m[1] || m[0];
      const sample = redact(captured);
      matches.push({
        type: rule.type,
        classification: rule.classification,
        sample,
        line: lineOf(text, m.index),
      });
      seenTypes.add(rule.id);
      if (m.index === re.lastIndex) re.lastIndex++; // avoid zero-width loop
    }
  }

  const found = matches.length > 0;
  // Force acknowledgment only for serious findings on an UNENCRYPTED link.
  const serious = matches.some(
    (x) => x.classification === 'critical' || x.classification === 'high'
  );
  const requiresOverride = found && serious && !encrypted;

  return { found, requiresOverride, matches };
}

export default scanForSecrets;

/**
 * bittyCrypto.ts — Zero-knowledge, fully client-side Password Lock for Bitty Box.
 *
 * Threat model this module fixes vs. the legacy SHA-256 path in bittyEngine.ts:
 *   - Legacy: key = SHA-256(password)  →  deterministic, no salt, 1 iteration.
 *             Two problems: (1) identical passwords always yield identical keys,
 *             (2) a GPU can brute-force billions of candidate passwords per second.
 *   - This module: key = PBKDF2(SHA-256, random 16-byte salt, 310,000 iterations)
 *             → per-box random salt defeats precomputation; 310k iterations makes
 *             offline brute-force ~310,000x slower than the legacy path.
 *
 * Encryption: AES-GCM, 256-bit key, random 96-bit IV per encryption.
 * Envelope (bytes): [version:1][salt:16][iv:12][ciphertext:*]
 *   - salt + iv are stored alongside the ciphertext in the URL fragment, exactly
 *     as the Password Lock spec requires ("Store the IV and salt in the URL
 *     fragment alongside the ciphertext").
 *   - Nothing sensitive ever leaves the browser. The password is only fed into
 *     PBKDF2 locally; it is never transmitted or embedded in the URL.
 *
 * Wrong password: AES-GCM authentication fails → decrypt throws OperationError.
 * No plaintext, no key material, no partial content leaks. No timing oracle is
 * introduced by this code (the cost is dominated by the constant 310k PBKDF2
 * work; the GCM tag check is the only branch and it runs on fixed-size auth data).
 */

const PBKDF2_ITERATIONS = 310_000; // OWASP 2024 floor for PBKDF2-HMAC-SHA-256
const SALT_BYTES = 16; // 128-bit salt
const IV_BYTES = 12; // 96-bit nonce — AES-GCM recommended size
const KEY_BITS = 256;
const ENVELOPE_VERSION = 1;

function subtle(): SubtleCrypto {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c || !c.subtle) {
    throw new Error('Web Crypto API (crypto.subtle) is unavailable in this environment');
  }
  return c.subtle;
}

function randomBytes(n: number): Uint8Array {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c || !c.getRandomValues) throw new Error('crypto.getRandomValues unavailable');
  return c.getRandomValues(new Uint8Array(n));
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(slice) as number[]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(str: string): Uint8Array {
  let s = str.trim().replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4 !== 0) s += '=';
  const binary = atob(s);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await subtle().importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: KEY_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext string under a password.
 * Returns a base64url envelope safe to drop into a URL fragment.
 */
export async function encryptBox(plaintext: string, password: string): Promise<string> {
  return encryptBoxBytes(new TextEncoder().encode(plaintext), password);
}

export async function encryptBoxBytes(plaintext: Uint8Array, password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = await deriveKey(password, salt);
  const ctBuf = await subtle().encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );
  const ct = new Uint8Array(ctBuf);
  const out = new Uint8Array(1 + SALT_BYTES + IV_BYTES + ct.length);
  out[0] = ENVELOPE_VERSION;
  out.set(salt, 1);
  out.set(iv, 1 + SALT_BYTES);
  out.set(ct, 1 + SALT_BYTES + IV_BYTES);
  return bytesToBase64Url(out);
}

export class WrongPasswordError extends Error {
  constructor() {
    super('Incorrect password. Try again.');
    this.name = 'WrongPasswordError';
  }
}

/**
 * Decrypt a base64url envelope produced by encryptBox.
 * Throws WrongPasswordError on authentication failure (wrong password or tampered data).
 */
export async function decryptBox(envelope: string, password: string): Promise<string> {
  let buf: Uint8Array;
  try {
    buf = base64UrlToBytes(envelope);
  } catch {
    throw new WrongPasswordError();
  }
  if (buf.length < 1 + SALT_BYTES + IV_BYTES) throw new WrongPasswordError();

  const version = buf[0];
  if (version !== ENVELOPE_VERSION) {
    throw new Error(`Unsupported envelope version: ${version}`);
  }

  const salt = buf.subarray(1, 1 + SALT_BYTES);
  const iv = buf.subarray(1 + SALT_BYTES, 1 + SALT_BYTES + IV_BYTES);
  const ct = buf.subarray(1 + SALT_BYTES + IV_BYTES);

  // Fail closed: a well-formed AES-GCM envelope must carry at least the
  // 16-byte authentication tag. An envelope with zero ciphertext would
  // otherwise decrypt to an empty string and silently "succeed" without
  // raising WrongPasswordError. Reject structurally invalid envelopes.
  if (ct.length < 16) throw new WrongPasswordError();

  const key = await deriveKey(password, salt);
  try {
    const plainBuf = await subtle().decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(plainBuf);
  } catch {
    // AES-GCM auth tag mismatch → wrong password or corrupted ciphertext.
    throw new WrongPasswordError();
  }
}

/**
 * Convenience: wrap an envelope into the URL fragment form used by Bitty Box
 * Password Lock links (e.g. "#box=<envelope>").
 */
export function envelopeToFragment(envelope: string, paramName = 'box'): string {
  return `#${paramName}=${envelope}`;
}

/**
 * Parse the envelope out of a Password Lock URL fragment.
 */
export function fragmentToEnvelope(fragment: string, paramName = 'box'): string | null {
  const hash = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  const prefix = `${paramName}=`;
  if (hash.startsWith(prefix)) return hash.slice(prefix.length);
  // Fallback: query-style within hash
  const params = new URLSearchParams(hash);
  return params.get(paramName);
}

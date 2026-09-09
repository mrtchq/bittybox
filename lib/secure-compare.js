import crypto from 'crypto';

/**
 * Constant-time equality for credential comparisons (API keys, session
 * tokens, any secret-equivalent value).
 *
 * Plain `===` / object-key lookups short-circuit on the first differing byte,
 * leaking a timing oracle an attacker can exploit to recover secrets byte by
 * byte. crypto.timingSafeEqual removes that leak.
 *
 * Buffers are padded to equal length before comparison so a length mismatch
 * does not itself leak which side was longer.
 *
 * @param {string|Buffer} a
 * @param {string|Buffer} b
 * @returns {boolean}
 */
export function constantTimeEqual(a, b) {
  const bufA = Buffer.isBuffer(a) ? a : Buffer.from(String(a), 'utf8');
  const bufB = Buffer.isBuffer(b) ? b : Buffer.from(String(b), 'utf8');

  const len = Math.max(bufA.length, bufB.length);
  const paddedA = Buffer.alloc(len);
  const paddedB = Buffer.alloc(len);
  bufA.copy(paddedA);
  bufB.copy(paddedB);

  return crypto.timingSafeEqual(paddedA, paddedB);
}

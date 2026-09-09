// ─────────────────────────────────────────────────────────────────────────────
// lib/chain.js
// Box Chaining URL helpers for Bitty Box.
//
// Parity with the frontend chain codec in src/utils/bittyEngine.ts:
//   - encodeChainUrl: raw-deflate (level 9) + url-safe base64 (no padding)
//   - decodeChainUrl: inverse
//   - attachChainMeta: appends `/ch/{chainId}~{index}~{total}` and, when a
//     nextUrl exists, `/nx/{encodedNextUrl}` to the bitty link hash, exactly
//     like metadata.chain serialization on the client.
//
// Chains are generated TAIL-FIRST: the last box has nextUrl=null; each earlier
// box's nextUrl is the (already chain-tagged) URL of the box after it. Opening
// box[0] walks forward to box[n-1].
// ─────────────────────────────────────────────────────────────────────────────

import zlib from 'zlib';

/**
 * Encode a full URL into a compact, URL-safe string.
 * Mirrors frontend encodeChainUrl (pako raw deflate + standard base64).
 */
export function encodeChainUrl(url) {
  if (!url) return '';
  const compressed = zlib.deflateRawSync(Buffer.from(String(url), 'utf-8'), { level: 9 });
  return compressed
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Decode a string produced by encodeChainUrl back into the original URL.
 */
export function decodeChainUrl(encoded) {
  if (!encoded) return '';
  let s = String(encoded).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return zlib.inflateRawSync(Buffer.from(s, 'base64')).toString('utf-8');
}

/**
 * Append chain metadata segments to a Bitty Link URL's hash.
 * Returns the same URL unchanged if it has no '#' anchor or no chainId.
 */
export function attachChainMeta(bittyUrl, { chainId, index, total, nextUrl } = {}) {
  if (!bittyUrl || !chainId) return bittyUrl || '';
  const hashIdx = bittyUrl.indexOf('#');
  if (hashIdx === -1) return bittyUrl;
  const head = bittyUrl.slice(0, hashIdx);
  const hash = bittyUrl.slice(hashIdx + 1);
  const chSeg = `/ch/${encodeURIComponent(`${chainId}~${index}~${total}`)}`;
  const nxSeg = nextUrl ? `/nx/${encodeChainUrl(nextUrl)}` : '';
  return `${head}#${hash}${chSeg}${nxSeg}`;
}

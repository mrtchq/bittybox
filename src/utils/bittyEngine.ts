import { deflate, inflate } from 'pako';
import { marked } from 'marked';
import { BittyMetadata } from '../types';
import { decryptBox, encryptBoxBytes, bytesToBase64Url, base64UrlToBytes } from './bittyCrypto';
import { TimeLockMode } from './timeWindow';

export const GZIP_MARKER = 'gz';
export const BASE64_MARKER = 'base64';
export const LZMA_MARKER = 'xz';

export function encodePrettyComponent(s: string): string {
  if (!s) return '';
  const replacements: Record<string, string> = { ' - ': '---', '-': '--', ' ': '-' };
  const re = new RegExp('(' + Object.keys(replacements).map(k => k.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')).join('|') + ')', 'g');
  return encodeURIComponent(s.replace(re, e => replacements[e] ?? '-'))
    .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16));
}

export function decodePrettyComponent(s: string): string {
  if (!s) return '';
  const replacements: Record<string, string> = { '---': ' - ', '--': '-', '-': ' ' };
  try {
    return decodeURIComponent(s.replace(/-+/g, e => replacements[e] ?? '-'));
  } catch {
    return s;
  }
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const CHUNK_SIZE = 8192;
  for (let i = 0; i < len; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  // Normalize padded or unpadded base64 and URL encoding
  let str = base64.trim();
  try {
    str = decodeURIComponent(str);
  } catch {}
  
  str = str
    .replace(/\s+/g, '+')
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  while (str.length % 4 !== 0) {
    str += '=';
  }

  const binary = atob(str);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function encodeChainUrl(url: string): string {
  if (!url) return '';
  const bytes = new TextEncoder().encode(url);
  const compressed = deflate(bytes, { level: 9 });
  return uint8ArrayToBase64(compressed)
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function decodeChainUrl(encoded: string): string {
  if (!encoded) return '';
  const compressed = base64ToUint8Array(encoded);
  const inflated = inflate(compressed);
  return new TextDecoder().decode(inflated);
}

export async function subtleEncryptData(data: Uint8Array, pass: string): Promise<Uint8Array> {
  const pwUtf8 = new TextEncoder().encode(pass);
  const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', pwHash, { name: 'AES-GCM' }, false, ['encrypt']);
  const ctBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  
  const result = new Uint8Array(iv.byteLength + ctBuffer.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ctBuffer), iv.byteLength);
  return result;
}

export async function subtleDecryptData(data: Uint8Array, pass: string): Promise<Uint8Array> {
  const pwUtf8 = new TextEncoder().encode(pass);
  const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);
  const iv = data.slice(0, 12);
  const ct = data.slice(12);
  const key = await crypto.subtle.importKey('raw', pwHash, { name: 'AES-GCM' }, false, ['decrypt']);
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new Uint8Array(plainBuffer);
}

export function compressContentSync(
  content: string,
  options?: {
    password?: string;
    mimeType?: string;
    render?: string;
    isRawHtml?: boolean;
  }
): { compressedUrl: string; originalBytes: number; compressedBytes: number } | null {
  if (options?.password && options.password.trim().length > 0) {
    return null;
  }
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(content);
  const originalBytes = rawBytes.byteLength;

  const deflated = deflate(rawBytes, { level: 9 });
  const b64Data = uint8ArrayToBase64(deflated).replace(/=+$/, '');
  const compressedBytes = b64Data.length;

  let url = '';
  const mime = options?.mimeType || 'text/html';

  if (options?.render) {
    url = `data:${mime};render=${options.render};format=gz;base64,${b64Data}`;
  } else if (options?.isRawHtml) {
    url = `data:${mime};charset=utf-8;format=gz;base64,${b64Data}`;
  } else {
    // Standard short bitty box fragment
    url = `?${b64Data}`;
  }

  return {
    compressedUrl: url,
    originalBytes,
    compressedBytes,
  };
}

export async function compressContent(
  content: string,
  options?: {
    password?: string;
    mimeType?: string;
    render?: string;
    isRawHtml?: boolean;
    zk?: boolean;
  }
): Promise<{ compressedUrl: string; originalBytes: number; compressedBytes: number }> {
  const syncRes = compressContentSync(content, options);
  if (syncRes) {
    return syncRes;
  }

  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(content);
  const originalBytes = rawBytes.byteLength;

  const deflated = deflate(rawBytes, { level: 9 });

  // Zero-Knowledge mode: PBKDF2(310k) + AES-256-GCM via bittyCrypto envelope.
  // The envelope is [v1][salt16][iv12][ct] base64url — self-contained in the
  // URL fragment; decompressBittyData detects the version-1 header on read.
  // The password never leaves the browser and never enters the URL.
  if (options?.zk === true && options?.password) {
    const envelope = await encryptBoxBytes(deflated, options.password.trim());
    const b64Data = envelope;
    const compressedBytes = b64Data.length;
    const mime = options?.mimeType || 'text/html';
    const url = `data:${mime};charset=utf-8;cipher=zk-aes256gcm-pbkdf2;base64url,${b64Data}`;
    return { compressedUrl: url, originalBytes, compressedBytes };
  }

  const encryptedBytes = await subtleEncryptData(deflated, options!.password!.trim());
  const b64Data = uint8ArrayToBase64(encryptedBytes).replace(/=+$/, '');
  const compressedBytes = b64Data.length;

  const mime = options?.mimeType || 'text/html';
  const url = `data:${mime};charset=utf-8;cipher=aes-gcm;format=gz;base64,${b64Data}`;

  return {
    compressedUrl: url,
    originalBytes,
    compressedBytes,
  };
}

export function parseBittyHash(hash: string): {
  payload: string;
  metadata: Partial<BittyMetadata>;
} {
  let cleanHash = hash || '';
  if (cleanHash.startsWith('#')) cleanHash = cleanHash.substring(1);
  if (cleanHash.startsWith('/')) cleanHash = cleanHash.substring(1);

  // Ignore internal app routes & auth tokens
  if (
    cleanHash.startsWith('auth') ||
    cleanHash.startsWith('studio') ||
    cleanHash.startsWith('account') ||
    cleanHash.startsWith('edit') ||
    cleanHash.includes('token=')
  ) {
    return { payload: '', metadata: {} };
  }

  // If the whole cleanHash is directly a data: URI or starts with ?
  if (cleanHash.startsWith('data:') || cleanHash.startsWith('?')) {
    return { payload: cleanHash, metadata: {} };
  }

  // If the cleanHash contains /data: or /? anywhere, split cleanly at the payload boundary
  const dataIdx = cleanHash.indexOf('/data:');
  const qIdx = cleanHash.indexOf('/?');
  let metaSection = cleanHash;
  let directPayload = '';

  if (dataIdx !== -1) {
    metaSection = cleanHash.substring(0, dataIdx);
    directPayload = cleanHash.substring(dataIdx + 1);
  } else if (qIdx !== -1) {
    metaSection = cleanHash.substring(0, qIdx);
    directPayload = cleanHash.substring(qIdx + 1);
  }

  const parts = metaSection ? metaSection.split('/') : [];
  const metadata: Partial<BittyMetadata> = {};
  const metadataTokens = ['d', 'f', 'i', 'tw', 'ol', 'box', 'ch', 'nx'];
  let payload = directPayload;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!payload && (part.startsWith('?') || part.startsWith('data:') || (part.length > 25 && !metadata.title && i === parts.length - 1))) {
      payload = parts.slice(i).join('/');
      break;
    }
    if (i === 0 && !metadataTokens.includes(part)) {
      metadata.title = decodePrettyComponent(part);
    } else if (part === 'd' && parts[i + 1]) {
      metadata.description = decodePrettyComponent(parts[i + 1]);
      i++;
    } else if (part === 'f' && parts[i + 1]) {
      metadata.favicon = decodeURIComponent(parts[i + 1]);
      i++;
    } else if (part === 'i' && parts[i + 1]) {
      try {
        metadata.image = atob(decodeURIComponent(parts[i + 1]));
      } catch {}
      i++;
    } else if (part === 'tw' && parts[i + 1]) {
      try {
        const rawTw = decodeURIComponent(parts[i + 1]);
        const [nb, na, sc] = rawTw.split('~');
        const modePart = (rawTw.split('~')[3] as TimeLockMode) || undefined;
        metadata.lockConfig = {
          ...(metadata.lockConfig || {}),
          timeWindow: {
            enabled: true,
            mode: modePart,
            notBefore: nb && nb !== '_' ? nb : null,
            notAfter: na && na !== '_' ? na : null,
            showCountdown: sc !== '0',
          },
        };
      } catch {}
      i++;
    } else if (part === 'ol' && parts[i + 1]) {
      try {
        const rawOl = decodeURIComponent(parts[i + 1]);
        const [max, src] = rawOl.split('~');
        metadata.lockConfig = {
          ...(metadata.lockConfig || {}),
          openLimit: {
            enabled: true,
            maxOpens: Number(max) || 1,
            opensUsed: 0,
            showRemainingCount: src !== '0',
          },
        };
      } catch {}
      i++;
    } else if (part === 'box' && parts[i + 1]) {
      metadata.boxId = decodeURIComponent(parts[i + 1]);
      i++;
    } else if (part === 'ch' && parts[i + 1]) {
      try {
        const rawChain = decodeURIComponent(parts[i + 1]);
        const [chainId, indexRaw, totalRaw] = rawChain.split('~');
        metadata.chain = {
          ...(metadata.chain || {}),
          enabled: true,
          chainId: chainId || undefined,
          index: Number.isFinite(Number(indexRaw)) ? Number(indexRaw) : undefined,
          total: Number.isFinite(Number(totalRaw)) ? Number(totalRaw) : undefined,
        };
      } catch {}
      i++;
    } else if (part === 'nx' && parts[i + 1]) {
      try {
        const decodedNextUrl = decodeChainUrl(parts[i + 1]);
        metadata.chain = {
          ...(metadata.chain || {}),
          enabled: true,
          nextUrl: decodedNextUrl || undefined,
        };
      } catch {}
      i++;
    }
  }

  if (!payload && parts.length > 0 && !metadata.title) {
    payload = parts[parts.length - 1];
  }

  return { payload, metadata };
}

export async function decompressBittyData(
  fragment: string,
  passwordAttempt?: string
): Promise<{
  content: string;
  mimeType: string;
  isEncrypted: boolean;
  needsPassword?: boolean;
  render?: string;
  error?: string;
}> {
  try {
    if (!fragment || !fragment.trim()) {
      return { content: '', mimeType: 'text/html', isEncrypted: false };
    }

    const { payload } = parseBittyHash(fragment);
    let cleanFragment = payload || fragment;

    if (cleanFragment.startsWith('#')) cleanFragment = cleanFragment.substring(1);

    let isEncrypted = false;
    let mimeType = 'text/html';
    let render = '';
    let isGzip = true;
    let b64Payload = '';

    if (cleanFragment.startsWith('?')) {
      // Short format ?<gzipBase64>
      b64Payload = cleanFragment.substring(1);
    } else if (cleanFragment.startsWith('data:')) {
      const commaIdx = cleanFragment.indexOf(',');
      if (commaIdx === -1) throw new Error('Invalid data URI format');
      
      const metaPart = cleanFragment.substring(5, commaIdx);
      b64Payload = cleanFragment.substring(commaIdx + 1);

      if (metaPart.includes('cipher=aes')) {
        isEncrypted = true;
      }
      if (metaPart.includes('format=gz') || metaPart.includes('gzip')) {
        isGzip = true;
      }
      const renderMatch = metaPart.match(/render=([^;]+)/);
      if (renderMatch) render = renderMatch[1];

      const mimeMatch = metaPart.match(/^([^;]+)/);
      if (mimeMatch && mimeMatch[1]) mimeType = mimeMatch[1];
    } else {
      b64Payload = cleanFragment;
    }

    if (!b64Payload || !b64Payload.trim()) {
      return { content: '', mimeType: 'text/html', isEncrypted: false };
    }

    const compressedBytes = base64ToUint8Array(b64Payload);

    if (isEncrypted) {
      if (!passwordAttempt) {
        return {
          content: '',
          mimeType,
          isEncrypted: true,
          needsPassword: true,
          render,
        };
      }

      // Try decrypting with passcode (support both trimmed and exact passcode)
      try {
        let decryptedBytes: Uint8Array | null = null;

        // Path 1: Deflate-then-Encrypt (standard format: payload is encrypted deflated stream)
        try {
          decryptedBytes = await subtleDecryptData(compressedBytes, passwordAttempt.trim());
        } catch {
          if (passwordAttempt !== passwordAttempt.trim()) {
            try {
              decryptedBytes = await subtleDecryptData(compressedBytes, passwordAttempt);
            } catch {}
          }
        }

        // Path 2: Encrypt-then-Deflate fallback (if payload was deflated after encrypting)
        if (!decryptedBytes) {
          try {
            let inflatedCipher: Uint8Array | null = null;
            try {
              inflatedCipher = inflate(compressedBytes);
            } catch {
              try {
                inflatedCipher = inflate(compressedBytes, { raw: true });
              } catch {}
            }
            if (inflatedCipher) {
              try {
                decryptedBytes = await subtleDecryptData(inflatedCipher, passwordAttempt.trim());
              } catch {
                if (passwordAttempt !== passwordAttempt.trim()) {
                  try {
                    decryptedBytes = await subtleDecryptData(inflatedCipher, passwordAttempt);
                  } catch {}
                }
              }
            }
          } catch {}
        }

        // Path 3: PBKDF2 envelope fallback (bittyCrypto encryptBox format)
        if (!decryptedBytes) {
          try {
            const decryptedString = await decryptBox(b64Payload, passwordAttempt.trim());
            if (decryptedString) {
              return {
                content: decryptedString,
                mimeType,
                isEncrypted: true,
                needsPassword: false,
                render,
              };
            }
          } catch {
            if (passwordAttempt !== passwordAttempt.trim()) {
              try {
                const decryptedString = await decryptBox(b64Payload, passwordAttempt);
                if (decryptedString) {
                  return {
                    content: decryptedString,
                    mimeType,
                    isEncrypted: true,
                    needsPassword: false,
                    render,
                  };
                }
              } catch {}
            }
          }
        }

        if (!decryptedBytes) {
          throw new Error('Authentication failed');
        }

        // Decompress the decrypted bytes (if compressed with deflate)
        let inflated: Uint8Array;
        try {
          inflated = inflate(decryptedBytes);
        } catch {
          try {
            inflated = inflate(decryptedBytes, { raw: true });
          } catch {
            // Uncompressed raw bytes fallback
            inflated = decryptedBytes;
          }
        }

        const text = new TextDecoder().decode(inflated);
        return {
          content: text,
          mimeType,
          isEncrypted: true,
          needsPassword: false,
          render,
        };
      } catch {
        return {
          content: '',
          mimeType,
          isEncrypted: true,
          needsPassword: true,
          error: 'Decryption failed: incorrect passcode.',
        };
      }
    }

    // Normal decompression with multi-format fallback
    let decompressedBytes: Uint8Array;
    if (isGzip) {
      try {
        decompressedBytes = inflate(compressedBytes);
      } catch {
        try {
          decompressedBytes = inflate(compressedBytes, { raw: true });
        } catch {
          // Fallback: may be uncompressed raw bytes
          decompressedBytes = compressedBytes;
        }
      }
    } else {
      decompressedBytes = compressedBytes;
    }

    const text = new TextDecoder().decode(decompressedBytes);
    return {
      content: text,
      mimeType,
      isEncrypted: false,
      render,
    };
  } catch (err: any) {
    return {
      content: '',
      mimeType: 'text/html',
      isEncrypted: false,
      error: err?.message || 'Failed to decode Bitty Box data fragment.',
    };
  }
}

export function buildBittyUrl(
  compressedFragment: string,
  metadata: BittyMetadata,
  origin: string = typeof window !== 'undefined' ? window.location.origin : ''
): string {
  const title = metadata.title?.trim() || 'Untitled';
  const cleanFragment = compressedFragment.startsWith('#') ? compressedFragment.substring(1) : compressedFragment;

  // Build metadata path components inside hash to preserve single-page app routing on any host
  let metaHash = encodePrettyComponent(title);
  if (metadata.description) {
    metaHash += `/d/${encodePrettyComponent(metadata.description.substring(0, 100))}`;
  }
  if (metadata.favicon) {
    metaHash += `/f/${encodeURIComponent(metadata.favicon)}`;
  }
  if (metadata.image) {
    try {
      metaHash += `/i/${encodeURIComponent(btoa(metadata.image).replace(/=/g, ''))}`;
    } catch {}
  }
  if (metadata.boxId) {
    metaHash += `/box/${encodeURIComponent(metadata.boxId)}`;
  }
  if (metadata.chain?.enabled) {
    const chainId = metadata.chain.chainId || `bbc_${Date.now().toString(36)}`;
    const chainIndex = Math.max(0, Number(metadata.chain.index ?? 0));
    const chainTotal = Math.max(1, Number(metadata.chain.total ?? 1));
    metaHash += `/ch/${encodeURIComponent(`${chainId}~${chainIndex}~${chainTotal}`)}`;
    if (metadata.chain.nextUrl) {
      metaHash += `/nx/${encodeChainUrl(metadata.chain.nextUrl)}`;
    }
  }
  if (metadata.lockConfig?.timeWindow?.enabled) {
    const tw = metadata.lockConfig.timeWindow;
    const nb = tw.notBefore ? encodeURIComponent(tw.notBefore) : '_';
    const na = tw.notAfter ? encodeURIComponent(tw.notAfter) : '_';
    const sc = tw.showCountdown === false ? '0' : '1';
    const mode = tw.mode ? `~${tw.mode}` : '';
    metaHash += `/tw/${nb}~${na}~${sc}${mode}`;
  }
  if (metadata.lockConfig?.openLimit?.enabled) {
    const ol = metadata.lockConfig.openLimit;
    const max = ol.maxOpens || 1;
    const src = ol.showRemainingCount === false ? '0' : '1';
    metaHash += `/ol/${max}~${src}`;
  }

  const finalPayload = (cleanFragment.startsWith('?') || cleanFragment.startsWith('data:'))
    ? cleanFragment
    : `?${cleanFragment}`;

  return `${origin}/#/${metaHash}/${finalPayload}`;
}

export async function hashString(str: string): Promise<string> {
  const arrayBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

export function getRenderedHtml(content: string, metadata?: Partial<BittyMetadata>): string {
  if (!content || !content.trim()) {
    return '';
  }
  const trimmed = content.trim();
  if (
    trimmed.toLowerCase().includes('<html') ||
    trimmed.toLowerCase().includes('<!doctype')
  ) {
    return content;
  }
  const lang = metadata?.language || 'en';
  const title = metadata?.title || 'Untitled';
  const description = metadata?.description || '';
  const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const descriptionTag = description ? `<meta name="description" content="${escapeAttr(description)}">` : '';

  if (trimmed.startsWith('<svg') && trimmed.endsWith('</svg>')) {
    return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title>${descriptionTag}<style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#050515;}</style></head><body>${content}</body></html>`;
  }

  const hasHtmlTags = /<\/?(div|p|h[1-6]|span|button|form|input|table|section|article|header|footer|nav|ul|ol|li|img|video|audio|canvas|script|style|a|br|hr|pre|code|b|i|strong|em)[^>]*>/i.test(trimmed);

  let bodyHtml = content;
  if (!hasHtmlTags) {
    try {
      bodyHtml = marked.parse(content, { async: false }) as string;
    } catch {
      bodyHtml = `<pre style="white-space:pre-wrap;font-family:monospace;word-break:break-word;">${escapeAttr(content)}</pre>`;
    }
  }

  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title>${descriptionTag}<style>body{margin:0 auto;padding:1.5rem;max-width:48em;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.6;color:#1e293b;background:#ffffff;}@media(prefers-color-scheme:dark){body{color:#f1f5f9;background:#0f172a;}}img{max-width:100%;height:auto;}pre{background:#f1f5f9;padding:1rem;border-radius:8px;overflow-x:auto;}code{font-family:monospace;}</style></head><body>${bodyHtml}</body></html>`;
}


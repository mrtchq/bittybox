import zlib from 'zlib';
import crypto from 'crypto';
import { renderMarkdownToHtml } from './templates/markdown-template.js';
import { renderCodeToHtml } from './templates/code-template.js';
import { renderJsonToHtml } from './templates/json-template.js';
import { renderSvgToHtml } from './templates/svg-template.js';
import { renderCanvasToHtml } from './templates/canvas-template.js';
import { renderRecipeToHtml } from './templates/recipe-template.js';
import { scanForSecrets } from './secrets-scan.js';

export const DEFAULT_DOMAIN = process.env.BITTYBOX_PUBLIC_ORIGIN || 'https://bittybox.org';

/**
 * Encode space/dash combinations to avoid %20 in URLs (compatible with bitty.js)
 */
export function encodePrettyComponent(s) {
  if (!s) return '';
  const replacements = { ' - ': '---', '-': '--', ' ': '-' };
  const re = new RegExp('(' + Object.keys(replacements).map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|') + ')', 'g');
  return encodeURIComponent(s.replace(re, e => replacements[e] ?? '-'))
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16));
}

/**
 * Decode space/dash combinations (compatible with bitty.js)
 */
export function decodePrettyComponent(s) {
  if (!s) return '';
  const replacements = { '---': ' - ', '--': '-', '-': ' ' };
  return decodeURIComponent(s.replace(/-+/g, e => replacements[e] ?? '-'));
}

/**
 * Detect format of the given content
 */
export function detectFormat(content, hint = '') {
  if (hint && hint !== 'auto') return hint.toLowerCase();

  const trimmed = content.trim();

  if (/^<svg[\s>]/i.test(trimmed) || (trimmed.startsWith('<?xml') && trimmed.includes('<svg'))) {
    return 'svg';
  }

  if (/^<!DOCTYPE\s+html|<html[\s>]|<div|<head|<body/i.test(trimmed)) {
    return 'html';
  }

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && (parsed['@context'] || parsed.recipeIngredient || parsed.recipeInstructions)) {
        return 'recipe';
      }
      return 'json';
    } catch {
      // not valid json
    }
  }

  // Markdown indicators
  const mdPatterns = [
    /^#{1,6}\s+\S+/m,
    /^\s*[-*+]\s+\S+/m,
    /^\s*\d+\.\s+\S+/m,
    /```[\s\S]*?```/,
    /\[.+?\]\(.+?\)/,
    /^\s*>\s+\S+/m,
    /\*\*.*?\*\*/,
    /\|.+?\|.+?\|/
  ];
  let mdScore = 0;
  for (const pattern of mdPatterns) {
    if (pattern.test(trimmed)) mdScore++;
  }
  if (mdScore >= 2) return 'markdown';

  // Code indicators
  const codePatterns = [
    /^import\s+|^export\s+|^const\s+|^let\s+|^function\s+/m,
    /^def\s+\w+\s*\(|^class\s+\w+:|^from\s+\w+\s+import/m,
    /^#include\s+<|^fn\s+\w+\s*\(|^pub\s+fn/m,
    /^package\s+\w+|^func\s+\w+\s*\(/m,
    /^SELECT\s+.*\s+FROM\s+/im,
    /^#!\/bin\/(bash|sh|zsh)/m
  ];
  for (const pattern of codePatterns) {
    if (pattern.test(trimmed)) return 'code';
  }

  if (mdScore >= 1) return 'markdown';

  return 'text';
}

/**
 * AES-256-GCM encryption compatible with Web Crypto API subtleEncryptData in bitty.js
 */
export async function encryptPayload(dataBuffer, password) {
  const pwUtf8 = Buffer.from(password, 'utf-8');
  const key = crypto.createHash('sha256').update(pwUtf8).digest();
  const iv = crypto.randomBytes(12); // 96-bit random iv
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 16 bytes auth tag
  return Buffer.concat([iv, encrypted, authTag]);
}

/**
 * AES-256-GCM decryption compatible with subtleDecryptData in bitty.js
 */
export async function decryptPayload(cipherBuffer, password) {
  const pwUtf8 = Buffer.from(password, 'utf-8');
  const key = crypto.createHash('sha256').update(pwUtf8).digest();
  const iv = cipherBuffer.subarray(0, 12);
  const authTag = cipherBuffer.subarray(cipherBuffer.length - 16);
  const encrypted = cipherBuffer.subarray(12, cipherBuffer.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export function encodeChainUrl(url) {
  if (!url) return '';
  const compressed = zlib.deflateSync(Buffer.from(url, 'utf-8'), { level: 9 });
  return compressed.toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function decodeChainUrl(encoded) {
  if (!encoded) return '';
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const buffer = Buffer.from(base64, 'base64');
  const inflated = zlib.inflateSync(buffer);
  return inflated.toString('utf-8');
}

export function encodeMetadataImage(value) {
  if (!value) return '';
  return Buffer.from(String(value), 'utf-8').toString('base64').replace(/=+$/, '');
}

export function decodeMetadataImage(encoded) {
  if (!encoded) return '';
  let base64 = decodeURIComponent(encoded).replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

export function createChainId() {
  return `bbc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

function createBoxId(index) {
  const suffix = Number.isFinite(Number(index)) ? `_${Number(index)}` : '';
  return `bbx_${Date.now().toString(36)}${suffix}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Primary function to create a Bitty Link
 */
export async function createBittyLink(options = {}) {
  let {
    content,
    title,
    format = 'auto',
    language,
    theme = 'auto',
    editable = false,
    password,
    domain = DEFAULT_DOMAIN,
    metadata = {}
  } = options;

  if (options.chain && !metadata.chain) {
    metadata = { ...metadata, chain: options.chain };
  }
  if (options.description && !metadata.description) {
    metadata = { ...metadata, description: options.description };
  }
  if (options.favicon && !metadata.favicon) {
    metadata = { ...metadata, favicon: options.favicon };
  }
  if (options.image && !metadata.image) {
    metadata = { ...metadata, image: options.image };
  }
  if (options.boxId && !metadata.boxId) {
    metadata = { ...metadata, boxId: options.boxId };
  }
  if (options.lockConfig && !metadata.lockConfig) {
    metadata = { ...metadata, lockConfig: options.lockConfig };
  }
  if (!title && metadata.title) {
    title = metadata.title;
  }
  if ((metadata.lockConfig?.openLimit?.enabled || metadata.lockConfig?.timeWindow?.enabled) && !metadata.boxId) {
    metadata = { ...metadata, boxId: createBoxId(metadata.chain?.index) };
  }

  if (content === undefined || content === null) {
    throw new Error('Missing required "content" parameter');
  }
  content = String(content);

  // Pre-creation sensitive-value scan (warn-only, non-destructive).
  // Flags credentials/secrets so creators don't accidentally bake a live token
  // into a shareable (and for unencrypted links, plaintext) URL fragment.
  const secretScan = scanForSecrets(content, {
    encrypted: !!(password && String(password).trim().length > 0),
  });

  const resolvedFormat = detectFormat(content, format);

  // Auto-generate title if not provided
  if (!title) {
    if (resolvedFormat === 'markdown') {
      const match = content.match(/^#\s+(.+)$/m);
      title = match ? match[1].trim() : 'Markdown Doc';
    } else if (resolvedFormat === 'code') {
      const langName = language || 'Code';
      title = `${capitalize(langName)} Snippet`;
    } else if (resolvedFormat === 'html') {
      const match = content.match(/<title>(.*?)<\/title>/i);
      title = match ? match[1].trim() : 'Web App';
    } else if (resolvedFormat === 'json') {
      title = 'Data View';
    } else if (resolvedFormat === 'svg') {
      title = 'Vector Graphic';
    } else if (resolvedFormat === 'recipe') {
      try {
        const p = JSON.parse(content);
        title = p.name || 'Recipe';
      } catch {
        title = 'Recipe';
      }
    } else {
      title = content.split('\n')[0].substring(0, 30).trim() || 'Bitty Note';
    }
  }

  // Render to self-contained HTML payload
  let renderedHtml = '';
  switch (resolvedFormat) {
    case 'markdown':
    case 'md':
      renderedHtml = renderMarkdownToHtml(content, { title, theme });
      break;
    case 'code':
      renderedHtml = renderCodeToHtml(content, { title, language, theme });
      break;
    case 'json':
      renderedHtml = renderJsonToHtml(content, { title, theme });
      break;
    case 'svg':
      renderedHtml = renderSvgToHtml(content, { title, theme });
      break;
    case 'canvas':
      renderedHtml = renderCanvasToHtml(content, { title, theme });
      break;
    case 'recipe':
      renderedHtml = renderRecipeToHtml(content, { title });
      break;
    case 'text':
    case 'plain':
      // For simple text, markdown renderer produces clean typography
      renderedHtml = renderMarkdownToHtml(content, { title, theme });
      break;
    case 'html':
    case 'raw':
    default:
      renderedHtml = content.includes('<html') || content.includes('<!DOCTYPE')
        ? content
        : `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(title)}</title></head><body>${content}</body></html>`;
      break;
  }

  const rawBytes = Buffer.byteLength(content, 'utf-8');
  const renderedBytes = Buffer.byteLength(renderedHtml, 'utf-8');

  // Compress HTML with GZIP level 9
  let compressedBuffer = zlib.gzipSync(Buffer.from(renderedHtml, 'utf-8'), { level: 9 });

  // Optional encryption
  let isEncrypted = false;
  if (password && String(password).trim().length > 0) {
    isEncrypted = true;
    compressedBuffer = await encryptPayload(compressedBuffer, String(password).trim());
  }

  const base64Data = compressedBuffer.toString('base64');
  const compressedBytes = compressedBuffer.length;

  // Build URL components
  const cleanDomain = domain.replace(/\/+$/, '');
  const encodedTitle = encodePrettyComponent(title);

  let metaHash = encodedTitle;
  if (metadata.description) {
    metaHash += `/d/${encodePrettyComponent(String(metadata.description).substring(0, 100))}`;
  }
  if (metadata.favicon) {
    metaHash += `/f/${encodeURIComponent(String(metadata.favicon))}`;
  }
  if (metadata.image) {
    metaHash += `/i/${encodeURIComponent(encodeMetadataImage(metadata.image))}`;
  }
  if (metadata.boxId) {
    metaHash += `/box/${encodeURIComponent(String(metadata.boxId))}`;
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

  let fragmentPayload = '';
  if (isEncrypted) {
    fragmentPayload = `data:text/html;charset=utf-8;cipher=aes-gcm;format=gz;base64,${base64Data}`;
  } else if (editable) {
    fragmentPayload = `?${base64Data}`;
  } else {
    fragmentPayload = `data:text/html;charset=utf-8;format=gz;base64,${base64Data}`;
  }

  const fullUrl = `${cleanDomain}/#/${metaHash}/${fragmentPayload}`;
  const compressionRatio = renderedBytes > 0 
    ? `${Math.round((1 - (compressedBytes / renderedBytes)) * 100)}%` 
    : '0%';

  const qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chld=L|1&choe=UTF-8&chl=${encodeURIComponent(fullUrl)}`;
  const markdownLink = `[${title}](${fullUrl})`;
  const iframeSnippet = `<iframe src="${fullUrl}" width="100%" height="600" style="border:1px solid #ccc; border-radius:8px;" allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"></iframe>`;

  return {
    url: fullUrl,
    title,
    format: resolvedFormat,
    language: language || (resolvedFormat === 'code' ? detectFormat(content, 'code') : undefined),
    description: metadata.description || undefined,
    favicon: metadata.favicon || undefined,
    image: metadata.image || undefined,
    boxId: metadata.boxId || undefined,
    isEncrypted,
    chain: metadata.chain?.enabled ? metadata.chain : undefined,
    lockConfig: metadata.lockConfig || undefined,
    warnings: secretScan.matches,
    requiresSecretOverride: secretScan.requiresOverride,
    stats: {
      rawBytes,
      renderedBytes,
      compressedBytes,
      urlLength: fullUrl.length,
      compressionRatio
    },
    qrCodeUrl,
    markdownLink,
    iframeSnippet
  };
}

/**
 * Create a sequential Box Chain of multiple Bitty Boxes
 */
export async function createBittyChain(pages, options = {}) {
  if (!Array.isArray(pages) || pages.length === 0) {
    throw new Error('createBittyChain requires a non-empty "pages" array');
  }

  const domain = (options.domain || DEFAULT_DOMAIN).replace(/\/+$/, '');
  const chainId = options.chainId || createChainId();
  const total = pages.length;
  const urls = new Array(total);
  const pageSummaries = new Array(total);
  let nextUrl = undefined;
  const allWarnings = [];

  // Generate in reverse order (N-1 down to 0) so each box knows nextUrl
  for (let i = total - 1; i >= 0; i--) {
    const page = typeof pages[i] === 'string' ? { content: pages[i] } : { ...pages[i] };
    const pageMetadata = {
      ...(page.metadata || {}),
      title: page.title || page.metadata?.title,
      description: page.description || page.metadata?.description,
      favicon: page.favicon || page.metadata?.favicon,
      image: page.image || page.metadata?.image,
      boxId: page.boxId || page.metadata?.boxId,
      lockConfig: page.lockConfig || page.metadata?.lockConfig
    };
    if ((pageMetadata.lockConfig?.openLimit?.enabled || pageMetadata.lockConfig?.timeWindow?.enabled) && !pageMetadata.boxId) {
      pageMetadata.boxId = createBoxId(i);
    }
    const pageChainMeta = {
      enabled: true,
      chainId,
      index: i,
      total,
      nextUrl
    };

    const linkRes = await createBittyLink({
      ...page,
      domain,
      metadata: {
        ...pageMetadata,
        chain: pageChainMeta
      }
    });

    if (linkRes.warnings && linkRes.warnings.length) {
      allWarnings.push(...linkRes.warnings.map(w => `Page ${i + 1} (${linkRes.title}): ${w}`));
    }

    urls[i] = linkRes.url;
    pageSummaries[i] = {
      index: i,
      title: linkRes.title,
      format: linkRes.format,
      description: linkRes.description,
      favicon: linkRes.favicon,
      image: linkRes.image,
      boxId: linkRes.boxId,
      lockConfig: linkRes.lockConfig,
      url: linkRes.url,
      nextUrl: nextUrl || null,
      stats: linkRes.stats
    };

    nextUrl = linkRes.url;
  }

  const primaryTitle = pageSummaries[0]?.title || options.title || 'Chained Box';
  const primaryUrl = urls[0];

  return {
    success: true,
    chainId,
    total,
    title: primaryTitle,
    url: primaryUrl,
    primaryUrl,
    urls,
    pages: pageSummaries,
    warnings: allWarnings,
    markdownLink: `[${primaryTitle} (Box 1 of ${total})](${primaryUrl})`
  };
}

/**
 * Decode a Bitty link back into content
 */
export async function decodeBittyLink(urlOrHash, options = {}) {
  const { password } = options;
  let str = String(urlOrHash).trim();

  let hash = '';
  if (str.includes('#')) {
    hash = str.split('#')[1];
  } else {
    hash = str.startsWith('/') ? str.substring(1) : str;
  }
  if (hash.startsWith('/')) hash = hash.substring(1);

  // Split at payload boundary (/data: or /?)
  const dataIdx = hash.indexOf('/data:');
  const qIdx = hash.indexOf('/?');
  let metaSection = hash;
  let dataPart = '';

  if (dataIdx !== -1) {
    metaSection = hash.substring(0, dataIdx);
    dataPart = hash.substring(dataIdx + 1);
  } else if (qIdx !== -1) {
    metaSection = hash.substring(0, qIdx);
    dataPart = hash.substring(qIdx + 1);
  } else if (hash.startsWith('data:') || hash.startsWith('?')) {
    metaSection = '';
    dataPart = hash;
  } else {
    const slashIdx = hash.indexOf('/');
    if (slashIdx !== -1) {
      metaSection = hash.substring(0, slashIdx);
      dataPart = hash.substring(slashIdx + 1);
    } else {
      metaSection = '';
      dataPart = hash;
    }
  }

  const parts = metaSection ? metaSection.split('/') : [];
  let title = 'Document';
  let description = '';
  let favicon = '';
  let image = '';
  let boxId = undefined;
  let chain = undefined;
  let lockConfig = undefined;
  const metadataTokens = ['d', 'f', 'i', 'tw', 'ol', 'box', 'ch', 'nx'];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i === 0 && !metadataTokens.includes(part)) {
      title = decodePrettyComponent(part);
    } else if (part === 'd' && parts[i + 1]) {
      description = decodePrettyComponent(parts[i + 1]);
      i++;
    } else if (part === 'f' && parts[i + 1]) {
      favicon = decodeURIComponent(parts[i + 1]);
      i++;
    } else if (part === 'i' && parts[i + 1]) {
      try {
        image = decodeMetadataImage(parts[i + 1]);
      } catch {}
      i++;
    } else if (part === 'tw' && parts[i + 1]) {
      try {
        const rawTw = decodeURIComponent(parts[i + 1]);
        const [nb, na, sc, mode] = rawTw.split('~');
        lockConfig = {
          ...(lockConfig || {}),
          timeWindow: {
            enabled: true,
            mode: mode || undefined,
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
        lockConfig = {
          ...(lockConfig || {}),
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
      boxId = decodeURIComponent(parts[i + 1]);
      i++;
    } else if (part === 'ch' && parts[i + 1]) {
      try {
        const rawChain = decodeURIComponent(parts[i + 1]);
        const [chainId, indexRaw, totalRaw] = rawChain.split('~');
        chain = {
          ...(chain || {}),
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
        chain = {
          ...(chain || {}),
          enabled: true,
          nextUrl: decodedNextUrl || undefined,
        };
      } catch {}
      i++;
    }
  }

  let isEditable = false;
  if (dataPart.startsWith('?')) {
    isEditable = true;
    dataPart = dataPart.substring(1);
  }

  let mediatype = 'text/html';
  let format = 'gz';
  let cipher = null;
  let base64Data = dataPart;

  if (dataPart.startsWith('data:')) {
    const commaIdx = dataPart.indexOf(',');
    if (commaIdx !== -1) {
      const meta = dataPart.substring(5, commaIdx);
      base64Data = dataPart.substring(commaIdx + 1);
      
      const parts = meta.split(';');
      mediatype = parts[0] || 'text/html';
      for (const part of parts.slice(1)) {
        const [k, v] = part.split('=');
        if (k === 'format') format = v;
        if (k === 'cipher') cipher = v;
      }
    }
  }

  let buffer = Buffer.from(base64Data, 'base64');

  if (cipher && cipher.toLowerCase().includes('aes')) {
    if (!password) {
      return {
        title,
        isEncrypted: true,
        cipher,
        chain,
        lockConfig,
        error: 'Password required to decrypt this Bitty link'
      };
    }
    buffer = await decryptPayload(buffer, password);
  }

  let decompressed = '';
  if (format === 'gz' || format === 'gzip') {
    try {
      decompressed = zlib.gunzipSync(buffer).toString('utf-8');
    } catch {
      try {
        decompressed = zlib.inflateSync(buffer).toString('utf-8');
      } catch {
        try {
          decompressed = zlib.inflateRawSync(buffer).toString('utf-8');
        } catch {
          decompressed = buffer.toString('utf-8');
        }
      }
    }
  } else if (format === 'xz' || format === 'lzma') {
    throw new Error('LZMA/XZ decompression is not currently supported in server decoder');
  } else {
    decompressed = buffer.toString('utf-8');
  }

  return {
    title,
    description: description || undefined,
    favicon: favicon || undefined,
    image: image || undefined,
    boxId: boxId || undefined,
    chain: chain || undefined,
    lockConfig: lockConfig || undefined,
    mediatype,
    isEditable,
    isEncrypted: !!cipher,
    content: decompressed,
    byteLength: Buffer.byteLength(decompressed, 'utf-8')
  };
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

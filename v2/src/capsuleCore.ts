import { deflate, Inflate } from 'pako';

export const CAPSULE_SCHEMA = 'https://bittybox.org/schemas/capsule-v2.json';
export const MAX_CONTENT_BYTES = 1_000_000;
export const MAX_ENCODED_URL_LENGTH = 120_000;
const PBKDF2_ITERATIONS = 210_000;
const KNOWN_CAPABILITIES = new Set([
  'javascript',
  'network',
  'storage',
  'downloads',
  'clipboard',
  'payments',
  'ai',
]);

export type CapsuleCapabilitySet = {
  javascript: boolean;
  network: string[];
  storage: 'none' | 'ephemeral';
  downloads: boolean;
  clipboard: boolean;
  payments: boolean;
  ai: string[];
};

export type CapsuleChainLink = {
  chainId: string;
  index: number;
  total: number;
  nextUrl: string | null;
};

export type CapsuleEnvelopeV2 = {
  schema: typeof CAPSULE_SCHEMA;
  version: 2;
  kind: 'micro-app';
  title: string;
  summary: string;
  content: {
    mediaType: 'text/html' | 'text/markdown' | 'text/plain';
    encoding: 'utf-8';
    payload: string;
  };
  capabilities: CapsuleCapabilitySet;
  agent: {
    summary: string;
    actions: Array<{ name: string; description: string }>;
    remix: {
      allowed: boolean;
      modes: Array<'content' | 'style' | 'behavior'>;
    };
  };
  provenance: {
    creatorType: 'human' | 'agent';
    creatorId: string | null;
    createdAt: string;
    parentHash: string | null;
  };
  chain?: CapsuleChainLink;
  integrity: {
    algorithm: 'sha-256';
    contentHash: string;
  };
};

export type CreateCapsuleInput = {
  title: string;
  summary?: string;
  content: string;
  mediaType?: CapsuleEnvelopeV2['content']['mediaType'];
  capabilities?: Partial<CapsuleCapabilitySet>;
  creatorType?: 'human' | 'agent';
  creatorId?: string | null;
  createdAt?: string;
  parentHash?: string | null;
  remixAllowed?: boolean;
  remixModes?: Array<'content' | 'style' | 'behavior'>;
  chain?: CapsuleChainLink;
};

export class CapsuleIntegrityError extends Error {
  constructor() {
    super('Capsule integrity verification failed');
    this.name = 'CapsuleIntegrityError';
  }
}

export class CapsulePasswordRequiredError extends Error {
  constructor() {
    super('This Capsule requires a password');
    this.name = 'CapsulePasswordRequiredError';
  }
}

export class CapsuleSizeLimitError extends Error {
  constructor() {
    super('Decoded Capsule exceeds the safe size limit');
    this.name = 'CapsuleSizeLimitError';
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Capsule payload is not valid base64url');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}


function inflateBounded(input: Uint8Array, maxBytes: number): Uint8Array {
  const inflator = new Inflate({ chunkSize: 64 * 1024 });
  const chunks: Uint8Array[] = [];
  let total = 0;

  inflator.onData = (chunk: Uint8Array) => {
    total += chunk.byteLength;
    if (total > maxBytes) throw new CapsuleSizeLimitError();
    chunks.push(chunk);
  };

  inflator.push(input, true);
  if (inflator.err) throw new Error(inflator.msg || 'Capsule decompression failed');

  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const item = (value as Record<string, unknown>)[key];
      if (item !== undefined) sorted[key] = canonicalize(item);
    }
    return sorted;
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function unsignedCapsule(capsule: CapsuleEnvelopeV2): Omit<CapsuleEnvelopeV2, 'integrity'> {
  const { integrity: _integrity, ...unsigned } = capsule;
  return unsigned;
}

function normalizeCapabilities(input: unknown): CapsuleCapabilitySet {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  for (const key of Object.keys(source)) {
    if (!KNOWN_CAPABILITIES.has(key)) throw new Error(`Unknown capability: ${key}`);
  }
  const network = Array.isArray(source.network)
    ? source.network.filter((item): item is string => typeof item === 'string').slice(0, 20)
    : [];
  const ai = Array.isArray(source.ai)
    ? source.ai.filter((item): item is string => typeof item === 'string').slice(0, 20)
    : [];
  return {
    javascript: source.javascript === true,
    network,
    storage: source.storage === 'none' ? 'none' : 'ephemeral',
    downloads: source.downloads === true,
    clipboard: source.clipboard === true,
    payments: source.payments === true,
    ai,
  };
}

function assertCapsuleShape(value: unknown): asserts value is CapsuleEnvelopeV2 {
  if (!value || typeof value !== 'object') throw new Error('Capsule envelope must be an object');
  const capsule = value as Partial<CapsuleEnvelopeV2>;
  if (capsule.schema !== CAPSULE_SCHEMA || capsule.version !== 2 || capsule.kind !== 'micro-app') {
    throw new Error('Unsupported Capsule schema or version');
  }
  if (!capsule.content || typeof capsule.content.payload !== 'string') throw new Error('Capsule content is missing');
  if (encoder.encode(capsule.content.payload).byteLength > MAX_CONTENT_BYTES) throw new Error('Capsule content is too large');
  if (!capsule.integrity || !/^[a-f0-9]{64}$/.test(capsule.integrity.contentHash || '')) {
    throw new Error('Capsule integrity record is invalid');
  }
  normalizeCapabilities(capsule.capabilities);
}

export async function createCapsule(input: CreateCapsuleInput): Promise<CapsuleEnvelopeV2> {
  const title = normalizeText(input.title, 80);
  if (!title) throw new Error('Capsule title is required');
  if (typeof input.content !== 'string') throw new Error('Capsule content must be text');
  if (encoder.encode(input.content).byteLength > MAX_CONTENT_BYTES) throw new Error('Capsule content is too large');

  const mediaType = input.mediaType ?? 'text/html';
  if (!['text/html', 'text/markdown', 'text/plain'].includes(mediaType)) {
    throw new Error(`Unsupported media type: ${mediaType}`);
  }
  const createdAt = input.createdAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(createdAt))) throw new Error('createdAt must be an ISO-8601 timestamp');

  const unsigned: Omit<CapsuleEnvelopeV2, 'integrity'> = {
    schema: CAPSULE_SCHEMA,
    version: 2,
    kind: 'micro-app',
    title,
    summary: normalizeText(input.summary, 240),
    content: {
      mediaType,
      encoding: 'utf-8',
      payload: input.content,
    },
    capabilities: normalizeCapabilities(input.capabilities),
    agent: {
      summary: normalizeText(input.summary, 240) || `Portable ${title} Capsule`,
      actions: [],
      remix: {
        allowed: input.remixAllowed !== false,
        modes: input.remixModes?.length ? [...new Set(input.remixModes)].slice(0, 3) : ['content', 'style'],
      },
    },
    provenance: {
      creatorType: input.creatorType ?? 'human',
      creatorId: normalizeText(input.creatorId, 120) || null,
      createdAt: new Date(createdAt).toISOString(),
      parentHash: normalizeText(input.parentHash, 64) || null,
    },
    ...(input.chain ? { chain: { ...input.chain } } : {}),
  };

  return {
    ...unsigned,
    integrity: {
      algorithm: 'sha-256',
      contentHash: await sha256Hex(canonicalJson(unsigned)),
    },
  };
}

export async function verifyCapsule(capsule: CapsuleEnvelopeV2): Promise<boolean> {
  try {
    assertCapsuleShape(capsule);
    return capsule.integrity.algorithm === 'sha-256'
      && capsule.integrity.contentHash === await sha256Hex(canonicalJson(unsignedCapsule(capsule)));
  } catch {
    return false;
  }
}

async function deriveEncryptionKey(password: string, salt: Uint8Array, usages: KeyUsage[]): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    usages,
  );
}

async function encryptBytes(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(password, salt, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
  return encoder.encode(JSON.stringify({
    version: 2,
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64Url(salt),
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(ciphertext),
  }));
}

async function decryptBytes(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  const transport = JSON.parse(decoder.decode(bytes)) as Record<string, unknown>;
  if (transport.version !== 2 || transport.cipher !== 'AES-256-GCM' || transport.kdf !== 'PBKDF2-SHA-256') {
    throw new Error('Unsupported encrypted Capsule transport');
  }
  if (transport.iterations !== PBKDF2_ITERATIONS) throw new Error('Unsupported Capsule key-derivation parameters');
  const salt = base64UrlToBytes(String(transport.salt || ''));
  const iv = base64UrlToBytes(String(transport.iv || ''));
  const ciphertext = base64UrlToBytes(String(transport.ciphertext || ''));
  if (salt.length !== 16 || iv.length !== 12) throw new Error('Invalid encrypted Capsule parameters');
  const key = await deriveEncryptionKey(password, salt, ['decrypt']);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext));
}

export async function encodeCapsuleUrl(
  capsule: CapsuleEnvelopeV2,
  options: {
    origin?: string;
    basePath?: string;
    password?: string;
    allowInvalidIntegrityForTest?: boolean;
  } = {},
): Promise<string> {
  if (!options.allowInvalidIntegrityForTest && !await verifyCapsule(capsule)) throw new CapsuleIntegrityError();
  const packed = deflate(encoder.encode(canonicalJson(capsule)), { level: 9 });
  const password = options.password?.trim();
  const marker = password ? 'bbx2e' : 'bbx2';
  const transport = password ? await encryptBytes(packed, password) : packed;
  const origin = (options.origin ?? globalThis.location?.origin ?? 'https://bittybox.org').replace(/\/$/, '');
  const basePath = `/${(options.basePath ?? '/lab/v2/').replace(/^\/+|\/+$/g, '')}/`;
  const url = `${origin}${basePath}#/${marker}/${bytesToBase64Url(transport)}`;
  if (url.length > MAX_ENCODED_URL_LENGTH) throw new Error('Encoded Capsule URL is too large');
  return url;
}

function extractTransport(value: string): { marker: 'bbx2' | 'bbx2e'; payload: string } {
  if (value.length > MAX_ENCODED_URL_LENGTH) throw new Error('Encoded Capsule URL is too large');
  const match = value.match(/(?:^|#\/)\s*(bbx2e|bbx2)\/([A-Za-z0-9_-]+)$/);
  if (!match) throw new Error('Not a Bitty Box v2 Capsule URL');
  return { marker: match[1] as 'bbx2' | 'bbx2e', payload: match[2] };
}

export async function decodeCapsuleUrl(
  value: string,
  options: { password?: string } = {},
): Promise<CapsuleEnvelopeV2> {
  const { marker, payload } = extractTransport(value);
  let packed = base64UrlToBytes(payload);
  if (marker === 'bbx2e') {
    if (!options.password) throw new CapsulePasswordRequiredError();
    packed = await decryptBytes(packed, options.password);
  }
  const jsonBytes = inflateBounded(packed, MAX_CONTENT_BYTES * 2);
  const parsed = JSON.parse(decoder.decode(jsonBytes)) as unknown;
  assertCapsuleShape(parsed);
  if (!await verifyCapsule(parsed)) throw new CapsuleIntegrityError();
  return parsed;
}

export type ChainDraftInput = {
  title: string;
  summary?: string;
  content: string;
  mediaType?: CapsuleEnvelopeV2['content']['mediaType'];
  password?: string;
};

export async function buildCapsuleChain(
  boxes: ChainDraftInput[],
  options: {
    origin?: string;
    basePath?: string;
    createdAt?: string;
    chainId?: string;
  } = {},
): Promise<{ entryUrl: string; urls: string[]; chainId: string }> {
  if (!Array.isArray(boxes) || boxes.length < 1 || boxes.length > 5) {
    throw new Error('A Bitty Box chain must contain between 1 and 5 Boxes');
  }
  const chainId = options.chainId ?? `bbc_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const urls = new Array<string>(boxes.length);
  let nextUrl: string | null = null;

  for (let index = boxes.length - 1; index >= 0; index -= 1) {
    const box = boxes[index];
    const capsule = await createCapsule({
      title: box.title,
      summary: box.summary,
      content: box.content,
      mediaType: box.mediaType,
      createdAt: options.createdAt,
      chain: {
        chainId,
        index,
        total: boxes.length,
        nextUrl,
      },
    });
    const url = await encodeCapsuleUrl(capsule, {
      origin: options.origin,
      basePath: options.basePath,
      password: box.password,
    });
    urls[index] = url;
    nextUrl = url;
  }

  return { entryUrl: urls[0], urls, chainId };
}

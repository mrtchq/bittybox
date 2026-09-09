// ─────────────────────────────────────────────────────────────────────────────
// lib/box-store.js
// Box CRUD + persistence + lock enforcement for Bitty Box.
//
// Backed by /var/lib/bittybox/locked-boxes.json (the live data file used by
// the running server). The schema is: { version, boxes: { [id]: Box }, events: [] }.
//
// A Box:
//   {
//     id, title, description, createdAt, updatedAt, createdBy, lockConfig,
//     payload: { bittyUrl, bittyRelativeUrl, bittyId, htmlSha256, payloadSha256 },
//     unlockEvents: [ { id, timestamp, ok, emailHash, ipHash, userAgentHash, sessionKey, deniedCodes? } ]
//   }
//
// lockConfig:
//   { password?, timeWindow?, openLimit?, sessionOpenLimit?, inviteOnly? }
//   (each rule: { enabled, ... } or null)
//
// Session-relative open counts are tracked in-memory (per process). Per-box
// opensUsed is authoritative on disk; per-session is best-effort sticky.
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { attachChainMeta } from './chain.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORE_SYSTEM = '/var/lib/bittybox/locked-boxes.json';
const STORE_PRIMARY = path.join(__dirname, '..', '..', 'var', 'lib', 'bittybox', 'locked-boxes.json');
const STORE_LEGACY = path.join(__dirname, '..', '..', 'var', 'lib', 'bittybox', 'boxes.json');

function getDataPath() {
  if (fs.existsSync(STORE_SYSTEM)) return STORE_SYSTEM;
  if (fs.existsSync(STORE_PRIMARY)) return STORE_PRIMARY;
  if (fs.existsSync(STORE_LEGACY)) return STORE_LEGACY;
  const fresh = { version: 1, boxes: {}, events: [] };
  const target = fs.existsSync('/var/lib/bittybox') ? STORE_SYSTEM : STORE_PRIMARY;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(fresh, null, 2));
  return target;
}

function readStore() {
  const p = getDataPath();
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    if (!data.boxes) data.boxes = {};
    if (!data.events) data.events = [];
    return data;
  } catch (e) {
    return { version: 1, boxes: {}, events: [] };
  }
}

function writeStore(data) {
  fs.writeFileSync(getDataPath(), JSON.stringify(data, null, 2));
}

function genId(prefix) {
  return prefix + crypto.randomBytes(8).toString('hex');
}

function eventId() {
  return 'evt_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
}

function hashEmail(email) {
  if (!email) return null;
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}
function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex');
}
function hashUserAgent(ua) {
  if (!ua) return null;
  return crypto.createHash('sha256').update(ua).digest('hex');
}
function hashSessionKey(ip, userAgent) {
  return crypto.createHash('sha256').update((ip || '0.0.0.0') + '|' + (userAgent || '')).digest('hex');
}

// ─────────────────────────────────────────────────────────────────────────────
// Box CRUD
// ─────────────────────────────────────────────────────────────────────────────

export function createBox({ id: customId, boxId, title, description, bittyUrl, bittyRelativeUrl, bittyId, htmlSha256, payloadSha256, createdBy, lockConfig, chain } = {}) {
  const store = readStore();
  const now = new Date().toISOString();
  const id = customId || boxId || genId('bbx_');
  const box = {
    id,
    title: title || 'Untitled Box',
    description: description || '',
    createdAt: now,
    updatedAt: now,
    createdBy: createdBy || { type: 'api', userId: null, keyId: null },
    lockConfig: lockConfig || { password: null, timeWindow: null, openLimit: null, sessionOpenLimit: null, inviteOnly: null },
    chain: chain || null,
    payload: {
      bittyUrl: bittyUrl || '',
      bittyRelativeUrl: bittyRelativeUrl || '',
      bittyId: bittyId || '',
      htmlSha256: htmlSha256 || null,
      payloadSha256: payloadSha256 || null,
    },
    unlockEvents: [],
  };
  store.boxes[id] = box;
  store.events.push({ type: 'box.created', id: eventId(), timestamp: now, boxId: id, createdBy: box.createdBy.type });
  writeStore(store);
  return box;
}

/**
 * Create a linear chain of boxes TAIL-FIRST.
 *
 * Each boxSpec is rendered into a Bitty Link URL (via renderBoxUrl) and stored
 * as a box. The last box has nextUrl=null; each earlier box's `chain.nextUrl`
 * points at the already-built (chain-tagged) URL of the following box, so
 * opening box[0] walks forward to box[n-1].
 *
 * boxSpec fields:
 *   { title?, description?, bittyUrl | bittyRelativeUrl | bittyId, lockConfig?,
 *     createdBy? }
 *
 * Returns { chainId, total, boxes: [ { index, boxId, url, nextUrl } ] }
 * where boxes[0] is the first box to open.
 */
export function createChainedBoxes({ boxes = [], renderBoxUrl, createdBy } = {}) {
  if (!Array.isArray(boxes) || boxes.length === 0) {
    throw new Error('chains require at least one box spec');
  }
  if (typeof renderBoxUrl !== 'function') {
    throw new Error('createChainedBoxes requires a renderBoxUrl(url) helper');
  }
  const total = boxes.length;
  const chainId = 'bbc_' + crypto.randomBytes(6).toString('hex');
  const built = new Array(total);
  let nextUrl = null;

  // Tail-first: start at the last box, walk backward.
  for (let i = total - 1; i >= 0; i--) {
    const spec = boxes[i] || {};
    const baseUrl = spec.bittyUrl || spec.bittyRelativeUrl || '';
    if (!baseUrl) {
      throw new Error(`chain box ${i} missing bittyUrl/bittyRelativeUrl`);
    }
    const chainTagged = attachChainMeta(baseUrl, { chainId, index: i, total, nextUrl });
    const box = createBox({
      title: spec.title,
      description: spec.description,
      bittyUrl: chainTagged,
      bittyRelativeUrl: spec.bittyRelativeUrl,
      bittyId: spec.bittyId,
      createdBy: spec.createdBy || createdBy || { type: 'api', userId: null, keyId: null },
      lockConfig: spec.lockConfig,
      chain: { chainId, index: i, total, nextUrl },
    });
    built[i] = { index: i, boxId: box.id, url: chainTagged, nextUrl };
    nextUrl = chainTagged;
  }

  return { chainId, total, boxes: built };
}


export function getBox(id) {
  return readStore().boxes[id] || null;
}

export function listBoxes() {
  return Object.values(readStore().boxes).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export function getBoxesByOwner(userId) {
  if (!userId) return listBoxes();
  return listBoxes().filter(b => b.createdBy?.userId === userId);
}

export function updateBox(id, patch) {
  const store = readStore();
  const box = store.boxes[id];
  if (!box) return null;
  Object.assign(box, patch, { updatedAt: new Date().toISOString() });
  store.events.push({ type: 'box.updated', id: eventId(), timestamp: box.updatedAt, boxId: id });
  writeStore(store);
  return box;
}

export function deleteBox(id) {
  const store = readStore();
  if (!store.boxes[id]) return false;
  delete store.boxes[id];
  store.events.push({ type: 'box.deleted', id: eventId(), timestamp: new Date().toISOString(), boxId: id });
  writeStore(store);
  return true;
}

// lock-config setters used by server.js + MCP tools
export function updateLockConfig(id, lockConfig) {
  return updateBox(id, { lockConfig });
}
export function publishBox(id) {
  return updateBox(id, { published: true });
}
export function unpublishBox(id) {
  return updateBox(id, { published: false });
}
export function incrementOpensUsed(id) {
  const store = readStore();
  const box = store.boxes[id];
  if (!box) return null;
  box.lockConfig = box.lockConfig || {};
  box.lockConfig.openLimit = box.lockConfig.openLimit || { enabled: false, maxOpens: 0, opensUsed: 0 };
  box.lockConfig.openLimit.opensUsed = (box.lockConfig.openLimit.opensUsed || 0) + 1;
  writeStore(store);
  return box;
}

export function setPasswordLock(id, passwordConfig) {
  return updateBox(id, { lockConfig: { ...getBox(id).lockConfig, password: passwordConfig } });
}
export function setTimeWindowLock(id, timeWindowConfig) {
  return updateBox(id, { lockConfig: { ...getBox(id).lockConfig, timeWindow: timeWindowConfig } });
}
export function setAccessLimitLock(id, openLimitConfig) {
  return updateBox(id, { lockConfig: { ...getBox(id).lockConfig, openLimit: openLimitConfig } });
}
export function setSessionLimitLock(id, sessionOpenLimitConfig) {
  return updateBox(id, { lockConfig: { ...getBox(id).lockConfig, sessionOpenLimit: sessionOpenLimitConfig } });
}
export function setInviteOnlyLock(id, inviteOnlyConfig) {
  return updateBox(id, { lockConfig: { ...getBox(id).lockConfig, inviteOnly: inviteOnlyConfig } });
}

// ─────────────────────────────────────────────────────────────────────────────
// Lock helper constructors (verifier generation delegated to policy-evaluator)
// ─────────────────────────────────────────────────────────────────────────────

export function createInviteOnly(emails = []) {
  const allowedEmailHashes = (Array.isArray(emails) ? emails : [emails])
    .filter(Boolean)
    .map(e => (typeof e === 'string' ? hashEmail(e) : e));
  return { enabled: true, allowedEmailHashes, allowedEmailCount: allowedEmailHashes.length };
}

export function createTimeWindow({ notBefore = null, notAfter = null } = {}) {
  return { enabled: true, notBefore, notAfter };
}

export function createOpenLimit({ maxOpens = 1 } = {}) {
  return { enabled: true, maxOpens, opensUsed: 0 };
}

export function createSessionOpenLimit({ maxSessionOpens = 1 } = {}) {
  return { enabled: true, maxSessionOpens };
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory per-session open tracking (sticky across requests in one process)
// ─────────────────────────────────────────────────────────────────────────────

const sessionOpens = new Map(); // sessionKey -> count

export function touchSessionOpens(sessionKey) {
  if (!sessionKey) return 0;
  const n = (sessionOpens.get(sessionKey) || 0) + 1;
  sessionOpens.set(sessionKey, n);
  return n;
}

export function getSessionOpenCount(sessionKey) {
  return sessionOpens.get(sessionKey) || 0;
}

export function resetSessionOpens(sessionKey) {
  if (sessionKey) sessionOpens.delete(sessionKey);
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit (unlock events stored on the box)
// ─────────────────────────────────────────────────────────────────────────────

export function recordUnlock(boxId, { sessionKey, email, ip, userAgent }) {
  const store = readStore();
  const box = store.boxes[boxId];
  if (!box) return false;
  box.unlockEvents = box.unlockEvents || [];
  box.unlockEvents.push({
    id: eventId(),
    timestamp: new Date().toISOString(),
    ok: true,
    emailHash: email ? hashEmail(email) : null,
    ipHash: ip ? hashIp(ip) : null,
    userAgentHash: userAgent ? hashUserAgent(userAgent) : null,
    sessionKey,
  });
  store.events.push({ type: 'box.unlock.allowed', id: eventId(), timestamp: box.unlockEvents[box.unlockEvents.length - 1].timestamp, boxId });
  writeStore(store);
  return true;
}

export function recordDeniedUnlock(boxId, { reason, sessionKey, email, ip, userAgent }) {
  const store = readStore();
  const box = store.boxes[boxId];
  if (!box) return false;
  box.unlockEvents = box.unlockEvents || [];
  box.unlockEvents.push({
    id: eventId(),
    timestamp: new Date().toISOString(),
    ok: false,
    emailHash: email ? hashEmail(email) : null,
    ipHash: ip ? hashIp(ip) : null,
    userAgentHash: userAgent ? hashUserAgent(userAgent) : null,
    sessionKey,
    deniedCodes: Array.isArray(reason) ? reason : [reason],
  });
  store.events.push({ type: 'box.unlock.denied', id: eventId(), timestamp: box.unlockEvents[box.unlockEvents.length - 1].timestamp, boxId });
  writeStore(store);
  return true;
}

export function getUnlockEvents(boxId) {
  const box = getBox(boxId);
  return box ? (box.unlockEvents || []) : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined access evaluation (used by unlock endpoint)
// ─────────────────────────────────────────────────────────────────────────────

export async function evaluateAndRecord(boxId, { password, email, ip, userAgent, sessionId, sessionOpenCount }) {
  // Lazy-load the evaluator to avoid a hard import cycle / missing-dep crash.
  const { evaluatePolicy } = await import('./policy-evaluator.js');
  const box = getBox(boxId);
  if (!box) return { ok: false, reason: 'box_not_found', deniedCodes: ['box_not_found'] };
  const sessionKey = sessionId || hashSessionKey(ip, userAgent);
  const result = evaluatePolicy(box.lockConfig, { password, email, ip, userAgent, sessionId: sessionKey, sessionOpenCount }, { boxId, opensUsed: box.lockConfig?.openLimit?.opensUsed || 0 });
  if (result.ok) {
    recordUnlock(boxId, { sessionKey, email, ip, userAgent });
  } else {
    recordDeniedUnlock(boxId, { reason: result.deniedCodes, sessionKey, email, ip, userAgent });
  }
  return { ok: result.ok, reason: result.ok ? null : result.deniedCodes[0], deniedCodes: result.deniedCodes, sessionKey };
}

export function getDataDir() {
  return path.dirname(getDataPath());
}

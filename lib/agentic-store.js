/**
 * Persistence for Agentic Box manifests.
 *
 * Stored as a JSON file next to the BittyBox box store. Each manifest is a
 * declarative Agent Manifest: Trigger / Doctrine / Echo / Safety. It NEVER holds
 * OpenMolt credentials or raw integration specs — those are derived server-side
 * from the curated template when the daemon agent is spawned.
 *
 * Store shape: { boxes: { [id]: AgenticBox } }
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'agentic-boxes.json');

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
  } catch {
    return { boxes: {} };
  }
}

function writeStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}

export function listAgenticBoxes(ownerId) {
  const store = readStore();
  return Object.values(store.boxes)
    .filter((b) => !ownerId || b.ownerId === ownerId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export function getAgenticBox(id) {
  return readStore().boxes[id] || null;
}

export function createAgenticBox({
  ownerId,
  title,
  templateName,
  mission,
  outputMode = 'show_in_box',
  maxSteps = 8,
  trigger = { type: 'visitor_message' },
  safety = { approvalRequired: false, maxRunsPerHour: 12 },
  enabled = false,
}) {
  const store = readStore();
  const id = 'abx_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();
  const box = {
    id,
    ownerId,
    title,
    templateName,
    mission,
    outputMode,
    maxSteps,
    trigger,
    safety,
    enabled,
    createdAt: now,
    updatedAt: now,
  };
  store.boxes[id] = box;
  writeStore(store);
  return box;
}

export function updateAgenticBox(id, patch) {
  const store = readStore();
  const box = store.boxes[id];
  if (!box) throw new Error('agentic box not found');
  const now = new Date().toISOString();
  const next = { ...box, ...patch, updatedAt: now };
  store.boxes[id] = next;
  writeStore(store);
  return next;
}

export function deleteAgenticBox(id) {
  const store = readStore();
  if (!store.boxes[id]) return false;
  delete store.boxes[id];
  writeStore(store);
  return true;
}

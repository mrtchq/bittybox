/**
 * Small persistent audit journal for conversational AI actions.
 * Audit entries are sanitized before they reach disk and are append-only from
 * the action layer. This is operational evidence, not a billing transaction log.
 */
import fs from 'fs';
import path from 'path';
import { createAuditEnvelope } from './ai-action-registry.js';

const DATA_DIR = process.env.BITTYBOX_DATA_DIR || '/var/lib/bittybox';
const AUDIT_FILE = path.join(DATA_DIR, 'ai-audit.jsonl');

function safeJson(value) {
  try { return JSON.parse(JSON.stringify(value ?? null)); } catch { return null; }
}

export function appendAiAudit({ actionId, user, conversationId, parameters = {}, status, before, after, error = null } = {}) {
  const envelope = createAuditEnvelope({
    actionId,
    user,
    conversationId,
    parameters: { ...parameters, before, after },
    status,
    error,
  });
  const line = `${JSON.stringify(envelope)}\n`;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.appendFileSync(AUDIT_FILE, line, { encoding: 'utf8', mode: 0o600 });
  try { fs.chmodSync(AUDIT_FILE, 0o600); } catch {}
  return envelope;
}

export function readAiAudits({ limit = 100 } = {}) {
  try {
    return fs.readFileSync(AUDIT_FILE, 'utf8').trim().split('\n').filter(Boolean)
      .slice(-Math.max(1, Math.min(1000, Number(limit) || 100)))
      .map((line) => JSON.parse(line));
  } catch { return []; }
}

export function _testAuditPath() { return AUDIT_FILE; }

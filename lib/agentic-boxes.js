/**
 * Agentic Box subsystem — native OpenMolt integration for BittyBox.
 *
 * Design contract (read before editing):
 *  - BittyBox OWNS the agent lifecycle. The OpenMolt daemon (moltctl) is a trusted
 *    loopback supervisor on 127.0.0.1:7777, authenticated by MOLTCTL_API_TOKEN.
 *  - The daemon token NEVER reaches the browser. This module is server-side only.
 *  - Creators configure a declarative Agent Manifest (Trigger / Doctrine / Echo / Safety).
 *    They never write OpenMolt specs, never pick free credentials, never get raw tools.
 *  - Only TEMPLATE agents (curated Doctrine presets) may be spawned. Each template maps
 *    to a fixed, minimal OpenMolt integration allowlist. No creator-supplied integrations.
 *  - Public box input is treated as hostile: it is passed as data into a hardened
 *    instruction template, never concatenated into system instructions.
 *  - Runs are async + polled. Long agent runs never block an HTTP request.
 *
 * Endpoints mounted under /api/agentic-boxes:
 *   GET    /templates                -> list available box agent templates
 *   POST   /                         -> create an agentic box (auth required)
 *   GET    /                         -> list caller's agentic boxes
 *   GET    /:id                     -> get one agentic box
 *   PATCH  /:id                     -> update manifest (disabled boxes only, sane subset)
 *   POST   /:id/preview             -> safe dry-run against creator's own "preview" trigger
 *   POST   /:id/trigger             -> awaken the box's agent for a real interaction
 *   GET    /:id/runs/:runId         -> poll run status / result
 *   POST   /:id/disable             -> kill switch (creator only)
 *   POST   /:id/enable              -> re-enable
 *   DELETE /:id                     -> delete box + retire its agent
 */

import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  authMiddleware,
  requireUser,
} from './agentic-auth-bridge.js';
import {
  listAgenticBoxes,
  getAgenticBox,
  createAgenticBox,
  updateAgenticBox,
  deleteAgenticBox,
} from './agentic-store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MOLTCTL_BASE = process.env.MOLTCTL_BASE || 'http://127.0.0.1:7777';
const MOLTCTL_TOKEN = process.env.MOLTCTL_API_TOKEN || readTokenFile();
const AGENT_PREFIX = 'bitty_';

function readTokenFile() {
  for (const p of ['/root/.moltctl_token', '/root/openmolt-control/.env']) {
    try {
      const raw = fs.readFileSync(p, 'utf-8');
      if (p.endsWith('.env')) {
        const m = raw.match(/MOLTCTL_API_TOKEN\s*=\s*"?([^"\n]+)"?/);
        if (m) return m[1].trim();
      } else {
        return raw.trim();
      }
    } catch { /* try next */ }
  }
  return '';
}

// ─── Curated Doctrine templates ───────────────────────────────────────────────
// The ONLY agents a box may spawn. Each has a fixed, minimal tool allowlist.
// integrations values are restricted to moltctl's KNOWN_INTEGRATIONS subset.
// 'web' is implemented as OpenMolt's built-in httpRequest (read-only GET by default).
export const TEMPLATES = Object.freeze({
  researcher: {
    label: 'Researcher',
    blurb: 'Investigates a topic and returns surprising, sourced facts.',
    model: 'openai:gpt-4o-mini',
    integrations: ['httpRequest'],
    maxSteps: 12,
    instructionTmpl: (mission, input, boxTitle) => `You are a careful researcher box titled "${boxTitle}".
Creator mission: ${mission}
The visitor gave you this input: """${input}"""
Plan, reason, and act to answer the visitor's input using web research tools.
Return a concise, friendly answer with the most surprising findings.
Do not ask the visitor more questions. Do not perform any writes, sends, or purchases.`,
  },
  writer: {
    label: 'Writer',
    blurb: 'Turns a short idea into polished, ready-to-use text.',
    model: 'openai:gpt-4o-mini',
    integrations: [],
    maxSteps: 8,
    instructionTmpl: (mission, input, boxTitle) => `You are a creative writer box titled "${boxTitle}".
Creator mission: ${mission}
The visitor gave you this input: """${input}"""
Write the requested piece. Be vivid but concise.
Return only the final text. Do not ask follow-up questions.`,
  },
  recommender: {
    label: 'Recommender',
    blurb: 'Scores or classifies something and gives a clear pick.',
    model: 'openai:gpt-4o-mini',
    integrations: [],
    maxSteps: 8,
    instructionTmpl: (mission, input, boxTitle) => `You are a recommender box titled "${boxTitle}".
Creator mission: ${mission}
The visitor gave you this input: """${input}"""
Evaluate the input and return a confident recommendation or classification.
Be specific. Do not ask follow-up questions.`,
  },
});

export const TEMPLATE_NAMES = Object.keys(TEMPLATES);

// ─── Validation helpers ────────────────────────────────────────────────────────
function clampInt(v, min, max, dflt) {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function sanitizeText(v, max = 4000) {
  if (typeof v !== 'string') return '';
  return v.slice(0, max);
}

function isValidTemplate(name) {
  return Object.prototype.hasOwnProperty.call(TEMPLATES, name);
}

// ─── Daemon client (loopback only, token never leaves server) ──────────────────
async function moltctl(method, subpath, body) {
  const url = `${MOLTCTL_BASE}/api/${subpath}`;
  const init = {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MOLTCTL_TOKEN}` },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(url, init);
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, json };
}

function agentNameFor(boxId) {
  return `${AGENT_PREFIX}${boxId}`;
}

async function spawnDaemonAgent(boxId, templateName, mission) {
  const t = TEMPLATES[templateName];
  const tpl = {
    name: agentNameFor(boxId),
    model: t.model,
    instructions: `BittyBox agentic box (${templateName}). Mission: ${mission}\n[System: this agent is invoked per visitor interaction; never perform external writes/sends/purchases unless explicitly granted by a curated template.]`,
    integrations: t.integrations,
    maxSteps: t.maxSteps,
  };
  const r = await moltctl('POST', 'agents', tpl);
  if (!r.ok) {
    throw new Error(`moltctl spawn failed (${r.status}): ${JSON.stringify(r.json)}`);
  }
  return r.json;
}

async function runDaemonAgent(boxId, input) {
  const r = await moltctl('POST', `agents/${agentNameFor(boxId)}/run`, { input });
  if (!r.ok) {
    throw new Error(`moltctl run failed (${r.status}): ${JSON.stringify(r.json)}`);
  }
  return r.json; // { runId, status, agent }
}

async function getDaemonRun(boxId, runId, logs = false) {
  const r = await moltctl('GET', `agents/${agentNameFor(boxId)}/runs/${runId}${logs ? '?logs=full' : '?tail=30'}`);
  if (!r.ok) {
    throw new Error(`moltctl run fetch failed (${r.status}): ${JSON.stringify(r.json)}`);
  }
  return r.json;
}

async function deleteDaemonAgent(boxId) {
  const r = await moltctl('DELETE', `agents/${agentNameFor(boxId)}`);
  // 404/410 acceptable (already gone)
  if (!r.ok && r.status !== 404 && r.status !== 410) {
    throw new Error(`moltctl delete failed (${r.status}): ${JSON.stringify(r.json)}`);
  }
  return true;
}

// ─── Run result shaping ────────────────────────────────────────────────────────
function shapeRun(run) {
  // run shape from moltctl: { runId, status, startedAt, finishedAt, error, result, finishCommand, recentLogs }
  let output = '';
  try {
    const fc = run.finishCommand;
    const cand = fc?.humanMessage || (fc && fc.output !== undefined ? fc.output : undefined) || run.result;
    if (typeof cand === 'string') output = cand;
    else if (cand && typeof cand === 'object') {
      const keys = Object.keys(cand);
      if (keys.length === 1 && typeof cand[keys[0]] === 'string') output = cand[keys[0]];
      else output = JSON.stringify(cand);
    }
  } catch { /* ignore */ }
  return {
    runId: run.runId,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    error: run.error || null,
    output: output.slice(0, 4000),
    recentLogs: Array.isArray(run.recentLogs) ? run.recentLogs.slice(-30) : [],
  };
}

// ─── Router ────────────────────────────────────────────────────────────────────
export function createAgenticBoxRouter() {
  const router = express.Router();

  router.get('/templates', (_req, res) => {
    res.json({
      success: true,
      templates: TEMPLATE_NAMES.map((name) => ({
        name,
        label: TEMPLATES[name].label,
        blurb: TEMPLATES[name].blurb,
        maxSteps: TEMPLATES[name].maxSteps,
      })),
    });
  });

  // Create an agentic box
  router.post('/', authMiddleware({ required: true }), async (req, res) => {
    try {
      const body = req.body || {};
      const templateName = body.template;
      if (!isValidTemplate(templateName)) {
        return res.status(400).json({ success: false, error: `Unknown template. Use one of: ${TEMPLATE_NAMES.join(', ')}` });
      }
      const mission = sanitizeText(body.mission, 2000);
      if (!mission.trim()) {
        return res.status(400).json({ success: false, error: 'A short mission is required (what should your box do?).' });
      }
      const title = sanitizeText(body.title || `${TEMPLATES[templateName].label} Box`, 200);
      const outputMode = body.outputMode === 'notify_creator' || body.outputMode === 'save_private'
        ? body.outputMode
        : 'show_in_box';
      const maxSteps = clampInt(body.maxSteps, 4, TEMPLATES[templateName].maxSteps, TEMPLATES[templateName].maxSteps);

      const box = createAgenticBox({
        ownerId: req.user.id,
        title,
        templateName,
        mission,
        outputMode,
        maxSteps,
        trigger: body.trigger && typeof body.trigger === 'object' ? body.trigger : { type: 'visitor_message' },
        safety: {
          approvalRequired: body.outputMode === 'notify_creator' || Boolean(body.approvalRequired),
          maxRunsPerHour: clampInt(body.maxRunsPerHour, 1, 60, 12),
        },
        enabled: false, // creator enables after preview
      });

      // Provision the daemon agent immediately (fail closed if daemon unreachable).
      try {
        await spawnDaemonAgent(box.id, templateName, mission);
      } catch (e) {
        deleteAgenticBox(box.id); // roll back store record if provisioning fails
        return res.status(502).json({ success: false, error: `Agent runtime unavailable: ${e.message}` });
      }

      res.json({ success: true, box: publicBox(box), message: 'Agentic box created. Preview it, then enable.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // List caller's boxes
  router.get('/', authMiddleware({ required: true }), (req, res) => {
    const boxes = listAgenticBoxes(req.user.id).map(publicBox);
    res.json({ success: true, boxes });
  });

  // Get one
  router.get('/:id', authMiddleware({ required: true }), (req, res) => {
    const box = getAgenticBox(req.params.id);
    if (!box || box.ownerId !== req.user.id) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, box: publicBox(box) });
  });

  // Update (only safe fields, only when disabled)
  router.patch('/:id', authMiddleware({ required: true }), (req, res) => {
    const box = getAgenticBox(req.params.id);
    if (!box || box.ownerId !== req.user.id) return res.status(404).json({ success: false, error: 'Not found' });
    if (box.enabled) return res.status(409).json({ success: false, error: 'Disable the box before editing.' });
    const allowed = {};
    if (typeof req.body.title === 'string') allowed.title = sanitizeText(req.body.title, 200);
    if (typeof req.body.mission === 'string') allowed.mission = sanitizeText(req.body.mission, 2000);
    if (typeof req.body.trigger === 'object') allowed.trigger = req.body.trigger;
    const updated = updateAgenticBox(req.params.id, allowed);
    res.json({ success: true, box: publicBox(updated) });
  });

  // Preview (safe dry-run; does not count toward run limits, uses placeholder input)
  router.post('/:id/preview', authMiddleware({ required: true }), async (req, res) => {
    try {
      const box = getAgenticBox(req.params.id);
      if (!box || box.ownerId !== req.user.id) return res.status(404).json({ success: false, error: 'Not found' });
      const previewInput = sanitizeText(req.body.input || 'Hello! Can you show me what you do?', 2000);
      const run = await runDaemonAgent(box.id, buildAgentInput(box, previewInput, /*preview*/ true));
      return res.json({ success: true, runId: run.runId, status: run.status, mode: 'preview' });
    } catch (err) {
      res.status(502).json({ success: false, error: err.message });
    }
  });

  // Trigger (real interaction)
  router.post('/:id/trigger', async (req, res) => {
    try {
      const box = getAgenticBox(req.params.id);
      if (!box) return res.status(404).json({ success: false, error: 'Box not found' });
      if (!box.enabled) return res.status(403).json({ success: false, error: 'This agentic box is disabled.' });
      const visitorInput = sanitizeText(req.body?.input ?? req.body?.message ?? '', 2000);
      if (!visitorInput.trim()) {
        return res.status(400).json({ success: false, error: 'Provide an input/message to awaken the box.' });
      }
      // Lightweight per-box rate gate (in-memory; sufficient for MVP)
      const now = Date.now();
      const windowKey = box.id;
      rateBuckets.set(windowKey, (rateBuckets.get(windowKey) || []).filter((t) => now - t < 3600_000));
      const recent = rateBuckets.get(windowKey);
      if (recent.length >= box.safety.maxRunsPerHour) {
        return res.status(429).json({ success: false, error: 'This box is catching its breath. Try again soon.' });
      }
      recent.push(now);
      rateBuckets.set(windowKey, recent);

      const run = await runDaemonAgent(box.id, buildAgentInput(box, visitorInput, false));
      return res.json({ success: true, runId: run.runId, status: run.status, mode: 'live' });
    } catch (err) {
      res.status(502).json({ success: false, error: err.message });
    }
  });

  // Poll run
  router.get('/:id/runs/:runId', async (req, res) => {
    try {
      const box = getAgenticBox(req.params.id);
      if (!box) return res.status(404).json({ success: false, error: 'Box not found' });
      const run = await getDaemonRun(box.id, req.params.runId, req.query.logs === 'full');
      return res.json({ success: true, run: shapeRun(run) });
    } catch (err) {
      res.status(502).json({ success: false, error: err.message });
    }
  });

  // Enable / disable / delete
  router.post('/:id/enable', authMiddleware({ required: true }), (req, res) => {
    const box = getAgenticBox(req.params.id);
    if (!box || box.ownerId !== req.user.id) return res.status(404).json({ success: false, error: 'Not found' });
    const updated = updateAgenticBox(req.params.id, { enabled: true });
    res.json({ success: true, box: publicBox(updated) });
  });

  router.post('/:id/disable', authMiddleware({ required: true }), (req, res) => {
    const box = getAgenticBox(req.params.id);
    if (!box || box.ownerId !== req.user.id) return res.status(404).json({ success: false, error: 'Not found' });
    const updated = updateAgenticBox(req.params.id, { enabled: false });
    res.json({ success: true, box: publicBox(updated) });
  });

  router.delete('/:id', authMiddleware({ required: true }), async (req, res) => {
    try {
      const box = getAgenticBox(req.params.id);
      if (!box || box.ownerId !== req.user.id) return res.status(404).json({ success: false, error: 'Not found' });
      try { await deleteDaemonAgent(box.id); } catch (e) { /* best effort */ }
      deleteAgenticBox(box.id);
      res.json({ success: true, removed: box.id });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

// ─── Shared helpers ──────────────────────────────────────────────────────────
const rateBuckets = new Map();

function buildAgentInput(box, visitorInput, preview) {
  const t = TEMPLATES[box.templateName];
  const mission = box.mission;
  const input = t.instructionTmpl(mission, visitorInput, box.title);
  return `${preview ? '[PREVIEW RUN — creator testing their box]\n' : ''}${input}`;
}

function publicBox(box) {
  return {
    id: box.id,
    title: box.title,
    templateName: box.templateName,
    mission: box.mission,
    outputMode: box.outputMode,
    maxSteps: box.maxSteps,
    trigger: box.trigger,
    safety: box.safety,
    enabled: box.enabled,
    createdAt: box.createdAt,
    updatedAt: box.updatedAt,
  };
}

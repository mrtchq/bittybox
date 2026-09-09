import fs from 'fs';
import path from 'path';
import { createBittyLink } from './bitty-engine.js';
import { calculateBoxCreditCost } from './credit-costs.js';
import { deductCreditsEnforced, recordLinkCreation, requireCreditsAvailable } from './account-store.js';

const DATA_DIR = process.env.BITTYBOX_DATA_DIR || '/var/lib/bittybox';
const JOURNAL_FILE = path.join(DATA_DIR, 'ai-live-idempotency.json');

function readJournal() {
  try {
    const value = JSON.parse(fs.readFileSync(JOURNAL_FILE, 'utf8'));
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function writeJournal(journal) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temporary = `${JOURNAL_FILE}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(temporary, JSON.stringify(journal, null, 2), 'utf8');
  fs.renameSync(temporary, JOURNAL_FILE);
}

function requireProposal(proposal, ownerId) {
  if (!ownerId || !proposal || proposal.ownerId && proposal.ownerId !== ownerId) {
    const error = new Error('Proposal not found');
    error.code = 'PROPOSAL_NOT_FOUND';
    throw error;
  }
  if (proposal.status !== 'approved') {
    const error = new Error('Explicit approval is required before live creation');
    error.code = 'APPROVAL_REQUIRED';
    error.status = 409;
    throw error;
  }
}

function normalizeLockConfig(locks = {}) {
  const lockConfig = {};
  if (locks.expiresAt) {
    lockConfig.timeWindow = { enabled: true, notAfter: locks.expiresAt };
  }
  if (locks.maxOpens) {
    lockConfig.openLimit = { enabled: true, maxOpens: Math.max(1, Number(locks.maxOpens)) };
  }
  return lockConfig;
}

function proposalInput(proposal) {
  if (proposal.archetype === 'journey') {
    const error = new Error('Journey proposals are not enabled in the first live-creation slice');
    error.code = 'UNSUPPORTED_PROPOSAL';
    error.status = 422;
    throw error;
  }
  return {
    content: proposal.content,
    title: proposal.title,
    format: proposal.format,
    editable: Boolean(proposal.editable),
    lockConfig: normalizeLockConfig(proposal.locks),
  };
}

function getReplayStore(deps) {
  if (deps.replayStore) return deps.replayStore;
  return {
    get(key) { return readJournal()[key] || null; },
    set(key, value) {
      const journal = readJournal();
      journal[key] = value;
      writeJournal(journal);
    },
  };
}

export async function executeApprovedProposal({ ownerId, proposal, idempotencyKey, deps = {} } = {}) {
  requireProposal(proposal, ownerId);
  if (typeof idempotencyKey !== 'string' || !/^[A-Za-z0-9._:-]{8,200}$/.test(idempotencyKey)) {
    const error = new Error('A valid idempotency key is required');
    error.code = 'IDEMPOTENCY_KEY_REQUIRED';
    error.status = 400;
    throw error;
  }

  const replayStore = getReplayStore(deps);
  const replayKey = `${ownerId}:${idempotencyKey}`;
  const prior = await replayStore.get(replayKey);
  if (prior) return prior;

  const input = proposalInput(proposal);
  const calculateCost = deps.calculateCost || calculateBoxCreditCost;
  const cost = Math.max(0, Number(calculateCost(input)) || 0);
  const requireCredits = deps.requireCredits || requireCreditsAvailable;
  await requireCredits(ownerId, cost);

  const render = deps.render || createBittyLink;
  const result = await render(input);
  const debit = deps.debit || deductCreditsEnforced;
  await debit(ownerId, cost, 'ai', `AI Box: ${proposal.title || 'Bitty Box'} (${cost} CR)`);

  const record = deps.record || recordLinkCreation;
  const link = record(ownerId, { ...result, cost, aiProposalId: proposal.proposalId });
  const output = {
    success: true,
    proposalId: proposal.proposalId,
    idempotencyKey,
    cost,
    result,
    link,
  };
  await replayStore.set(replayKey, output);
  return output;
}

export function _testJournalPath() { return JOURNAL_FILE; }

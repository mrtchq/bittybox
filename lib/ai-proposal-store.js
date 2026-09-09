/**
 * Server-side draft proposals for the BittyBox conversational designer.
 *
 * Drafts are intentionally separate from live boxes. This store never charges
 * credits and never creates a public BittyBox URL.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { normalizeProposal, validateProposal } from './ai-action-registry.js';

const DATA_DIR = process.env.BITTYBOX_DATA_DIR || '/var/lib/bittybox';
const STORE_FILE = path.join(DATA_DIR, 'ai-proposals.json');

function id(prefix = 'draft_') {
  return prefix + crypto.randomBytes(9).toString('hex');
}

function now() { return new Date().toISOString(); }

function readStore() {
  try {
    const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    if (data && data.version === 1 && data.proposals && data.conversations) return data;
  } catch { /* initialize below */ }
  return { version: 1, proposals: {}, conversations: {} };
}

function writeStore(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temp = `${STORE_FILE}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(temp, STORE_FILE);
}

function requireOwner(record, ownerId) {
  if (!record || record.ownerId !== ownerId) {
    const error = new Error('Proposal not found');
    error.code = 'PROPOSAL_NOT_FOUND';
    throw error;
  }
  return record;
}

function requireConversation(store, ownerId, conversationId, create = false) {
  if (!ownerId || !conversationId) throw new Error('ownerId and conversationId are required');
  let record = store.conversations[conversationId];
  if (!record && create) {
    const timestamp = now();
    record = {
      conversationId,
      ownerId,
      answers: {},
      proposalIds: [],
      selectedProposalId: null,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.conversations[conversationId] = record;
  }
  if (!record || record.ownerId !== ownerId) {
    const error = new Error('Conversation not found');
    error.code = 'CONVERSATION_NOT_FOUND';
    throw error;
  }
  return record;
}

function publicConversation(record) {
  if (!record) return null;
  const { ownerId, ...safe } = record;
  return {
    ...safe,
    answers: { ...safe.answers },
    proposalIds: [...safe.proposalIds],
  };
}

export function saveAssessmentAnswer({ ownerId, conversationId, questionId, answer } = {}) {
  const question = typeof questionId === 'string' ? questionId.trim().slice(0, 100) : '';
  const value = typeof answer === 'string' ? answer.trim().slice(0, 4000) : '';
  if (!question || !value) throw new Error('questionId and answer are required');
  const store = readStore();
  const conversation = requireConversation(store, ownerId, conversationId, true);
  conversation.answers[question] = value;
  conversation.updatedAt = now();
  writeStore(store);
  return publicConversation(conversation);
}

export function getConversationState({ ownerId, conversationId } = {}) {
  return publicConversation(requireConversation(readStore(), ownerId, conversationId));
}

export function createProposals({ ownerId, conversationId, proposals = [] } = {}) {
  if (!ownerId || !conversationId) throw new Error('ownerId and conversationId are required');
  if (!Array.isArray(proposals) || proposals.length === 0 || proposals.length > 3) {
    throw new Error('between one and three proposals are required');
  }
  const store = readStore();
  const existing = Object.values(store.proposals).filter((item) => item.ownerId === ownerId && item.conversationId === conversationId && item.status === 'draft');
  if (existing.length + proposals.length > 3) throw new Error('a conversation may have at most three active proposals');

  const created = proposals.map((input) => {
    const proposal = normalizeProposal(input, id());
    const check = validateProposal(proposal);
    if (!check.valid) throw new Error(`invalid proposal: ${check.errors.join('; ')}`);
    const timestamp = now();
    const record = {
      ...proposal,
      ownerId,
      conversationId,
      status: 'draft',
      version: 1,
      history: [{ version: 1, proposal: { ...proposal }, updatedAt: timestamp }],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.proposals[proposal.proposalId] = record;
    return publicProposal(record);
  });
  const conversation = requireConversation(store, ownerId, conversationId, true);
  for (const proposal of created) {
    if (!conversation.proposalIds.includes(proposal.proposalId)) conversation.proposalIds.push(proposal.proposalId);
  }
  conversation.updatedAt = now();
  writeStore(store);
  return created;
}

export function getProposal({ ownerId, proposalId } = {}) {
  return publicProposal(requireOwner(readStore().proposals[proposalId], ownerId));
}

export function listProposals({ ownerId, conversationId } = {}) {
  return Object.values(readStore().proposals)
    .filter((item) => item.ownerId === ownerId && (!conversationId || item.conversationId === conversationId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(publicProposal);
}

export function modifyProposal({ ownerId, proposalId, changes = {} } = {}) {
  const store = readStore();
  const record = requireOwner(store.proposals[proposalId], ownerId);
  if (record.status !== 'draft') throw new Error('only draft proposals may be modified');
  const proposal = normalizeProposal({ ...record, ...changes, proposalId: record.proposalId }, record.proposalId);
  const check = validateProposal(proposal);
  if (!check.valid) throw new Error(`invalid proposal: ${check.errors.join('; ')}`);
  const timestamp = now();
  record.version += 1;
  Object.assign(record, proposal, { updatedAt: timestamp });
  record.history.push({ version: record.version, proposal: { ...proposal }, updatedAt: timestamp });
  writeStore(store);
  return publicProposal(record);
}

export function selectProposal({ ownerId, proposalId } = {}) {
  const store = readStore();
  const record = requireOwner(store.proposals[proposalId], ownerId);
  const timestamp = now();
  record.status = 'approved';
  record.updatedAt = timestamp;
  const conversation = requireConversation(store, ownerId, record.conversationId, true);
  conversation.selectedProposalId = record.proposalId;
  conversation.updatedAt = timestamp;
  writeStore(store);
  return publicProposal(record);
}

export function compareProposals({ ownerId, proposalIds = [] } = {}) {
  if (!Array.isArray(proposalIds) || proposalIds.length < 2 || proposalIds.length > 3) {
    throw new Error('compare requires two or three proposal IDs');
  }
  const proposals = proposalIds.map((proposalId) => requireOwner(readStore().proposals[proposalId], ownerId));
  return proposals.map((proposal) => ({
    proposalId: proposal.proposalId,
    title: proposal.title,
    archetype: proposal.archetype,
    format: proposal.format,
    editable: proposal.editable,
    pageCount: proposal.pages.length,
    passwordRequired: proposal.locks.passwordRequired,
    expiresAt: proposal.locks.expiresAt,
    maxOpens: proposal.locks.maxOpens,
    status: proposal.status,
  }));
}

/**
 * Estimate only. The authoritative create path must recalculate this server-side.
 */
export function estimateProposalCost({ ownerId, proposalId } = {}) {
  const proposal = requireOwner(readStore().proposals[proposalId], ownerId);
  const boxes = proposal.archetype === 'journey' && proposal.pages.length > 0 ? proposal.pages.length : 1;
  const lockCost = proposal.locks.passwordRequired ? 1 : 0;
  const expiryCost = proposal.locks.expiresAt ? 1 : 0;
  const openLimitCost = proposal.locks.maxOpens ? 1 : 0;
  return { proposalId, boxes, estimatedCredits: boxes + lockCost + expiryCost + openLimitCost, authoritative: false };
}

export function publicProposal(record) {
  if (!record) return null;
  const { ownerId, ...safe } = record;
  return safe;
}

export function _testStorePath() { return STORE_FILE; }

/**
 * BittyBox AI action registry and security contract.
 *
 * This module is intentionally framework-free. Text and Realtime adapters should
 * consume this registry, while the authoritative server functions execute actions.
 * The model never receives raw account records, credentials, or arbitrary user IDs.
 */

export const ACTION_IDS = Object.freeze({
  GET_ACCOUNT_CONTEXT: 'bittybox.account.context.get',
  GET_RECENT_BOXES: 'bittybox.account.boxes.list',
  GET_TEMPLATES: 'bittybox.templates.list',
  SAVE_ASSESSMENT_ANSWER: 'bittybox.assessment.answer.save',
  CREATE_PROPOSALS: 'bittybox.proposals.create',
  MODIFY_PROPOSAL: 'bittybox.proposal.modify',
  COMPARE_PROPOSALS: 'bittybox.proposals.compare',
  VALIDATE_PROPOSAL: 'bittybox.proposal.validate',
  ESTIMATE_COST: 'bittybox.proposal.cost.estimate',
  CREATE_FROM_PROPOSAL: 'bittybox.box.create_from_proposal',
});

const MAX = Object.freeze({
  title: 200,
  description: 2000,
  purpose: 4000,
  answer: 4000,
  content: 1000000,
  proposals: 3,
});

export const PROPOSAL_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  properties: {
    proposalId: { type: 'string', minLength: 1, maxLength: 100 },
    title: { type: 'string', minLength: 1, maxLength: MAX.title },
    purpose: { type: 'string', minLength: 1, maxLength: MAX.purpose },
    archetype: { type: 'string', enum: ['share', 'interactive', 'journey'] },
    content: { type: 'string', maxLength: MAX.content },
    format: { type: 'string', enum: ['html', 'markdown', 'code', 'json', 'svg'] },
    editable: { type: 'boolean' },
    locks: {
      type: 'object',
      additionalProperties: false,
      properties: {
        passwordRequired: { type: 'boolean' },
        expiresAt: { type: ['string', 'null'] },
        maxOpens: { type: ['integer', 'null'], minimum: 1, maximum: 1000000 },
      },
      required: ['passwordRequired', 'expiresAt', 'maxOpens'],
    },
    pages: {
      type: 'array',
      maxItems: 12,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string', minLength: 1, maxLength: MAX.title },
          content: { type: 'string', maxLength: MAX.content },
          format: { type: 'string', enum: ['html', 'markdown', 'code', 'json', 'svg'] },
        },
        required: ['title', 'content', 'format'],
      },
    },
  },
  required: ['proposalId', 'title', 'purpose', 'archetype', 'content', 'format', 'editable', 'locks', 'pages'],
});

const ACTIONS = Object.freeze([
  { id: ACTION_IDS.GET_ACCOUNT_CONTEXT, description: 'Read minimized context for the authenticated BittyBox account.', sideEffect: false, approval: 'none' },
  { id: ACTION_IDS.GET_RECENT_BOXES, description: 'List the authenticated user\'s recent boxes without private payload contents.', sideEffect: false, approval: 'none' },
  { id: ACTION_IDS.GET_TEMPLATES, description: 'List curated BittyBox proposal archetypes and capabilities.', sideEffect: false, approval: 'none' },
  { id: ACTION_IDS.SAVE_ASSESSMENT_ANSWER, description: 'Persist one needs-assessment answer for the authenticated conversation.', sideEffect: true, approval: 'none' },
  { id: ACTION_IDS.CREATE_PROPOSALS, description: 'Create up to three non-live draft proposals.', sideEffect: true, approval: 'none' },
  { id: ACTION_IDS.MODIFY_PROPOSAL, description: 'Modify a non-live draft proposal.', sideEffect: true, approval: 'none' },
  { id: ACTION_IDS.COMPARE_PROPOSALS, description: 'Compare draft proposals owned by the authenticated conversation.', sideEffect: false, approval: 'none' },
  { id: ACTION_IDS.VALIDATE_PROPOSAL, description: 'Validate a draft proposal against the BittyBox allowlist.', sideEffect: false, approval: 'none' },
  { id: ACTION_IDS.ESTIMATE_COST, description: 'Estimate credits for a draft proposal without charging.', sideEffect: false, approval: 'none' },
  { id: ACTION_IDS.CREATE_FROM_PROPOSAL, description: 'Create a live Bitty Box from an approved draft and charge credits.', sideEffect: true, approval: 'explicit_user_confirmation' },
]);

export const ACTION_REGISTRY = Object.freeze(ACTIONS.reduce((map, action) => {
  map[action.id] = Object.freeze({ ...action });
  return map;
}, {}));

function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function safeBool(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function safeNullableString(value) {
  if (value === null || value === undefined || value === '') return null;
  return typeof value === 'string' ? value.slice(0, 100) : null;
}

function safeMaxOpens(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 1000000) return null;
  return n;
}

export function listActions() {
  return ACTIONS.map((action) => ({ ...action }));
}

/**
 * Construct the only account shape that may be sent to a model.
 * Identity is always supplied by the verified request, never tool arguments.
 */
export function buildAccountContext(user, { recentBoxes = [], templates = [] } = {}) {
  if (!user || typeof user.id !== 'string' || !user.id) {
    throw new Error('A verified authenticated user is required');
  }
  return {
    account: {
      displayName: text(user.displayName, 120) || 'BittyBox user',
      tier: text(user.tier, 80) || 'standard',
      creditsAvailable: Number.isFinite(Number(user.credits)) ? Math.max(0, Number(user.credits)) : 0,
      recentBoxCount: Array.isArray(user.links) ? user.links.length : 0,
    },
    capabilities: {
      canCreateBoxes: true,
      canCreateChains: true,
      canUseAdvancedLocks: true,
    },
    recentBoxes: Array.isArray(recentBoxes) ? recentBoxes.slice(0, 10).map((box) => ({
      id: text(box?.id, 100),
      title: text(box?.title, MAX.title),
      format: text(box?.format || box?.metadata?.format, 30),
      createdAt: text(box?.createdAt, 40),
    })) : [],
    templates: Array.isArray(templates) ? templates.slice(0, 20).map((template) => ({
      id: text(template?.id || template?.name, 80),
      label: text(template?.label || template?.name, MAX.title),
      description: text(template?.description || template?.blurb, MAX.description),
    })) : [],
  };
}

export function normalizeProposal(input = {}, proposalId = '') {
  const pages = Array.isArray(input.pages) ? input.pages.slice(0, 12).map((page) => ({
    title: text(page?.title, MAX.title),
    content: typeof page?.content === 'string' ? page.content.slice(0, MAX.content) : '',
    format: ['html', 'markdown', 'code', 'json', 'svg'].includes(page?.format) ? page.format : 'markdown',
  })) : [];
  return {
    proposalId: text(input.proposalId || proposalId, 100),
    title: text(input.title, MAX.title),
    purpose: text(input.purpose, MAX.purpose),
    archetype: ['share', 'interactive', 'journey'].includes(input.archetype) ? input.archetype : 'share',
    content: typeof input.content === 'string' ? input.content.slice(0, MAX.content) : '',
    format: ['html', 'markdown', 'code', 'json', 'svg'].includes(input.format) ? input.format : 'markdown',
    editable: safeBool(input.editable),
    locks: {
      passwordRequired: safeBool(input.locks?.passwordRequired),
      expiresAt: safeNullableString(input.locks?.expiresAt),
      maxOpens: safeMaxOpens(input.locks?.maxOpens),
    },
    pages,
    status: 'draft',
  };
}

export function validateProposal(proposal) {
  const errors = [];
  if (!proposal || typeof proposal !== 'object') return { valid: false, errors: ['proposal must be an object'] };
  if (!text(proposal.proposalId, 100)) errors.push('proposalId is required');
  if (!text(proposal.title, MAX.title)) errors.push('title is required');
  if (!text(proposal.purpose, MAX.purpose)) errors.push('purpose is required');
  if (!['share', 'interactive', 'journey'].includes(proposal.archetype)) errors.push('archetype is invalid');
  if (!['html', 'markdown', 'code', 'json', 'svg'].includes(proposal.format)) errors.push('format is invalid');
  if (typeof proposal.content !== 'string' || proposal.content.length > MAX.content) errors.push('content is invalid');
  if (typeof proposal.editable !== 'boolean') errors.push('editable must be boolean');
  if (!proposal.locks || typeof proposal.locks !== 'object') errors.push('locks are required');
  if (!Array.isArray(proposal.pages) || proposal.pages.length > 12) errors.push('pages must be an array of at most 12 items');
  for (const [index, page] of (proposal.pages || []).entries()) {
    if (!text(page?.title, MAX.title)) errors.push(`pages[${index}].title is required`);
    if (typeof page?.content !== 'string' || page.content.length > MAX.content) errors.push(`pages[${index}].content is invalid`);
  }
  return { valid: errors.length === 0, errors };
}

export function createAuditEnvelope({ actionId, user, conversationId, parameters = {}, status = 'requested', error = null } = {}) {
  const action = ACTION_REGISTRY[actionId];
  if (!action) throw new Error(`Unknown BittyBox action: ${actionId}`);
  if (!user?.id) throw new Error('Verified user is required for audit');
  return {
    actionId,
    conversationId: text(conversationId, 120) || null,
    accountId: user.id,
    parameters: sanitizeAuditParameters(parameters),
    status,
    error: error ? text(error, 500) : null,
    createdAt: new Date().toISOString(),
  };
}

function sanitizeAuditParameters(parameters) {
  const clone = JSON.parse(JSON.stringify(parameters || {}));
  const secretKeys = new Set(['password', 'secret', 'token', 'apiKey', 'authorization', 'content']);
  const scrub = (value) => {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(scrub);
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, secretKeys.has(key) ? '[REDACTED]' : scrub(entry)]));
  };
  return scrub(clone);
}

export function requiresExplicitApproval(actionId) {
  return ACTION_REGISTRY[actionId]?.approval === 'explicit_user_confirmation';
}

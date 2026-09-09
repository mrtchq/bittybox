/**
 * BittyBox text conversation adapter for OpenAI Responses API.
 *
 * The adapter owns model/tool orchestration only. Identity and side effects stay
 * in the authenticated Express request and the proposal store.
 */
import OpenAI from 'openai';
import crypto from 'crypto';
import {
  ACTION_IDS,
  PROPOSAL_SCHEMA,
  ACTION_REGISTRY,
  buildAccountContext,
  validateProposal,
  createAuditEnvelope,
} from './ai-action-registry.js';
import {
  createProposals,
  saveAssessmentAnswer,
  getConversationState,
  getProposal,
  listProposals,
  modifyProposal,
  compareProposals,
  estimateProposalCost,
} from './ai-proposal-store.js';

const MODEL = process.env.BITTYBOX_AI_MODEL || 'gpt-4o-mini';
const MAX_TOOL_ROUNDS = 4;
const MAX_MESSAGE = 12000;

const TEMPLATES = [
  { id: 'share', label: 'Share Box', description: 'Private notes, briefs, documents, and client updates.' },
  { id: 'interactive', label: 'Interactive Box', description: 'Forms, calculators, mini-tools, and interactive HTML.' },
  { id: 'journey', label: 'Journey Box', description: 'A sequence of pages for onboarding, presentation, or workflow.' },
];

const TOOL_DEFINITIONS = Object.freeze([
  fn(ACTION_IDS.GET_ACCOUNT_CONTEXT, 'Read the authenticated account context.', {
    type: 'object', additionalProperties: false, properties: {}, required: [],
  }),
  fn(ACTION_IDS.GET_RECENT_BOXES, 'List recent boxes without private payload contents.', {
    type: 'object', additionalProperties: false, properties: {}, required: [],
  }),
  fn(ACTION_IDS.GET_TEMPLATES, 'List the available BittyBox proposal archetypes.', {
    type: 'object', additionalProperties: false, properties: {}, required: [],
  }),
  fn(ACTION_IDS.SAVE_ASSESSMENT_ANSWER, 'Save one needs-assessment answer for this conversation.', {
    type: 'object', additionalProperties: false,
    properties: {
      questionId: { type: 'string', minLength: 1, maxLength: 100 },
      answer: { type: 'string', minLength: 1, maxLength: 4000 },
    },
    required: ['questionId', 'answer'],
  }),
  fn(ACTION_IDS.CREATE_PROPOSALS, 'Create one to three non-live draft proposals. Never creates a live box.', {
    type: 'object', additionalProperties: false,
    properties: { proposals: { type: 'array', minItems: 1, maxItems: 3, items: PROPOSAL_SCHEMA } },
    required: ['proposals'],
  }),
  fn(ACTION_IDS.MODIFY_PROPOSAL, 'Modify one non-live draft proposal.', {
    type: 'object', additionalProperties: false,
    properties: { proposalId: { type: 'string' }, changes: { type: 'object', additionalProperties: true } },
    required: ['proposalId', 'changes'],
  }),
  fn(ACTION_IDS.COMPARE_PROPOSALS, 'Compare two or three draft proposals.', {
    type: 'object', additionalProperties: false,
    properties: { proposalIds: { type: 'array', minItems: 2, maxItems: 3, items: { type: 'string' } } },
    required: ['proposalIds'],
  }),
  fn(ACTION_IDS.VALIDATE_PROPOSAL, 'Validate a draft proposal.', {
    type: 'object', additionalProperties: false,
    properties: { proposalId: { type: 'string' } }, required: ['proposalId'],
  }),
  fn(ACTION_IDS.ESTIMATE_COST, 'Estimate credits for a draft proposal without charging.', {
    type: 'object', additionalProperties: false,
    properties: { proposalId: { type: 'string' } }, required: ['proposalId'],
  }),
]);

function fn(name, description, parameters) {
  return { type: 'function', name, description, strict: true, parameters };
}

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function conversationId(value) {
  if (typeof value === 'string' && /^[a-zA-Z0-9_-]{1,120}$/.test(value)) return value;
  return `conv_${crypto.randomBytes(9).toString('hex')}`;
}

function safeMessage(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, MAX_MESSAGE);
}

function systemInstructions(accountContext) {
  return [
    'You are the BittyBox conversational designer.',
    'Help the authenticated user describe what they need, ask short easy questions, and propose up to three draft configurations.',
    'Use tools for account context and proposal operations. Never invent account balances or box IDs.',
    'Draft proposals are not live boxes. Never claim a box was created from a draft.',
    'Do not request passwords, API keys, payment details, or authentication tokens in chat.',
    'A live creation action is not available in this phase; tell the user approval and final creation will come next.',
    'Prefer practical language and explain differences between options briefly.',
    `Authenticated account context: ${JSON.stringify(accountContext)}`,
  ].join('\n');
}

function toolOutput(value) {
  return JSON.stringify(value);
}

function errorResult(error) {
  return { success: false, error: error?.message || 'Tool failed', code: error?.code || 'AI_TOOL_ERROR' };
}

export function getTextAgentTools() {
  return TOOL_DEFINITIONS.map((tool) => ({ ...tool }));
}

export async function runTextConversation({ user, message, conversationId: requestedConversationId, client = getClient() } = {}) {
  if (!user?.id) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }
  const text = safeMessage(message);
  if (!text) {
    const error = new Error('message is required');
    error.status = 400;
    throw error;
  }
  if (!client) {
    const error = new Error('BittyBox AI is not configured on the server');
    error.status = 503;
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }

  const convId = conversationId(requestedConversationId);
  const accountContext = buildAccountContext(user, { recentBoxes: user.links || [], templates: TEMPLATES });
  const input = [{ role: 'user', content: text }];
  const audits = [];
  let response;

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    response = await client.responses.create({
      model: MODEL,
      instructions: systemInstructions(accountContext),
      input,
      tools: TOOL_DEFINITIONS,
      parallel_tool_calls: false,
      max_output_tokens: 1200,
    });

    const calls = (response.output || []).filter((item) => item.type === 'function_call');
    if (!calls.length) break;
    if (round === MAX_TOOL_ROUNDS) {
      throw new Error('AI tool loop exceeded safety limit');
    }

    input.push(...(response.output || []));
    for (const call of calls) {
      const result = await executeTextAgentTool(call.name, JSON.parse(call.arguments || '{}'), { user, conversationId: convId });
      audits.push(createAuditEnvelope({
        actionId: call.name,
        user,
        conversationId: convId,
        parameters: call.name === ACTION_IDS.CREATE_PROPOSALS ? { proposalCount: result?.proposals?.length || 0 } : call.arguments,
        status: result?.success === false ? 'failed' : 'succeeded',
        error: result?.success === false ? result.error : null,
      }));
      input.push({ type: 'function_call_output', call_id: call.call_id, output: toolOutput(result) });
    }
  }

  return {
    conversationId: convId,
    message: response?.output_text || '',
    proposals: listProposals({ ownerId: user.id, conversationId: convId }),
    audits,
    model: MODEL,
  };
}

export async function executeTextAgentTool(name, args, { user, conversationId: convId }) {
  try {
    switch (name) {
      case ACTION_IDS.GET_ACCOUNT_CONTEXT:
        return { success: true, context: buildAccountContext(user, { recentBoxes: user.links || [], templates: TEMPLATES }) };
      case ACTION_IDS.GET_RECENT_BOXES:
        return { success: true, boxes: buildAccountContext(user, { recentBoxes: user.links || [] }).recentBoxes };
      case ACTION_IDS.GET_TEMPLATES:
        return { success: true, templates: TEMPLATES };
      case ACTION_IDS.SAVE_ASSESSMENT_ANSWER:
        return { success: true, state: saveAssessmentAnswer({ ownerId: user.id, conversationId: convId, questionId: args.questionId, answer: args.answer }) };
      case ACTION_IDS.CREATE_PROPOSALS:
        return { success: true, proposals: createProposals({ ownerId: user.id, conversationId: convId, proposals: args.proposals }) };
      case ACTION_IDS.MODIFY_PROPOSAL:
        return { success: true, proposal: modifyProposal({ ownerId: user.id, proposalId: args.proposalId, changes: args.changes }) };
      case ACTION_IDS.COMPARE_PROPOSALS:
        return { success: true, comparison: compareProposals({ ownerId: user.id, proposalIds: args.proposalIds }) };
      case ACTION_IDS.VALIDATE_PROPOSAL: {
        const proposal = getProposal({ ownerId: user.id, proposalId: args.proposalId });
        return { success: true, proposalId: args.proposalId, ...validateProposal(proposal) };
      }
      case ACTION_IDS.ESTIMATE_COST:
        return { success: true, estimate: estimateProposalCost({ ownerId: user.id, proposalId: args.proposalId }) };
      default:
        return { success: false, error: `Tool is not enabled: ${name}`, code: 'TOOL_NOT_ENABLED' };
    }
  } catch (error) {
    return errorResult(error);
  }
}

export function actionRegistryHealth() {
  return { enabledToolCount: TOOL_DEFINITIONS.length, totalRegisteredActions: Object.keys(ACTION_REGISTRY).length, model: MODEL };
}

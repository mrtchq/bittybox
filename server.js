import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createBittyLink, createBittyChain, decodeBittyLink, detectFormat } from './lib/bitty-engine.js';
import { handleMcpHttpRequest } from './mcp/http-transport.js';
import { renderApiDocsPage } from './lib/api-docs-page.js';
import { getAgentDiscovery, renderAgentsPage } from './lib/agents-page.js';
import {
  getDefaultUser,
  getOrCreateUser,
  registerUser,
  authenticateUser,
  getUser,
  getUserByEmail,
  createSession,
  destroySession,
  getSession,
  updateSessionTrust,
  createApiKey,
  revokeApiKey,
  validateApiKey,
  recordLinkCreation,
  deleteUserLink,
  purchaseCredits,
  deductCreditsEnforced,
  requireCreditsAvailable,
  createMagicToken,
  verifyMagicToken,
  sanitizeUser,
  syncUserCreditsWithCreem,
  getUserCreemEntries
} from './lib/account-store.js';
import { calculateBoxCreditCost, calculateChainCreditCost, calculateRecordedLinkCreditCost } from './lib/credit-costs.js';
import { sendMagicLinkEmail } from './lib/resend-client.js';
import { triggerN8nWebhook } from './lib/n8n-client.js';
import { authMiddleware } from './lib/auth-middleware.js';
import firebaseAdmin from './lib/firebase-admin.cjs';
const { verifyFirebaseIdToken } = firebaseAdmin;
import { createAgenticBoxRouter } from './lib/agentic-boxes.js';
import { handleVoiceAssistantAsk, handleVoiceToken, handleVoiceCall, voiceAvailable } from './lib/voice-ai.js';
import http from 'http';
import { createBox, getBox, listBoxes, updateLockConfig, incrementOpensUsed, publishBox, unpublishBox, deleteBox, setPasswordLock, setTimeWindowLock, setAccessLimitLock, setSessionLimitLock, setInviteOnlyLock, createTimeWindow, createOpenLimit, createSessionOpenLimit, createInviteOnly, evaluateAndRecord, touchSessionOpens, getSessionOpenCount, createChainedBoxes } from './lib/box-store.js';
import { attachChainMeta } from './lib/chain.js';
import { evaluatePolicy, createSessionGrant, verifySessionGrant, verifyPassword, createPasswordVerifier } from './lib/policy-evaluator.js';
import { runTextConversation, executeTextAgentTool, actionRegistryHealth } from './lib/ai-conversation.js';
import { getProposal, selectProposal, saveAssessmentAnswer, getConversationState } from './lib/ai-proposal-store.js';
import { executeApprovedProposal } from './lib/ai-live-executor.js';
import { appendAiAudit } from './lib/ai-audit-store.js';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DIST_DIR = path.join(__dirname, 'dist');

// Disable x-powered-by header
app.disable('x-powered-by');

// CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-API-Key, X-Session-Id, Mcp-Session-Id, MCP-Protocol-Version');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Body parsing
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(express.text({ limit: '15mb', type: ['text/plain', 'text/html', 'text/markdown', 'application/sdp'] }));

// Optional authentication extraction on all routes
app.use(authMiddleware({ required: false }));

// ==========================================
// Model Context Protocol (MCP) Endpoints
// ==========================================
app.all('/mcp', handleMcpHttpRequest);
app.all('/api/mcp', handleMcpHttpRequest);

// ==========================================
// Health Check Endpoints
// ==========================================
// -------------------------------------------------------------
// VOICE AI — Gemini search-grounded Q&A (REST)
// -------------------------------------------------------------
app.post('/api/voice-assistant/ask', handleVoiceAssistantAsk);
app.post('/api/voice-token', authMiddleware({ required: true }), handleVoiceToken);
app.post('/api/voice-call', authMiddleware({ required: true }), handleVoiceCall);

// Surface voice availability in health check
app.get(['/api/health', '/api/bitty/health'], (_req, res) => {
  const base = res.locals?.health || {};
  res.json({
    ...base,
    status: 'ok',
    voiceAvailable: voiceAvailable(),
    liveModel: 'gemini-2.0-flash-live-001',
    searchModel: 'gemini-2.5-flash',
    bittyboxAi: actionRegistryHealth(),
  });
});

// ==========================================
// BittyBox Conversational Designer (text MVP)
// ==========================================
app.post('/api/box-assistant/message', authMiddleware({ required: true }), async (req, res) => {
  try {
    const result = await runTextConversation({
      user: req.user,
      message: req.body?.message,
      conversationId: req.body?.conversationId,
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    const status = err.status || (err.code === 'AI_NOT_CONFIGURED' ? 503 : 500);
    return res.status(status).json({ success: false, error: err.message, code: err.code });
  }
});

app.get('/api/box-assistant/conversations/:conversationId', authMiddleware({ required: true }), (req, res) => {
  try {
    return res.json({ success: true, state: getConversationState({ ownerId: req.user.id, conversationId: req.params.conversationId }) });
  } catch (err) {
    return res.status(err.code === 'CONVERSATION_NOT_FOUND' ? 404 : 400)
      .json({ success: false, error: err.message, code: err.code });
  }
});

app.post('/api/box-assistant/conversations/:conversationId/answers', authMiddleware({ required: true }), (req, res) => {
  try {
    const state = saveAssessmentAnswer({
      ownerId: req.user.id,
      conversationId: req.params.conversationId,
      questionId: req.body?.questionId,
      answer: req.body?.answer,
    });
    return res.json({ success: true, state });
  } catch (err) {
    return res.status(err.code === 'CONVERSATION_NOT_FOUND' ? 404 : 400)
      .json({ success: false, error: err.message, code: err.code });
  }
});

app.post('/api/box-assistant/voice-action', authMiddleware({ required: true }), async (req, res) => {
  try {
    const actionId = req.body?.actionId;
    if (actionId === 'bittybox.box.create_from_proposal') {
      return res.status(409).json({
        success: false,
        code: 'EXPLICIT_APPROVAL_REQUIRED',
        error: 'Live creation requires explicit user confirmation and the approved proposal creation endpoint.',
      });
    }
    const conversationId = typeof req.body?.conversationId === 'string' ? req.body.conversationId : 'voice-session';
    const result = await executeTextAgentTool(actionId, req.body?.arguments || {}, { user: req.user, conversationId });
    const audit = appendAiAudit({
      actionId,
      user: req.user,
      conversationId,
      parameters: req.body?.arguments || {},
      status: result?.success === false ? 'failed' : 'succeeded',
      error: result?.success === false ? result.error : null,
    });
    return res.status(result?.success === false ? 400 : 200).json({ ...result, audit });
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, error: err.message, code: err.code });
  }
});

// Human approval is a separate, non-charging boundary.
app.post('/api/box-assistant/proposals/:proposalId/approve', authMiddleware({ required: true }), (req, res) => {
  try {
    const before = getProposal({ ownerId: req.user.id, proposalId: req.params.proposalId });
    const proposal = selectProposal({ ownerId: req.user.id, proposalId: req.params.proposalId });
    const audit = appendAiAudit({
      actionId: 'bittybox.box.create_from_proposal',
      user: req.user,
      conversationId: before.conversationId,
      parameters: { proposalId: proposal.proposalId },
      status: 'approved',
      before: { status: before.status, version: before.version },
      after: { status: proposal.status, version: proposal.version },
    });
    return res.json({ success: true, proposal, audit });
  } catch (err) {
    return res.status(err.status || (err.code === 'PROPOSAL_NOT_FOUND' ? 404 : 400))
      .json({ success: false, error: err.message, code: err.code });
  }
});

// Live creation is never model-triggered: the caller must provide approval and replay protection.
app.post('/api/box-assistant/proposals/:proposalId/create', authMiddleware({ required: true }), async (req, res) => {
  try {
    const proposal = getProposal({ ownerId: req.user.id, proposalId: req.params.proposalId });
    const idempotencyKey = req.get('Idempotency-Key') || req.body?.idempotencyKey;
    const result = await executeApprovedProposal({ ownerId: req.user.id, proposal, idempotencyKey });
    const audit = appendAiAudit({
      actionId: 'bittybox.box.create_from_proposal',
      user: req.user,
      conversationId: proposal.conversationId,
      parameters: { proposalId: proposal.proposalId, idempotencyKey },
      status: result?.success ? 'completed' : 'replayed',
      before: { status: proposal.status, version: proposal.version },
      after: { result: { success: result?.success, replay: Boolean(result?.replay) } },
    });
    return res.json({ ...result, audit });
  } catch (err) {
    if (sendCreditFailure(res, err)) return;
    return res.status(err.status || (err.code === 'PROPOSAL_NOT_FOUND' ? 404 : 400))
      .json({ success: false, error: err.message, code: err.code });
  }
});

// (legacy health handler below preserved)
app.get('/api/health/legacy', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'bittybox',
    version: '2.0.0',
    app: 'bittybox-spa-production',
    mcpEndpoint: '/mcp',
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// Interactive API, MCP & Agent Documentation
// ==========================================
app.get(['/api/docs', '/api/bitty/docs'], (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderApiDocsPage());
});

function sendCreditFailure(res, err) {
  if (err?.code !== 'INSUFFICIENT_CREDITS') return false;
  res.status(err.status || 402).json({
    success: false,
    error: err.message,
    code: err.code,
    creditsRequired: err.creditsRequired,
    creditsAvailable: err.creditsAvailable,
  });
  return true;
}

app.get(['/agents', '/agents/'], (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send(renderAgentsPage());
});

app.get(['/agents.json', '/.well-known/bittybox-agent.json', '/api/agent/capabilities'], (_req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json(getAgentDiscovery());
});

// ==========================================
// Accounts, Auth, Keys & Credits Endpoints
// ==========================================
app.get('/api/accounts/me', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated. Provide X-Session-Id header.' });
    }
    await syncUserCreditsWithCreem(req.user);
    const session = req.sessionId ? getSession(req.sessionId) : null;
    res.json({ success: true, user: sanitizeUser(req.user), trusted: session ? Boolean(session.trusted) : Boolean(req.user.settings?.trustThisDevice), sessionExpiresAt: session ? session.expiresAt : req.user.settings?.deviceTrustExpiresAt });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/accounts/register', async (req, res) => {
  try {
    const { email, displayName, password, trustDevice } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const user = await registerUser(email, displayName, password);
    const isTrusted = trustDevice !== false;
    const durationHours = isTrusted ? 720 : 24;
    const sessionId = createSession(user.id, durationHours);
    if (user) {
      if (!user.settings) user.settings = {};
      user.settings.trustThisDevice = isTrusted;
      user.settings.deviceTrustExpiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    }
    res.json({ success: true, user: sanitizeUser(user), sessionId, trusted: isTrusted, expiresAt: user?.settings?.deviceTrustExpiresAt });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.post('/api/accounts/trust-device', (req, res) => {
  try {
    if (!req.user || !req.sessionId) {
      return res.status(401).json({ success: false, error: 'Authentication required. Provide X-Session-Id header.' });
    }
    const { trusted, durationDays } = req.body || {};
    const isTrusted = trusted !== false;
    const result = updateSessionTrust(req.sessionId, isTrusted, durationDays || 30);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Active session not found' });
    }
    res.json({
      success: true,
      trusted: result.trusted,
      expiresAt: result.expiresAt,
      user: result.user
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/accounts/login', async (req, res) => {
  try {
    const { email, displayName, password, trustDevice } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const user = await authenticateUser(email, password || '');
    if (displayName && (!user.displayName || user.displayName === 'Builder')) {
      user.displayName = displayName.trim();
    }
    const isTrusted = trustDevice !== false;
    const durationHours = isTrusted ? 720 : 24;
    const sessionId = createSession(user.id, durationHours);
    if (user) {
      if (!user.settings) user.settings = {};
      user.settings.trustThisDevice = isTrusted;
      user.settings.deviceTrustExpiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    }
    res.json({ success: true, user: sanitizeUser(user), sessionId, trusted: isTrusted, expiresAt: user?.settings?.deviceTrustExpiresAt });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/accounts/magic/request', async (req, res) => {
  try {
    const { email, displayName, trustDevice } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    const magic = createMagicToken(email, displayName, trustDevice !== false);

    // Construct magic link
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'bittybox.org';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${proto}://${host}`;
    const magicLink = `${baseUrl}/#/auth/verify?token=${magic.token}`;

    // Send email via Resend
    const emailResult = await sendMagicLinkEmail({
      to: magic.email,
      displayName: displayName || '',
      magicLink,
    });

    // Notify n8n instance via webhook in background
    triggerN8nWebhook('/webhook/bittybox-magic-link', {
      event: 'account.magic_link_requested',
      email: magic.email,
      displayName: displayName || '',
      token: magic.token,
      magicLink,
      expiresAt: magic.expiresAt,
      timestamp: new Date().toISOString()
    }).catch(err => {
      console.warn('[n8n] magic-link webhook notification:', err.message);
    });

    if (!emailResult.success) {
      console.error('[resend] Email send failed:', emailResult.error);
      return res.status(500).json({
        success: false,
        error: `Failed to deliver magic link email: ${emailResult.error}`
      });
    }

    res.json({
      success: true,
      message: 'Magic link dispatched to your email address.',
      email: magic.email,
      expiresAt: magic.expiresAt
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/accounts/magic/verify', async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'Magic link token is required.' });
    }

    const result = await verifyMagicToken(token);

    // Notify n8n instance in background
    triggerN8nWebhook('/webhook/bittybox-magic-link', {
      event: 'account.magic_link_verified',
      userId: result.user.id,
      email: result.user.email,
      displayName: result.user.displayName,
      timestamp: new Date().toISOString()
    }).catch(() => {});

    res.json({
      success: true,
      user: result.user,
      sessionId: result.sessionId,
      message: 'Successfully authenticated via magic link.'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/accounts/logout', (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.body?.sessionId;
    if (sessionId) {
      destroySession(sessionId);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/accounts/links', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required to save box to account' });
    }
    const linkData = req.body || {};
    const cost = calculateRecordedLinkCreditCost(linkData);
    if (cost > 0) {
      const desc = linkData.format === 'chain'
        ? `Generated Box Chain: ${linkData.title || 'Chained Bitty Box'} (${cost} CR)`
        : `Generated Box: ${linkData.title || 'Bitty Box'} (${cost} CR)`;
      await deductCreditsEnforced(user.id, cost, 'human', desc);
    }
    recordLinkCreation(user.id, { ...linkData, cost });
    res.json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    if (sendCreditFailure(res, err)) return;
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/accounts/links/:id', (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const linkId = req.params.id;
    const deleted = deleteUserLink(user.id, linkId);
    res.json({ success: deleted, linkId, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/accounts/keys', (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required to generate API key' });
    }
    const { label, scopes } = req.body || {};
    const key = createApiKey(user.id, label, scopes);
    res.json({ success: true, key, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/accounts/keys/:id', (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const keyId = req.params.id;
    const revoked = revokeApiKey(user.id, keyId);
    res.json({ success: revoked, keyId, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/accounts/keys/test', (req, res) => {
  try {
    const { key } = req.body || {};
    const validation = validateApiKey(key);
    if (validation.valid) {
      res.json({
        success: true,
        valid: true,
        user: {
          id: validation.user.id,
          displayName: validation.user.displayName,
          email: validation.user.email,
          tier: validation.user.tier,
          credits: validation.user.credits
        },
        key: {
          id: validation.keyMeta.id,
          label: validation.keyMeta.label,
          prefix: validation.keyMeta.prefix,
          scopes: validation.keyMeta.scopes,
          requestCount: validation.keyMeta.requestCount
        }
      });
    } else {
      res.json({
        success: true,
        valid: false,
        error: validation.error || 'Invalid API key'
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/accounts/credits/purchase', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required to purchase credits' });
    }
    const { packageId, amount, costCents } = req.body || {};
    let creditsToAdd = 50;
    let cost = costCents || 500;

    if (packageId === 'pack_50' || packageId === 'starter' || amount === 50) {
      creditsToAdd = 50;
      cost = 500; // $5.00
    } else if (packageId === 'pack_150' || packageId === 'creator' || amount === 150) {
      creditsToAdd = 150;
      cost = 1200; // $12.00
    } else if (packageId === 'pack_400' || packageId === 'pro' || amount === 400) {
      creditsToAdd = 400;
      cost = 2500; // $25.00
    } else if (amount) {
      creditsToAdd = parseInt(amount, 10) || 50;
    }

    const result = await purchaseCredits(user.id, packageId, creditsToAdd, cost);
    res.json({ success: true, ...result, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/accounts/credits/ledger', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required to view credit ledger' });
    }
    const entries = await getUserCreemEntries(user.id);
    res.json({
      success: true,
      creditAccountId: user.creemCreditAccountId,
      balance: user.credits,
      entries
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// Sync Firebase user's Firestore balance FROM Creem CCA (source of truth)
// Firebase users: webhook grants land in Creem CCA, not Firestore. This
// endpoint returns the authoritative CCA balance so the client can mirror it.
// Firebase users have no server session, so they send their Firebase ID
// token (verified server-side) to prove identity. We trust ONLY the verified
// email, never a client-supplied one.
// ==========================================
app.get('/api/accounts/credits/sync-from-creem', async (req, res) => {
  try {
    let email = req.user?.email || null;

    // Verify Firebase ID token if provided (Firebase users have no session).
    const authHeader = req.headers['authorization'] || req.headers['x-firebase-token'];
    const idToken = authHeader ? String(authHeader).replace(/^Bearer\s+/i, '') : null;
    if (!email && idToken) {
      const decoded = await verifyFirebaseIdToken(idToken);
      if (decoded && decoded.email) {
        email = decoded.email;
      } else {
        return res.status(401).json({ success: false, error: 'Invalid Firebase ID token' });
      }
    }

    if (!email) {
      return res.status(401).json({ success: false, error: 'Authentication required to sync credits' });
    }

    // Ensure Creem customer + credit account linkage exists (autolink by email).
    const { customerId, creditAccountId } = await ensureUserCreemCreditAccount({
      email,
      displayName: (req.user?.displayName) || email.split('@')[0]
    }) || {};

    if (!creditAccountId) {
      // No Creem account yet (user never purchased). Nothing to mirror.
      return res.json({ success: true, balance: null, synced: false });
    }

    const creemBalance = await getCreemCustomerBalance(creditAccountId);
    if (creemBalance === null || creemBalance === undefined) {
      return res.status(502).json({ success: false, error: 'Could not read Creem balance' });
    }

    return res.json({
      success: true,
      balance: creemBalance,
      creditAccountId,
      synced: true
    });
  } catch (err) {
    console.error('[sync-from-creem] error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// Billing Webhook: Payment Processing & CCA Refills
// ==========================================
app.post(['/api/billing/webhook', '/api/webhooks/creem', '/api/webhooks/payment'], async (req, res) => {
  try {
    const event = req.body || {};
    const webhookSecret = process.env.CREEM_WEBHOOK_SECRET;
    
    // Optional HMAC signature verification
    const sigHeader = req.headers['x-creem-signature'] || req.headers['creem-signature'] || req.headers['x-webhook-signature'];
    if (sigHeader && webhookSecret) {
      try {
        const expectedSig = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(req.body)).digest('hex');
        if (sigHeader !== expectedSig && !sigHeader.includes(expectedSig)) {
          console.warn('[billing-webhook] Signature verification note: payload received');
        }
      } catch (sigErr) {
        console.warn('[billing-webhook] Sig check warning:', sigErr.message);
      }
    }

    const data = event.data || event;
    const customerEmail = data.customer_email || data.customer?.email || data.email;
    const productId = data.product_id || data.product?.id;
    const amountCents = data.amount || data.price || 0;

    // LIVE product IDs (Bitty Box Creem account).
    // PRO monthly grants 1,000 recurring credits + all features.
    // Credit top-ups route through Creem Customer Credit Accounts (CCA).
    const PRO_MONTHLY_IDS = [
      'prod_324HFJtSwkJk6B3qCSnCXq',
      'prod_2YSR2KILROlKvcz91alMW0',
      'prod_21AwXWmmf6vUmr7Z4JJ3sO'
    ];
    const CREDITS_STARTER_1000 = 'prod_6W2ZUtURJf1Mk02xaq6aJF';
    const CREDITS_GROWTH_5000 = 'prod_1ybKpsP1FQPyKvVZUVSg0A';
    const CREDITS_PRO_15000 = 'prod_2qRxHcyee2IvOfAiIFKYw6';
    const CREDITS_MONTHLY_PASS_10000 = 'prod_3dVHhedrXPaGmitx9VecS3';

    // Legacy product IDs
    const CREDITS_100 = 'prod_RZv35BDis62xNpVbtwhZT';
    const CREDITS_500 = 'prod_7TpN3lpNqR0lIcD6tRZNDM';
    const CREDITS_2500 = 'prod_4qidrzVKMckokpFYgp8NM4';

    let creditsToAdd = 0;
    let packageId = 'unknown';
    let isProUnlock = false;

    if (productId === CREDITS_STARTER_1000 || (amountCents === 1000 && !PRO_MONTHLY_IDS.includes(productId))) {
      creditsToAdd = 1000;
      packageId = 'credits_starter_1000';
    } else if (productId === CREDITS_GROWTH_5000 || amountCents === 3500) {
      creditsToAdd = 5000;
      packageId = 'credits_growth_5000';
    } else if (productId === CREDITS_PRO_15000 || amountCents === 9000) {
      creditsToAdd = 15000;
      packageId = 'credits_pro_15000';
    } else if (productId === CREDITS_MONTHLY_PASS_10000 || amountCents === 2500) {
      creditsToAdd = 10000;
      packageId = 'credits_monthly_pass_10000';
    } else if (productId === CREDITS_100 || amountCents === 100) {
      creditsToAdd = 100;
      packageId = 'credits_100';
    } else if (productId === CREDITS_500 || amountCents === 500) {
      creditsToAdd = 500;
      packageId = 'credits_500';
    } else if (productId === CREDITS_2500) {
      creditsToAdd = 2500;
      packageId = 'credits_2500';
    } else if (PRO_MONTHLY_IDS.includes(productId) || amountCents === 400 || amountCents === 700 || amountCents === 900) {
      creditsToAdd = 1000;
      packageId = 'pro_monthly';
      isProUnlock = true;
    }

    if (customerEmail) {
      const user = getUserByEmail(customerEmail);
      if (user) {
        if (isProUnlock || PRO_MONTHLY_IDS.includes(productId)) {
          user.tier = 'PRO';
          user.isPro = true;
        }
        if (creditsToAdd > 0) {
          await purchaseCredits(user.id, packageId, creditsToAdd, amountCents);
        }
        console.log(`[billing-webhook] Processed ${packageId} for user ${user.email}`);
      }
    }

    res.json({ success: true, processed: true });
  } catch (err) {
    console.error('[billing-webhook] Webhook processing error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ==========================================
// REST API: Create Bitty Link
// ==========================================
app.post(['/api/bitty/create', '/api/bitty'], async (req, res) => {
  try {
    let content = '';
    let title = req.body?.title;
    let format = req.body?.format;
    let language = req.body?.language;
    let theme = req.body?.theme;
    let editable = req.body?.editable;
    let password = req.body?.password;
    let domain = req.body?.domain;
    let metadata = req.body?.metadata;
    let description = req.body?.description;
    let favicon = req.body?.favicon;
    let image = req.body?.image;
    let boxId = req.body?.boxId;
    let lockConfig = req.body?.lockConfig;
    let chain = req.body?.chain;
    const secretOverride = req.body?.secretOverride === true || req.body?.secretOverride === 'true' || req.body?.secretOverride === '1';

    if (typeof req.body === 'string') {
      content = req.body;
    } else if (req.body && req.body.content !== undefined) {
      content = req.body.content;
    } else if (req.body && req.body.code !== undefined) {
      content = req.body.code;
      format = format || 'code';
    } else if (req.body && req.body.markdown !== undefined) {
      content = req.body.markdown;
      format = format || 'markdown';
    } else if (req.body && req.body.html !== undefined) {
      content = req.body.html;
      format = format || 'html';
    } else {
      return res.status(400).json({
        success: false,
        error: 'Missing "content", "code", "markdown", or "html" field in request body'
      });
    }

    const creditCost = req.user ? calculateBoxCreditCost({ title, metadata, lockConfig, password }) : 0;
    if (req.user && creditCost > 0) {
      await requireCreditsAvailable(req.user.id, creditCost);
    }

    const result = await createBittyLink({
      content,
      title,
      format,
      language,
      theme,
      editable,
      password,
      domain,
      metadata,
      description,
      favicon,
      image,
      boxId,
      lockConfig,
      chain
    });

    if (result.requiresSecretOverride && !secretOverride && process.env.BITTYBOX_ENFORCE_SECRET_POLICY === '1') {
      return res.status(403).json({
        success: false,
        error: 'Sensitive values detected in an unencrypted link. Acknowledge by passing secretOverride: true, or add a password to encrypt the payload.',
        warnings: result.warnings,
        requiresSecretOverride: true,
      });
    }

    if (req.user) {
      if (creditCost > 0) {
        await deductCreditsEnforced(req.user.id, creditCost, 'api', `REST API Box: ${result.title || 'Bitty Box'} (${creditCost} CR)`);
      }
      recordLinkCreation(req.user.id, { ...result, cost: creditCost });
    }

    res.json({
      success: true,
      authenticatedAs: req.user ? req.user.email : undefined,
      ...result
    });
  } catch (err) {
    if (sendCreditFailure(res, err)) return;
    console.error('[bittybox-api] Error creating bitty link:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/bitty/create', async (req, res) => {
  try {
    const { content, title, format, language, theme, editable, password, domain, redirect, description, favicon, image, boxId } = req.query;
    const secretOverride = req.query.secretOverride === 'true' || req.query.secretOverride === '1';
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required "content" query parameter'
      });
    }

    const creditCost = req.user ? calculateBoxCreditCost({ title, password }) : 0;
    if (req.user && creditCost > 0) {
      await requireCreditsAvailable(req.user.id, creditCost);
    }

    const result = await createBittyLink({
      content: String(content),
      title: title ? String(title) : undefined,
      format: format ? String(format) : undefined,
      language: language ? String(language) : undefined,
      theme: theme ? String(theme) : undefined,
      editable: editable === 'true' || editable === '1',
      password: password ? String(password) : undefined,
      domain: domain ? String(domain) : undefined,
      description: description ? String(description) : undefined,
      favicon: favicon ? String(favicon) : undefined,
      image: image ? String(image) : undefined,
      boxId: boxId ? String(boxId) : undefined
    });

    if (req.user) {
      if (creditCost > 0) {
        await deductCreditsEnforced(req.user.id, creditCost, 'api', `REST API Box: ${result.title || 'Bitty Box'} (${creditCost} CR)`);
      }
      recordLinkCreation(req.user.id, { ...result, cost: creditCost });
    }

    if (result.requiresSecretOverride && !secretOverride && process.env.BITTYBOX_ENFORCE_SECRET_POLICY === '1') {
      return res.status(403).json({
        success: false,
        error: 'Sensitive values detected in an unencrypted link. Acknowledge by passing secretOverride=true, or add a password to encrypt the payload.',
        warnings: result.warnings,
        requiresSecretOverride: true,
      });
    }

    if (redirect === 'true' || redirect === '1') {
      return res.redirect(result.url);
    }

    res.json({ success: true, ...result });
  } catch (err) {
    if (sendCreditFailure(res, err)) return;
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// REST API: Create Bitty Chain
// ==========================================
app.post(['/api/bitty/chain', '/api/bitty/chains', '/api/bitty/box-chain', '/api/chain/create', '/api/box-chain/create'], async (req, res) => {
  try {
    const pages = req.body?.pages;
    const title = req.body?.title;
    const chainId = req.body?.chainId;
    const domain = req.body?.domain;

    if (!Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or empty "pages" array in request body'
      });
    }

    const creditCalculation = calculateChainCreditCost(pages);
    if (req.user && creditCalculation.totalCost > 0) {
      await requireCreditsAvailable(req.user.id, creditCalculation.totalCost);
    }

    const result = await createBittyChain(pages, { title, chainId, domain });

    if (req.user) {
      if (creditCalculation.totalCost > 0) {
        await deductCreditsEnforced(req.user.id, creditCalculation.totalCost, 'api', `REST API Box Chain: ${result.title} (${creditCalculation.totalCost} CR across ${pages.length} boxes)`);
      }
      recordLinkCreation(req.user.id, {
        url: result.primaryUrl,
        title: result.title,
        format: 'chain',
        cost: creditCalculation.totalCost,
        boxBreakdowns: creditCalculation.boxBreakdowns,
      });
    }

    res.json({
      success: true,
      endpoint: req.path,
      aliases: ['/api/bitty/chain', '/api/bitty/box-chain', '/api/agent/chain', '/api/agent/box-chain'],
      authenticatedAs: req.user ? req.user.email : undefined,
      creditCost: creditCalculation.totalCost,
      boxCreditBreakdowns: creditCalculation.boxBreakdowns,
      ...result
    });
  } catch (err) {
    if (sendCreditFailure(res, err)) return;
    console.error('[bittybox-api] Error creating bitty chain:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get(['/api/bitty/chain', '/api/bitty/chains', '/api/bitty/box-chain', '/api/chain/create', '/api/box-chain/create'], sendAgentChainResponse);

// ==========================================
// REST API: Decode Bitty Link
// ==========================================
app.post('/api/bitty/decode', async (req, res) => {
  try {
    const url = req.body?.url;
    const password = req.body?.password;
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Missing required "url" field in request body'
      });
    }

    const result = await decodeBittyLink(url, { password });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/bitty/decode', async (req, res) => {
  try {
    const { url, password } = req.query;
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Missing required "url" query parameter'
      });
    }

    const result = await decodeBittyLink(String(url), { password: password ? String(password) : undefined });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// Agent-friendly REST aliases
// ==========================================
function extractAgentCreateOptions(req) {
  const source = req.method === 'GET' ? req.query : req.body;
  let content = '';
  let title = source?.title;
  let format = source?.format;
  let language = source?.language;
  let theme = source?.theme;
  let editable = source?.editable;
  let password = source?.password;
  let domain = source?.domain;
  let metadata = source?.metadata;
  let description = source?.description;
  let favicon = source?.favicon;
  let image = source?.image;
  let boxId = source?.boxId;
  let lockConfig = source?.lockConfig;
  let chain = source?.chain;

  if (typeof source === 'string') {
    content = source;
  } else if (source && source.content !== undefined) {
    content = source.content;
  } else if (source && source.code !== undefined) {
    content = source.code;
    format = format || 'code';
  } else if (source && source.markdown !== undefined) {
    content = source.markdown;
    format = format || 'markdown';
  } else if (source && source.html !== undefined) {
    content = source.html;
    format = format || 'html';
  } else if (source && source.json !== undefined) {
    content = typeof source.json === 'string' ? source.json : JSON.stringify(source.json, null, 2);
    format = format || 'json';
  } else if (source && source.svg !== undefined) {
    content = source.svg;
    format = format || 'svg';
  }

  if (req.method === 'GET') {
    editable = editable === 'true' || editable === '1';
    metadata = undefined;
  }

  const secretOverride = source?.secretOverride === true || source?.secretOverride === 'true' || source?.secretOverride === '1';
  return { content, title, format, language, theme, editable, password, domain, metadata, description, favicon, image, boxId, lockConfig, chain, secretOverride };
}

async function sendAgentCreateResponse(req, res) {
  try {
    const options = extractAgentCreateOptions(req);
    if (options.content === undefined || options.content === null || String(options.content).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing content. Provide one of: content, code, markdown, html, json, or svg.',
        discovery: '/agents',
      });
    }

    const creditCost = req.user ? calculateBoxCreditCost(options) : 0;
    if (req.user && creditCost > 0) {
      await requireCreditsAvailable(req.user.id, creditCost);
    }

    const result = await createBittyLink(options);
    if (result.requiresSecretOverride && !options.secretOverride && process.env.BITTYBOX_ENFORCE_SECRET_POLICY === '1') {
      return res.status(403).json({
        success: false,
        error: 'Sensitive values detected in an unencrypted link. Pass secretOverride: true, or add password to encrypt the payload.',
        warnings: result.warnings,
        requiresSecretOverride: true,
        discovery: '/agents',
      });
    }

    if (req.user) {
      if (creditCost > 0) {
        await deductCreditsEnforced(req.user.id, creditCost, 'api', `Agent API Box: ${result.title || 'Bitty Box'} (${creditCost} CR)`);
      }
      recordLinkCreation(req.user.id, { ...result, cost: creditCost });
    }

    res.json({
      success: true,
      endpoint: '/api/agent/url',
      canonicalEndpoint: '/api/bitty/create',
      authenticatedAs: req.user ? req.user.email : undefined,
      creditCost,
      ...result,
      next: {
        inspect: '/api/agent/inspect',
        mcp: '/mcp',
        lockableBoxes: '/api/boxes',
      },
    });
  } catch (err) {
    if (sendCreditFailure(res, err)) return;
    console.error('[bittybox-agent-api] Error creating agent URL:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

app.post('/api/agent/url', sendAgentCreateResponse);
app.get('/api/agent/url', sendAgentCreateResponse);

async function sendAgentChainResponse(req, res) {
  try {
    const source = req.method === 'GET' ? req.query : req.body;
    let pages = source?.pages;
    if (typeof pages === 'string') {
      try {
        pages = JSON.parse(pages);
      } catch {
        pages = [{ content: pages }];
      }
    }
    const title = source?.title;
    const chainId = source?.chainId;
    const domain = source?.domain;

    if (!Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or empty "pages" array. Provide an array of page objects with content/format/title.',
        discovery: '/agents',
      });
    }

    const creditCalculation = calculateChainCreditCost(pages);
    if (req.user && creditCalculation.totalCost > 0) {
      await requireCreditsAvailable(req.user.id, creditCalculation.totalCost);
    }

    const result = await createBittyChain(pages, { title, chainId, domain });

    if (req.user) {
      if (creditCalculation.totalCost > 0) {
        await deductCreditsEnforced(req.user.id, creditCalculation.totalCost, 'api', `Agent API Box Chain: ${result.title} (${creditCalculation.totalCost} CR across ${pages.length} boxes)`);
      }
      recordLinkCreation(req.user.id, {
        url: result.primaryUrl,
        title: result.title,
        format: 'chain',
        cost: creditCalculation.totalCost,
        boxBreakdowns: creditCalculation.boxBreakdowns,
      });
    }

    res.json({
      success: true,
      endpoint: req.path,
      canonicalEndpoint: '/api/bitty/chain',
      aliases: ['/api/agent/chain', '/api/agent/box-chain', '/api/bitty/chain', '/api/bitty/box-chain'],
      authenticatedAs: req.user ? req.user.email : undefined,
      creditCost: creditCalculation.totalCost,
      boxCreditBreakdowns: creditCalculation.boxBreakdowns,
      ...result,
      next: {
        inspect: '/api/agent/inspect',
        mcp: '/mcp',
        lockableBoxes: '/api/boxes',
      },
    });
  } catch (err) {
    if (sendCreditFailure(res, err)) return;
    console.error('[bittybox-agent-api] Error creating agent chain:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

app.post(['/api/agent/chain', '/api/agent/box-chain'], sendAgentChainResponse);
app.get(['/api/agent/chain', '/api/agent/box-chain'], sendAgentChainResponse);

async function sendAgentInspectResponse(req, res) {
  try {
    const source = req.method === 'GET' ? req.query : req.body;
    const url = source?.url || source?.link || source?.hash;
    const password = source?.password;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Missing url, link, or hash.', discovery: '/agents' });
    }
    const result = await decodeBittyLink(String(url), { password: password ? String(password) : undefined });
    res.json({ success: true, endpoint: '/api/agent/inspect', canonicalEndpoint: '/api/bitty/decode', ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

app.post('/api/agent/inspect', sendAgentInspectResponse);
app.get('/api/agent/inspect', sendAgentInspectResponse);

app.post('/api/agent/validate', (req, res) => {
  try {
    const options = extractAgentCreateOptions(req);
    if (options.content === undefined || options.content === null || String(options.content).length === 0) {
      return res.status(400).json({ success: false, error: 'Missing content. Provide one of: content, code, markdown, html, json, or svg.' });
    }
    const content = String(options.content);
    const rawBytes = Buffer.byteLength(content, 'utf-8');
    const format = detectFormat(content, options.format || 'auto');
    const warnings = [];
    if (rawBytes > 90000) warnings.push('Large payload: prefer POST creation, externalize heavy assets, and expect URL-length risk.');
    if (/((api|secret|token|password|private)[_-]?key|BEGIN (RSA|OPENSSH|PRIVATE) KEY)/i.test(content)) {
      warnings.push('Potential secret-like text detected. Encrypt with password or remove secrets before sharing.');
    }
    res.json({
      success: true,
      format,
      rawBytes,
      recommendedEndpoint: '/api/agent/url',
      mcpEndpoint: '/mcp',
      warnings,
      acceptedFormats: getAgentDiscovery().payload.formats,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// REST API: Box Management + Lock Enforcement
// ==========================================
// All box management endpoints require authentication (the creator owns the box).
// Public lock-enforcement endpoints (unlock / payload) are unauthenticated by
// design — they enforce the lock, they don't reveal content without passing it.

// Helper: resolve the authenticated user (or 401 if required and absent)
function requireUser(req, res) {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required. Provide an API key via X-API-Key or Authorization: Bearer.' });
    return null;
  }
  return req.user;
}

// List boxes owned by the caller (or all if default user)
app.get('/api/boxes', (req, res) => {
  try {
    const user = req.user;
    const boxes = user ? listBoxes().filter(b => (b.createdBy?.userId || null) === user.id) : listBoxes();
    res.json({
      success: true,
      count: boxes.length,
      boxes: boxes.map(b => ({
        id: b.id,
        title: b.title,
        description: b.description,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        published: !!b.published,
        lockConfig: sanitizeLockConfig(b.lockConfig),
        payload: { bittyId: b.payload?.bittyId, bittyRelativeUrl: b.payload?.bittyRelativeUrl },
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create a box (wrapping a bitty link) — optionally with initial locks.
app.post('/api/boxes', async (req, res) => {
  try {
    const user = req.user || getDefaultUser();
    const { id, boxId, title, description, bittyUrl, bittyRelativeUrl, bittyId, htmlSha256, payloadSha256, lockConfig } = req.body || {};
    if (!bittyUrl && !bittyRelativeUrl && !bittyId) {
      return res.status(400).json({ success: false, error: 'Provide bittyUrl, bittyRelativeUrl, or bittyId.' });
    }
    const box = createBox({
      id: id || boxId,
      title, description, bittyUrl, bittyRelativeUrl, bittyId, htmlSha256, payloadSha256,
      createdBy: { type: 'api', userId: user.id || null, keyId: req.keyMeta?.id || null },
      lockConfig: lockConfig || undefined,
    });
    // best-effort account attribution
    try { recordUnlockEvent; } catch (_) {}
    res.status(201).json({ success: true, boxId: box.id, box: publicBoxView(box) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create a linear chain of boxes (tail-first). Accepts either pre-built bitty
// URLs (bittyUrl/bittyRelativeUrl) or raw content to render via createBittyLink.
app.post('/api/boxes/chain', async (req, res) => {
  try {
    const user = req.user || getDefaultUser();
    const specs = req.body?.boxes;
    if (!Array.isArray(specs) || specs.length === 0) {
      return res.status(400).json({ success: false, error: 'Provide a non-empty "boxes" array.' });
    }
    const createdBy = { type: 'api', userId: user.id || null, keyId: req.keyMeta?.id || null };
    // Each spec may carry raw content OR a prebuilt bitty URL.
    const renderBoxUrl = (spec) => {
      if (spec.bittyUrl || spec.bittyRelativeUrl) return spec.bittyUrl || spec.bittyRelativeUrl;
      const link = createBittyLink({
        content: spec.content,
        title: spec.title || 'Chain Box',
        format: spec.format || 'auto',
        language: spec.language,
        theme: spec.theme || 'auto',
        password: spec.password,
        domain: req.body?.domain,
      });
      return link.url;
    };
    const chain = createChainedBoxes({ boxes: specs.map(s => ({ ...s, createdBy })), renderBoxUrl, createdBy });
    // Denormalize per-box public view for the response.
    const publicBoxes = chain.boxes.map(b => ({
      index: b.index,
      boxId: b.boxId,
      url: b.url,
      nextUrl: b.nextUrl,
    }));
    res.status(201).json({
      success: true,
      chainId: chain.chainId,
      total: chain.total,
      firstUrl: publicBoxes[0]?.url || null,
      boxes: publicBoxes,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get a single box (management view)
app.get('/api/boxes/:id', (req, res) => {
  try {
    const box = getBox(req.params.id);
    if (!box) return res.status(404).json({ success: false, error: 'Box not found' });
    res.json({ success: true, box: publicBoxView(box) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Set/Replace the full lock config
app.put('/api/boxes/:id/lock', (req, res) => {
  try {
    const box = getBox(req.params.id);
    if (!box) return res.status(404).json({ success: false, error: 'Box not found' });
    const { lockConfig } = req.body || {};
    if (!lockConfig) return res.status(400).json({ success: false, error: 'lockConfig required' });
    updateLockConfig(req.params.id, lockConfig);
    res.json({ success: true, boxId: req.params.id, lockConfig: sanitizeLockConfig(lockConfig) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Convenience lock setters
app.post('/api/boxes/:id/lock/password', async (req, res) => {
  try {
    const box = getBox(req.params.id);
    if (!box) return res.status(404).json({ success: false, error: 'Box not found' });
    const { password, hint } = req.body || {};
    if (!password) return res.status(400).json({ success: false, error: 'password required' });
    const verifier = await createPasswordVerifier(password, { hint: hint || '' });
    setPasswordLock(req.params.id, { enabled: true, verifier, hint: hint || '' });
    res.json({ success: true, boxId: req.params.id, passwordLock: { enabled: true, hint: hint || '' } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/boxes/:id/lock/time', (req, res) => {
  try {
    const box = getBox(req.params.id);
    if (!box) return res.status(404).json({ success: false, error: 'Box not found' });
    const { notBefore, notAfter } = req.body || {};
    setTimeWindowLock(req.params.id, createTimeWindow({ notBefore, notAfter }));
    res.json({ success: true, boxId: req.params.id, timeWindow: { enabled: true, notBefore, notAfter } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/boxes/:id/lock/access-limit', (req, res) => {
  try {
    const box = getBox(req.params.id);
    if (!box) return res.status(404).json({ success: false, error: 'Box not found' });
    const { maxOpens } = req.body || {};
    setAccessLimitLock(req.params.id, createOpenLimit({ maxOpens: Number(maxOpens) || 1 }));
    res.json({ success: true, boxId: req.params.id, openLimit: { enabled: true, maxOpens: Number(maxOpens) || 1 } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/boxes/:id/lock/session-limit', (req, res) => {
  try {
    const box = getBox(req.params.id);
    if (!box) return res.status(404).json({ success: false, error: 'Box not found' });
    const { maxSessionOpens } = req.body || {};
    setSessionLimitLock(req.params.id, createSessionOpenLimit({ maxSessionOpens: Number(maxSessionOpens) || 1 }));
    res.json({ success: true, boxId: req.params.id, sessionOpenLimit: { enabled: true, maxSessionOpens: Number(maxSessionOpens) || 1 } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/boxes/:id/lock/invite-only', (req, res) => {
  try {
    const box = getBox(req.params.id);
    if (!box) return res.status(404).json({ success: false, error: 'Box not found' });
    const { emails } = req.body || {};
    setInviteOnlyLock(req.params.id, createInviteOnly(emails || []));
    res.json({ success: true, boxId: req.params.id, inviteOnly: { enabled: true, allowedEmailCount: (emails || []).length } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Remove a specific lock type
app.delete('/api/boxes/:id/lock/:type', (req, res) => {
  try {
    const box = getBox(req.params.id);
    if (!box) return res.status(404).json({ success: false, error: 'Box not found' });
    const allowed = ['password', 'timeWindow', 'openLimit', 'sessionOpenLimit', 'inviteOnly'];
    const map = { password: 'password', time: 'timeWindow', 'access-limit': 'openLimit', 'session-limit': 'sessionOpenLimit', invite: 'inviteOnly' };
    const field = map[req.params.type] || req.params.type;
    if (!allowed.includes(field)) return res.status(400).json({ success: false, error: 'Unknown lock type' });
    const newLock = { ...box.lockConfig, [field]: null };
    updateLockConfig(req.params.id, newLock);
    res.json({ success: true, boxId: req.params.id, lockConfig: sanitizeLockConfig(newLock) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Publish / unpublish
app.post('/api/boxes/:id/publish', (req, res) => {
  try {
    const box = getBox(req.params.id);
    if (!box) return res.status(404).json({ success: false, error: 'Box not found' });
    publishBox(req.params.id);
    res.json({ success: true, boxId: req.params.id, published: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post('/api/boxes/:id/unpublish', (req, res) => {
  try {
    const box = getBox(req.params.id);
    if (!box) return res.status(404).json({ success: false, error: 'Box not found' });
    unpublishBox(req.params.id);
    res.json({ success: true, boxId: req.params.id, published: false });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a box
app.delete('/api/boxes/:id', (req, res) => {
  try {
    const ok = deleteBox(req.params.id);
    if (!ok) return res.status(404).json({ success: false, error: 'Box not found' });
    res.json({ success: true, boxId: req.params.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Public lock-enforcement gate ────────────────────────────────────────────

// Public status endpoint for boxes (safe to call by visitors without consuming quota)
app.get('/api/boxes/:id/status', (req, res) => {
  try {
    const box = getBox(req.params.id);
    if (!box) return res.status(404).json({ success: false, error: 'Box not found' });
    const maxOpens = box.lockConfig?.openLimit?.maxOpens;
    const opensUsed = box.lockConfig?.openLimit?.opensUsed || 0;
    const remainingOpens = maxOpens != null ? Math.max(0, maxOpens - opensUsed) : null;
    res.json({
      success: true,
      boxId: box.id,
      title: box.title,
      lockConfig: sanitizeLockConfig(box.lockConfig),
      maxOpens,
      opensUsed,
      remainingOpens,
      isExpired: box.lockConfig?.timeWindow?.notAfter ? new Date() > new Date(box.lockConfig.timeWindow.notAfter) : false,
      isPending: box.lockConfig?.timeWindow?.notBefore ? new Date() < new Date(box.lockConfig.timeWindow.notBefore) : false,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Unlock attempt — evaluates the lock and, on success, issues a short-lived
// session grant that can be exchanged for the payload delivery.
app.post('/api/boxes/:id/unlock', async (req, res) => {
  try {
    const box = getBox(req.params.id);
    if (!box) return res.status(404).json({ success: false, error: 'Box not found' });

    const sessionIdFromClient = req.body?.sessionId || req.headers['x-session-id'] || null;
    const sessionKey = sessionIdFromClient || hashSessionKeyForReq(req);
    const sessionOpenCount = getSessionOpenCount(sessionKey);

    const result = await evaluateAndRecord(req.params.id, {
      password: req.body?.password,
      email: req.body?.email,
      ip: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
      sessionId: sessionKey,
      sessionOpenCount,
    });

    if (result.ok) {
      touchSessionOpens(sessionKey);
      incrementOpensUsed(req.params.id);
      const updatedBox = getBox(req.params.id);
      const maxOpens = updatedBox?.lockConfig?.openLimit?.maxOpens;
      const opensUsed = updatedBox?.lockConfig?.openLimit?.opensUsed || 0;
      const remainingOpens = maxOpens != null ? Math.max(0, maxOpens - opensUsed) : null;

      const grant = createSessionGrant(req.params.id, sessionKey, 60);
      res.json({
        success: true,
        allowed: true,
        remainingOpens,
        sessionKey: grant.sessionKey,
        grantToken: grant.token,
        grantExpiresAt: grant.expiresAt,
      });
    } else {
      const maxOpens = box.lockConfig?.openLimit?.maxOpens;
      const opensUsed = box.lockConfig?.openLimit?.opensUsed || 0;
      const remainingOpens = maxOpens != null ? Math.max(0, maxOpens - opensUsed) : 0;
      res.status(403).json({
        success: true,
        allowed: false,
        remainingOpens,
        reason: result.reason,
        deniedCodes: result.deniedCodes,
        lockScreen: buildLockScreen(box, result),
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Payload delivery — only with a valid, unexpired, signed grant token.
app.get('/api/boxes/:id/payload', (req, res) => {
  try {
    const token = req.query.grant || req.headers['x-grant-token'];
    if (!token) return res.status(401).json({ success: false, error: 'Missing grant token' });
    const grant = verifySessionGrant(token);
    if (!grant) return res.status(403).json({ success: false, error: 'Invalid or expired grant token' });
    if (grant.boxId !== req.params.id) return res.status(403).json({ success: false, error: 'Grant mismatch' });
    const box = getBox(req.params.id);
    if (!box) return res.status(404).json({ success: false, error: 'Box not found' });
    // Note: open-count enforcement happens at unlock (incrementOpensUsed), so a
    // grant valid within its TTL may be exchanged for the payload more than once
    // without inflating the open count or bypassing max-opens / one-time limits.
    res.json({
      success: true,
      boxId: box.id,
      payload: box.payload,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// View helpers
function hashSessionKeyForReq(req) {
  const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
  const ua = req.headers['user-agent'] || '';
  return crypto.createHash('sha256').update(ip + '|' + ua).digest('hex');
}

// Session grants are now stateless, HMAC-signed tokens (see
// lib/policy-evaluator.js createSessionGrant / verifySessionGrant) — no
// in-memory store or periodic cleanup required.

function publicBoxView(box) {
  return {
    id: box.id,
    title: box.title,
    description: box.description,
    createdAt: box.createdAt,
    updatedAt: box.updatedAt,
    published: !!box.published,
    lockConfig: sanitizeLockConfig(box.lockConfig),
    payload: { bittyId: box.payload?.bittyId, bittyRelativeUrl: box.payload?.bittyRelativeUrl, bittyUrl: box.payload?.bittyUrl },
  };
}

// Never leak password verifier material to clients.
function sanitizeLockConfig(lockConfig) {
  if (!lockConfig) return lockConfig;
  const out = { ...lockConfig };
  if (out.password) {
    out.password = { enabled: !!out.password.enabled, hint: out.password.hint || null, algorithm: out.password.verifier?.algorithm || null };
  }
  return out;
}

function buildLockScreen(box, evaluation) {
  // Returns metadata the client can use to render the appropriate lock screen.
  const lc = box.lockConfig || {};
  // Server-authoritative remaining-opens badge (ADR Step #3). The scarcity
  // value is derived ONLY here from opensUsed persisted on disk — never
  // computed client-side, so the badge can never be spoofed into overriding
  // the real open-limit gate.
  const ol = lc.openLimit && lc.openLimit.enabled ? lc.openLimit : null;
  const maxOpens = ol ? (ol.maxOpens || 0) : null;
  const opensUsed = ol ? (ol.opensUsed || 0) : null;
  const remainingOpens = ol ? Math.max(0, maxOpens - opensUsed) : null;
  return {
    boxId: box.id,
    title: box.title,
    deniedCodes: evaluation.deniedCodes,
    requiredLocks: {
      password: !!lc.password?.enabled,
      timeWindow: !!lc.timeWindow?.enabled,
      openLimit: !!lc.openLimit?.enabled,
      sessionOpenLimit: !!lc.sessionOpenLimit?.enabled,
      inviteOnly: !!lc.inviteOnly?.enabled,
    },
    passwordHint: lc.password?.hint || null,
    message: lockScreenMessage(evaluation.deniedCodes),
    // ── remaining-opens badge contract ──────────────────────────────────
    remainingOpens: remainingOpens, // null when no open-limit lock
    maxOpens: maxOpens,
    opensUsed: opensUsed,
    exhausted: ol ? remainingOpens <= 0 : false,
  };
}

function lockScreenMessage(deniedCodes = []) {
  if (deniedCodes.includes('too_early')) return 'This box is not available yet.';
  if (deniedCodes.includes('expired')) return 'This box is no longer available.';
  if (deniedCodes.includes('open_limit_reached') || deniedCodes.includes('session_open_limit_reached')) return 'Access limit reached for this box.';
  if (deniedCodes.includes('not_invited')) return 'This box is invite-only.';
  if (deniedCodes.includes('invalid_password') || deniedCodes.includes('password_required')) return 'This box is password protected.';
  return 'This box is locked.';
}

// ==========================================
// REST API: Supported Formats & Capabilities
// ==========================================
app.get('/api/bitty/formats', (_req, res) => {
  res.json({
    success: true,
    formats: [
      { format: 'auto', description: 'Auto-detects format from content' },
      { format: 'markdown', description: 'GitHub-flavored markdown with code highlighting and tables' },
      { format: 'code', description: 'Developer code viewer with syntax highlighting and line numbers' },
      { format: 'html', description: 'Interactive mini web applications in sandbox' },
      { format: 'json', description: 'Interactive JSON tree viewer' },
      { format: 'svg', description: 'Scalable vector graphic viewer' },
      { format: 'canvas', description: 'HTML5 Canvas animation / generative art' },
      { format: 'recipe', description: 'Schema.org culinary recipe card' },
      { format: 'text', description: 'Clean reading typography for plain notes' }
    ],
    features: [
      'GZIP compression level 9',
      'AES-256-GCM encryption',
      'Sequential Box Chaining (multi-page linked documents, slide decks, workflows)',
      'Agent Box Chain creation via /api/agent/box-chain and MCP create_box_chain',
      'Studio-compatible chain metadata: image, timeWindow locks, openLimit locks, ch/nx navigation',
      'Streamable HTTP Model Context Protocol (MCP) server',
      'Stdio MCP server',
      'API Key Authentication & Management'
    ],
    chainEndpoints: [
      '/api/bitty/chain',
      '/api/bitty/box-chain',
      '/api/agent/chain',
      '/api/agent/box-chain'
    ]
  });
});

// ==========================================
// Agentic Boxes — native OpenMolt integration
// (mounted BEFORE static/SPA fallback so it is never shadowed)
// ==========================================
app.use('/api/agentic-boxes', createAgenticBoxRouter());

// ==========================================
// Vite Dev Middleware / Static Assets & SPA Serving
// ==========================================
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(DIST_DIR, {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));

  // SPA Fallback: All unmatched GET requests serve index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// Start Server
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[bittybox] Server listening on http://0.0.0.0:${PORT}`);
  console.log(`[bittybox] Mode: ${process.env.NODE_ENV === 'production' ? 'production (static dist)' : 'development (vite middleware)'}`);
  console.log(`[bittybox] MCP Server (Streamable HTTP): http://0.0.0.0:${PORT}/mcp`);
  console.log(`[bittybox] REST API: http://0.0.0.0:${PORT}/api/bitty/create`);
  console.log(`[bittybox] Voice AI: /api/voice-assistant/ask (REST) · /api/voice-token (Realtime) · available=${voiceAvailable()}`);
});

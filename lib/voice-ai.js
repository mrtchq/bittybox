/**
 * Bitty Voice AI — OpenAI integration for bittybox.org
 *  - POST /api/voice-assistant/ask : OpenAI chat completions (text Q&A)
 *  - POST /api/voice-token        : mints a short-lived OpenAI Realtime
 *                                   ephemeral client token for in-browser live voice
 *
 * Requires the `openai` SDK (installed) and an OPENAI_API_KEY in the env.
 * Without the key, endpoints degrade gracefully with friendly messages.
 * Live voice runs entirely in the browser via WebRTC to OpenAI's Realtime API
 * using the ephemeral token — no audio proxying on the server.
 */
import OpenAI from 'openai';
import { ACTION_REGISTRY, buildAccountContext } from './ai-action-registry.js';
import { getTextAgentTools } from './ai-conversation.js';

export function getRealtimeAgentTools() {
  const tools = getTextAgentTools().map((tool) => ({
    ...tool,
    approval: ACTION_REGISTRY[tool.name]?.approval || 'none',
  }));
  tools.push({
    type: 'function',
    name: 'bittybox.box.create_from_proposal',
    description: 'Create a live BittyBox only after the user explicitly confirms the selected proposal. The server enforces approval and idempotency.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        proposalId: { type: 'string', minLength: 1, maxLength: 100 },
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 200 },
      },
      required: ['proposalId', 'idempotencyKey'],
    },
    approval: ACTION_REGISTRY['bittybox.box.create_from_proposal'].approval,
  });
  return tools;
}

export function buildRealtimeInstructions(user, conversationId) {
  const context = buildAccountContext(user, { recentBoxes: user.links || [] });
  return [
    'You are Bitty Voice, the authenticated BittyBox conversational designer.',
    'Use the shared BittyBox tools for assessment answers, proposals, comparisons, validation, and cost estimates.',
    'Never request passwords, API keys, payment details, or authentication tokens.',
    'Creating a live box requires explicit confirmation from the user, spoken or otherwise, and must use the separate approved creation flow with an idempotency key.',
    `Conversation ID: ${conversationId || 'voice-session'}.`,
    `Authenticated account context: ${JSON.stringify(context)}`,
  ].join('\n');
}

function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function voiceAvailable() {
  return Boolean(process.env.OPENAI_API_KEY);
}

const SYSTEM_PROMPT =
  'You are Bitty Voice, the AI assistant for Bitty Box — a studio that packs entire webpages, ' +
  'apps, and interactive experiences into compressed URLs with client-side access-control "locks". ' +
  'You are expert in web development, URL-native applications, creative micro-tools, and how Bitty Box ' +
  'stores all data inside the link without servers. Be accurate, concise, conversational, and speak naturally ' +
  'so your answer can be read aloud by Voice AI.';

/** POST /api/voice-assistant/ask — OpenAI chat completion */
export async function handleVoiceAssistantAsk(req, res) {
  try {
    const { query, context, model: requestedModel } = req.body || {};
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    const client = getClient();
    if (!client) {
      res.status(503).json({
        error: 'OPENAI_API_KEY is not configured on the server.',
        answer:
          'I am ready to help, but my OpenAI API key has not been added yet. Once added in Settings > Secrets, I can answer your questions and talk with you live!',
        sources: [],
        searchQueries: [],
      });
      return;
    }

    const model = requestedModel || 'gpt-4o-mini';
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: context ? `${query}\n\nContext: ${context}` : query },
      ],
      temperature: 0.7,
    });

    const answer = completion.choices?.[0]?.message?.content || 'No response generated.';
    res.json({
      success: true,
      answer,
      sources: [],
      searchQueries: [],
      modelUsed: model,
    });
  } catch (err) {
    console.error('[voice] ask error:', err);
    let friendlyMessage = 'I ran into a temporary issue. Please try again in a moment.';
    const msg = String(err?.message || '');
    if (msg.includes('429') || msg.includes('rate_limit') || msg.includes('insufficient_quota')) {
      friendlyMessage = 'The AI model is handling a high volume of requests right now. Please wait a moment and try again.';
    } else if (msg.includes('401') || msg.includes('Incorrect API key') || msg.includes('invalid_api_key')) {
      friendlyMessage = 'Please verify your OpenAI API key in Settings > Secrets to enable Voice AI.';
    }
    res.status(500).json({ success: false, error: err.message || 'Failed to process query', answer: friendlyMessage, sources: [], searchQueries: [] });
  }
}

/**
 * POST /api/voice-token — mint an ephemeral OpenAI Realtime token.
 * The browser uses this to open a direct WebRTC/WS session to OpenAI Realtime.
 * Token is short-lived (default 1 min) and scoped to the Realtime API only.
 */
export async function handleVoiceToken(req, res) {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'Authentication required for BittyBox voice.' });
      return;
    }
    const client = getClient();
    if (!client) {
      res.status(503).json({ error: 'OPENAI_API_KEY is not configured on the server.' });
      return;
    }

    const body0 = req.body || {};
    const model0 = body0.model || 'gpt-realtime';
    const voice0 = body0.voice || 'alloy';
    const conversationId = typeof body0.conversationId === 'string' ? body0.conversationId.slice(0, 120) : 'voice-session';
    const expiresSeconds = Number.isFinite(body0.expires_after) ? body0.expires_after : 600;

    let secret;
    let expiresAt;
    let sessionId;
    let sessionModel;
    try {
      // GA endpoint (28 Aug 2025): mint an ephemeral client secret.
      // Replaces the retired /v1/realtime/sessions (404 in current API).
      const r = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Safety-Identifier': body0.safety_id || 'bittybox-web-client',
        },
        body: JSON.stringify({
          session: {
            type: 'realtime',
            model: model0,
            audio: { output: { voice: voice0 } },
            instructions: buildRealtimeInstructions(req.user, conversationId),
            tools: getRealtimeAgentTools().map(({ approval, ...tool }) => tool),
          },
          expires_after: { anchor: 'created_at', seconds: expiresSeconds },
        }),
      });
      if (!r.ok) {
        const txt = await r.text();
        res.status(r.status === 404 ? 502 : r.status).json({ error: `OpenAI Realtime client secret failed: ${r.status} ${txt}` });
        return;
      }
      const data = await r.json();
      secret = data.value;
      expiresAt = data.expires_at;
      sessionId = data.session?.id;
      sessionModel = data.session?.model || model0;
      if (!secret) {
        res.status(502).json({ error: 'OpenAI did not return a client secret (value) for the Realtime session.', raw: data });
        return;
      }
    } catch (fetchErr) {
      res.status(502).json({ error: fetchErr.message || 'Failed to reach OpenAI Realtime' });
      return;
    }

    res.json({
      value: secret,
      expires_at: expiresAt,
      session_id: sessionId,
      model: sessionModel,
    });
  } catch (err) {
    console.error('[voice] token error:', err);
    res.status(500).json({ error: err.message || 'Failed to create Realtime session' });
  }
}

/**
 * POST /api/voice-call — WebRTC unified-interface relay.
 * The browser sends its raw SDP offer (Content-Type: application/sdp); this server
 * relays it to OpenAI's /v1/realtime/calls with the REAL API key (never exposed to
 * the browser), and returns OpenAI's SDP answer. This is OpenAI's recommended
 * production browser pattern and avoids any direct browser→OpenAI cross-origin call.
 */
export async function handleVoiceCall(req, res) {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'Authentication required for BittyBox voice.' });
      return;
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: 'OPENAI_API_KEY is not configured on the server.' });
      return;
    }

    const offerSdp = typeof req.body === 'string' ? req.body : '';
    if (!offerSdp || !offerSdp.includes('v=')) {
      res.status(400).json({ error: 'Missing or invalid SDP offer body.' });
      return;
    }

    const sessionConfig = JSON.stringify({
      type: 'realtime',
      model: 'gpt-realtime',
      audio: { output: { voice: 'alloy' } },
      instructions: buildRealtimeInstructions(req.user, typeof req.body?.conversationId === 'string' ? req.body.conversationId : 'voice-session'),
      tools: getRealtimeAgentTools().map(({ approval, ...tool }) => tool),
    });

    const fd = new FormData();
    fd.set('sdp', offerSdp);
    fd.set('session', sessionConfig);

    const r = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'OpenAI-Safety-Identifier': 'bittybox-web-client',
      },
      body: fd,
    });

    if (!r.ok) {
      const txt = await r.text();
      res.status(r.status === 404 ? 502 : r.status).json({ error: `OpenAI Realtime call failed: ${r.status} ${txt}` });
      return;
    }

    const answerSdp = await r.text();
    res.setHeader('Content-Type', 'application/sdp');
    res.send(answerSdp);
  } catch (err) {
    console.error('[voice] call relay error:', err);
    res.status(500).json({ error: err.message || 'Failed to relay Realtime call' });
  }
}

export { voiceAvailable };

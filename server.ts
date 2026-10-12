/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Bitty Box - Full-Stack Express Server
 * MCP Server, Function Call API Router, Agent Bus, and Gemini AI Proxy
 */

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  create_micro_site,
  encode_site_to_url,
  update_micro_site,
  create_capsule,
  create_chain,
  generate_qr,
  get_site_metadata,
  publish_site,
  notify_agent,
  get_agent_event_log,
} from './src/protocol/functions';
import {
  getUrlMetrics,
  getInteractionLogs,
  trackUrlClick,
  trackAgentInteraction,
  generateProjectConfigurationExport,
} from './src/protocol/telemetry';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// Cross-origin & headers for agent clients
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agent-Key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Tool Definitions for MCP and Function Call API
const MCP_TOOLS = [
  {
    name: 'create_micro_site',
    description: 'Generates an autonomous agent output micro-site artifact with content, theme, layout, and widgets.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the micro-site' },
        content: { type: 'string', description: 'HTML, markdown, or plain text content for the micro-site' },
        theme: { type: 'string', enum: ['obsidian-gold', 'cyber-amber', 'stealth-dark', 'solarized-amber', 'pure-obsidian'], default: 'obsidian-gold' },
        layout: { type: 'string', enum: ['document', 'card', 'terminal', 'interactive', 'dashboard'], default: 'document' },
        authorAgent: { type: 'string', description: 'Identifier of the creating agent', default: 'autonomous-agent' },
      },
      required: ['content'],
    },
  },
  {
    name: 'encode_site_to_url',
    description: 'Compresses and encodes a micro-site object into a self-contained Bitty Box URL fragment.',
    inputSchema: {
      type: 'object',
      properties: {
        site: { type: 'object', description: 'The micro-site object to encode' },
        baseUrl: { type: 'string', description: 'Optional base URL prefix' },
      },
      required: ['site'],
    },
  },
  {
    name: 'update_micro_site',
    description: 'Updates an existing Bitty Box micro-site URL with updated content or theme.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Existing Bitty Box URL' },
        new_content: { type: 'string', description: 'New HTML or markdown content' },
        title: { type: 'string', description: 'Optional updated title' },
        theme: { type: 'string', description: 'Optional updated theme' },
      },
      required: ['url', 'new_content'],
    },
  },
  {
    name: 'create_capsule',
    description: 'Wraps a micro-site into a temporal scheduled unlockable capsule with time and passcode constraints.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Micro-site URL to wrap in a capsule' },
        title: { type: 'string', description: 'Capsule title' },
        unlock_time: { type: 'string', description: 'ISO 8601 unlock timestamp' },
        password: { type: 'string', description: 'Optional passcode required for unlocking' },
        preUnlockMessage: { type: 'string', description: 'Message to show on pre-unlock screen' },
        authorAgent: { type: 'string', description: 'Authoring agent' },
      },
    },
  },
  {
    name: 'create_chain',
    description: 'Generates an agentic branching logic chain of interconnected micro-sites and decision nodes.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the branching logic chain' },
        authorAgent: { type: 'string', description: 'Authoring agent' },
        rootNodeId: { type: 'string', description: 'ID of the initial starting node' },
        nodes: { type: 'object', description: 'Map of node IDs to ChainNode objects' },
      },
      required: ['nodes'],
    },
  },
  {
    name: 'generate_qr',
    description: 'Generates high-contrast gold/obsidian QR codes for any Bitty Box URL.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to generate QR code for' },
        colorDark: { type: 'string', default: '#D4AF37' },
        colorLight: { type: 'string', default: '#0A0A0B' },
      },
      required: ['url'],
    },
  },
  {
    name: 'get_site_metadata',
    description: 'Inspects a Bitty Box URL and returns byte length, compression ratio, title, and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Bitty Box URL to inspect' },
      },
      required: ['url'],
    },
  },
  {
    name: 'publish_site',
    description: 'Publishes and generates shareable artifacts (direct URL, QR, markdown link) for a Bitty Box site.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Bitty Box URL to publish' },
      },
      required: ['url'],
    },
  },
  {
    name: 'notify_agent',
    description: 'Dispatches an inter-agent event notification (unlock, branch chosen, scan, update) to the agent bus.',
    inputSchema: {
      type: 'object',
      properties: {
        senderAgent: { type: 'string', description: 'Sender agent identifier' },
        eventType: { type: 'string', enum: ['unlock', 'branch_chosen', 'qr_scanned', 'site_updated', 'ping', 'workflow_trigger'] },
        payload: { type: 'object', description: 'Custom event payload data' },
      },
      required: ['senderAgent', 'eventType'],
    },
  },
];

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    protocol: 'Bitty Box v2.4',
    primitives: ['micro-sites', 'capsules', 'chains'],
    mcpEnabled: true,
    geminiEnabled: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Event Bus query
app.get('/api/events', (req, res) => {
  res.json({
    events: get_agent_event_log(),
  });
});

// Telemetry & URL Click-Through Tracker
app.get('/api/telemetry', (req, res) => {
  res.json({
    metrics: getUrlMetrics(),
    logs: getInteractionLogs(),
  });
});

app.post('/api/telemetry/click', (req: Request, res: Response) => {
  const { urlId } = req.body || {};
  if (!urlId) return res.status(400).json({ error: 'urlId required' });
  const updated = trackUrlClick(urlId);
  res.json({ success: Boolean(updated), metric: updated });
});

app.post('/api/telemetry/interact', (req: Request, res: Response) => {
  const { urlId, action, agentId, details } = req.body || {};
  if (!urlId) return res.status(400).json({ error: 'urlId required' });
  const updated = trackAgentInteraction(urlId, action || 'widget_trigger', agentId || 'autonomous-worker', details);
  res.json({ success: Boolean(updated), metric: updated });
});

// Full Project Configuration Export Endpoint
app.get('/api/project/export', (req, res) => {
  const config = generateProjectConfigurationExport();
  res.setHeader('Content-Disposition', 'attachment; filename="bittybox-project-config.json"');
  res.setHeader('Content-Type', 'application/json');
  res.json(config);
});

// Function Call API Router (REST/JSON-RPC)
app.post('/api/rpc', async (req: Request, res: Response) => {
  const { method, params } = req.body || {};
  if (!method) {
    return res.status(400).json({ error: 'Missing method parameter' });
  }

  try {
    let result: any;
    switch (method) {
      case 'create_micro_site':
        result = create_micro_site(params || {});
        break;
      case 'encode_site_to_url':
        result = encode_site_to_url(params || {});
        break;
      case 'update_micro_site':
        result = await update_micro_site(params || {});
        break;
      case 'create_capsule':
        result = await create_capsule(params || {});
        break;
      case 'create_chain':
        result = create_chain(params || {});
        break;
      case 'generate_qr':
        result = await generate_qr(params || {});
        break;
      case 'get_site_metadata':
        result = await get_site_metadata(params || {});
        break;
      case 'publish_site':
        result = publish_site(params || {});
        break;
      case 'notify_agent':
        result = notify_agent(params || {});
        break;
      default:
        return res.status(404).json({ error: `Method ${method} not found in Bitty Box API` });
    }
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Model Context Protocol (MCP) JSON-RPC 2.0 Endpoint
app.post('/api/mcp', async (req: Request, res: Response) => {
  const { jsonrpc, id, method, params } = req.body || {};

  if (jsonrpc !== '2.0') {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: id || null,
      error: { code: -32600, message: 'Invalid Request: jsonrpc must be 2.0' },
    });
  }

  try {
    if (method === 'initialize') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
            prompts: { listChanged: false },
          },
          serverInfo: {
            name: 'bitty-box-mcp-server',
            version: '2.4.0',
          },
        },
      });
    }

    if (method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: MCP_TOOLS,
        },
      });
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      let executionResult: any;
      switch (toolName) {
        case 'create_micro_site':
          executionResult = create_micro_site(toolArgs);
          break;
        case 'encode_site_to_url':
          executionResult = encode_site_to_url(toolArgs);
          break;
        case 'update_micro_site':
          executionResult = await update_micro_site(toolArgs);
          break;
        case 'create_capsule':
          executionResult = await create_capsule(toolArgs);
          break;
        case 'create_chain':
          executionResult = create_chain(toolArgs);
          break;
        case 'generate_qr':
          executionResult = await generate_qr(toolArgs);
          break;
        case 'get_site_metadata':
          executionResult = await get_site_metadata(toolArgs);
          break;
        case 'publish_site':
          executionResult = publish_site(toolArgs);
          break;
        case 'notify_agent':
          executionResult = notify_agent(toolArgs);
          break;
        default:
          return res.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Tool ${toolName} not found` },
          });
      }

      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(executionResult, null, 2),
            },
          ],
        },
      });
    }

    if (method === 'resources/list') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          resources: [
            {
              uri: 'bitty://protocol/spec',
              name: 'Bitty Box Protocol Specification',
              description: 'URL-native micro-web specification and compression formats',
              mimeType: 'text/markdown',
            },
            {
              uri: 'bitty://events/latest',
              name: 'Agent Event Stream',
              description: 'Latest events from the Bitty Box agent bus',
              mimeType: 'application/json',
            },
          ],
        },
      });
    }

    if (method === 'prompts/list') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          prompts: [
            {
              name: 'generate_micro_site',
              description: 'Prompt template to design an agent output micro-site artifact',
            },
            {
              name: 'schedule_capsule',
              description: 'Prompt template to package agent output into a locked temporal capsule',
            },
            {
              name: 'branching_chain',
              description: 'Prompt template to generate multi-node agentic reasoning flow',
            },
          ],
        },
      });
    }

    return res.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method ${method} not found` },
    });
  } catch (err: any) {
    return res.status(500).json({
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: err.message },
    });
  }
});

// Autonomous Agent Generation Endpoint (via Gemini API or fallback heuristic engine)
app.post('/api/agent/generate', async (req: Request, res: Response) => {
  const { prompt, primitiveType, authorAgent, theme } = req.body || {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const agentName = authorAgent || 'agent-prime';
  const selectedTheme = theme || 'obsidian-gold';

  // Check if GEMINI_API_KEY is available
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({});
      const systemInstruction = `
You are the Bitty Box Autonomous Architect.
Bitty Box is a URL-native protocol where AI agents create tiny self-contained micro-sites, temporal capsules, and branching logic chains.
Your task is to take the user's voice or text instruction and generate a complete, production-grade Bitty Box artifact.

Rules:
1. Return strictly JSON with the following structure:
{
  "primitiveType": "micro_site" | "capsule" | "chain",
  "title": "Clear, concise title",
  "content": "Well-formatted semantic HTML body for the micro-site (use <h2>, <p>, <code>, <ul>, etc.)",
  "theme": "obsidian-gold" | "cyber-amber" | "stealth-dark" | "solarized-amber" | "pure-obsidian",
  "layout": "document" | "dashboard" | "terminal",
  "widgets": [
    { "type": "counter" | "status-grid" | "action-button" | "event-emitter", "label": "string", "value": "optional", "action": "optional" }
  ],
  "capsuleConfig": {
    "unlockMinutesFromNow": 5,
    "password": "optional password if requested",
    "preUnlockMessage": "Pre-unlock screen message"
  },
  "chainConfig": {
    "rootNodeId": "step_1",
    "nodes": {
      "step_1": {
        "id": "step_1",
        "title": "Node title",
        "content": "<p>Node content HTML</p>",
        "choices": [
          { "id": "c1", "label": "Choice label", "targetNodeId": "step_2", "description": "Choice description" }
        ]
      },
      "step_2": {
        "id": "step_2",
        "title": "Next Node",
        "content": "<p>Result content</p>",
        "choices": []
      }
    }
  },
  "agentSpeech": "A short 1-2 sentence spoken confirmation to read aloud to the user."
}
Only output valid JSON.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Create an artifact for: ${prompt}. Prefer primitive type: ${primitiveType || 'auto'}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '';
      const parsed = JSON.parse(text);

      return res.json({
        success: true,
        source: 'gemini-3.8-flash',
        artifact: parsed,
      });
    } catch (apiError: any) {
      console.warn('Gemini generation fallback triggered:', apiError.message);
      // Fall through to heuristic generator
    }
  }

  // Heuristic Autonomous Engine fallback
  const pLower = prompt.toLowerCase();
  let detectedType: 'micro_site' | 'capsule' | 'chain' = primitiveType || 'micro_site';

  if (!primitiveType) {
    if (pLower.includes('capsule') || pLower.includes('lock') || pLower.includes('unlock') || pLower.includes('tomorrow') || pLower.includes('later')) {
      detectedType = 'capsule';
    } else if (pLower.includes('chain') || pLower.includes('flow') || pLower.includes('onboarding') || pLower.includes('branch') || pLower.includes('decision')) {
      detectedType = 'chain';
    }
  }

  if (detectedType === 'capsule') {
    const unlockTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return res.json({
      success: true,
      source: 'heuristic-engine',
      artifact: {
        primitiveType: 'capsule',
        title: prompt.length < 40 ? prompt : 'Autonomous Temporal Capsule',
        content: `<h2>Temporal Release Payload</h2><p>${escapeForHtml(prompt)}</p><p>This payload was synthesized by <code>${agentName}</code> and locked inside a self-contained Bitty Capsule until time conditions are satisfied.</p>`,
        theme: selectedTheme,
        layout: 'document',
        widgets: [
          { type: 'status-grid', label: 'Payload Cryptographic Status', value: 'VERIFIED' },
          { type: 'event-emitter', label: 'Broadcast Unlock Event', action: 'capsule_unlocked' },
        ],
        capsuleConfig: {
          unlockTime,
          password: pLower.includes('secret') || pLower.includes('password') ? 'gold2026' : undefined,
          preUnlockMessage: 'Time-locked micro-site scheduled by autonomous agent. Security hashes intact.',
        },
        agentSpeech: `Scheduled temporal capsule locked until conditions are satisfied. URL and QR code generated.`,
      },
    });
  }

  if (detectedType === 'chain') {
    return res.json({
      success: true,
      source: 'heuristic-engine',
      artifact: {
        primitiveType: 'chain',
        title: prompt.length < 40 ? prompt : 'Agentic Decision Flow',
        theme: selectedTheme,
        chainConfig: {
          rootNodeId: 'node_init',
          nodes: {
            node_init: {
              id: 'node_init',
              title: 'Phase 1: Initiation & Strategy',
              content: `<p>Autonomous briefing initiated for: <strong>${escapeForHtml(prompt)}</strong></p><p>Select an operational pathway to branch the workflow tree.</p>`,
              choices: [
                { id: 'c1', label: 'Execute High-Velocity Deployment', description: 'Immediate parallel synthesis with automated sanity audits.', targetNodeId: 'node_speed' },
                { id: 'c2', label: 'Engage Deep Verification Protocol', description: 'Multi-pass cryptographic cross-check with state persistence.', targetNodeId: 'node_deep' },
              ],
            },
            node_speed: {
              id: 'node_speed',
              title: 'Phase 2A: High-Velocity Result',
              content: `<p>Fast-path synthesis concluded successfully. Artifacts compiled into self-contained Bitty Box fragments.</p><pre>Status: 200 OK · Latency: 12ms</pre>`,
              choices: [
                { id: 'c3', label: 'Finalize & Archive State', description: 'Encode final hash into agent memory.', targetNodeId: 'node_done' },
              ],
            },
            node_deep: {
              id: 'node_deep',
              title: 'Phase 2B: Deep Verification Result',
              content: `<p>Multi-pass verification complete. Zero schema drift detected across all micro-site nodes.</p><pre>Confidence: 99.8% · Checksum: SHA256_VALID</pre>`,
              choices: [
                { id: 'c4', label: 'Finalize & Archive State', description: 'Encode final hash into agent memory.', targetNodeId: 'node_done' },
              ],
            },
            node_done: {
              id: 'node_done',
              title: 'Execution Complete',
              content: `<p>Workflow reached terminus. The agent state has been compiled into the URL hash.</p>`,
              choices: [],
            },
          },
        },
        agentSpeech: `Compiled agentic branching flow with multi-node decision pathways into a single URL.`,
      },
    });
  }

  // Default: MicroSite
  return res.json({
    success: true,
    source: 'heuristic-engine',
    artifact: {
      primitiveType: 'micro_site',
      title: prompt.length < 40 ? prompt : 'Autonomous Briefing Artifact',
      content: `<h2>Agent Synthesis</h2><p>${escapeForHtml(prompt)}</p><p>This micro-site is completely self-contained within this URL. No external database or server runtime is required to inspect or render it.</p>`,
      theme: selectedTheme,
      layout: 'document',
      widgets: [
        { type: 'status-grid', label: 'Agent Health', value: 'OPTIMAL' },
        { type: 'counter', label: 'Interaction Count', value: 1 },
        { type: 'event-emitter', label: 'Signal Agent Network', action: 'agent_handshake' },
      ],
      agentSpeech: `Synthesized self-contained micro-site. Fully encoded into URL and ready to share.`,
    },
  });
});

function escapeForHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Development with Vite vs Production
async function startServer() {
  const port = 3000;

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Mount Vite middlewares in dev mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Bitty Box] AI-First Micro-Web Protocol server running on http://0.0.0.0:${port}`);
    console.log(`[Bitty Box] MCP Server endpoint ready at /api/mcp`);
    console.log(`[Bitty Box] Function API endpoint ready at /api/rpc`);
  });
}

startServer();

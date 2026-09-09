import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { buildMcpServer } from './mcp-server.js';
import { validateApiKey, deductCreditsEnforced } from '../lib/account-store.js';
import { calculateBoxCreditCost, calculateChainCreditCost } from '../lib/credit-costs.js';

function calculateMcpCreditCost(body) {
  const calls = Array.isArray(body) ? body : [body];
  return calls.reduce((sum, message) => {
    if (message?.method !== 'tools/call') return sum;
    const toolName = message.params?.name;
    const args = message.params?.arguments || {};
    if (toolName === 'create_bitty_chain' || toolName === 'create_box_chain') {
      return sum + calculateChainCreditCost(args.pages || []).totalCost;
    }
    if (toolName === 'create_bitty_link') {
      return sum + calculateBoxCreditCost(args);
    }
    return sum;
  }, 0);
}

/**
 * Handle incoming MCP Streamable HTTP requests on Express
 */
export async function handleMcpHttpRequest(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Mcp-Session-Id, MCP-Protocol-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check and deduct credits for authenticated MCP box generation requests
  const authHeader = req.headers['authorization'] || '';
  const apiKey = req.headers['x-api-key'] || (authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '');
  if (apiKey && apiKey.startsWith('bb_live_')) {
    const val = validateApiKey(apiKey);
    if (val.valid && val.user) {
      const creditCost = calculateMcpCreditCost(req.body);
      if (creditCost > 0) {
        try {
          await deductCreditsEnforced(val.user.id, creditCost, 'mcp', `MCP Box Generation (${creditCost} CR)`);
        } catch (err) {
          if (err?.code === 'INSUFFICIENT_CREDITS') {
            return res.status(err.status || 402).json({
              jsonrpc: '2.0',
              error: {
                code: -32002,
                message: err.message,
                data: {
                  code: err.code,
                  creditsRequired: err.creditsRequired,
                  creditsAvailable: err.creditsAvailable,
                },
              },
              id: req.body?.id ?? null,
            });
          }
          throw err;
        }
      }
    }
  }

  // Construct Web-standard Request from Express req
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || '127.0.0.1';
  const fullUrl = `${protocol}://${host}${req.originalUrl || req.url}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(v => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  }

  // Ensure Accept header meets MCP SDK requirements
  const accept = headers.get('accept') || '';
  if (!accept.includes('application/json') && !accept.includes('text/event-stream')) {
    headers.set('accept', 'application/json, text/event-stream');
  }

  let body = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
      body = req.body;
    } else if (req.body && typeof req.body === 'object') {
      body = JSON.stringify(req.body);
    }
  }

  const webRequest = new Request(fullUrl, {
    method: req.method,
    headers,
    body
  });

  try {
    const server = buildMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    await server.connect(transport);
    const webResponse = await transport.handleRequest(webRequest);

    res.status(webResponse.status);
    webResponse.headers.forEach((v, k) => {
      res.setHeader(k, v);
    });

    const responseText = await webResponse.text();
    res.send(responseText);
  } catch (err) {
    console.error('[bitty-mcp] Error handling MCP HTTP request:', err);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: `Internal error: ${err.message}`
      },
      id: null
    });
  }
}

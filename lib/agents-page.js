const BASE_URL = 'https://bittybox.org';
const MCP_TOOLS = [
  'create_bitty_link',
  'create_bitty_chain',
  'create_box_chain',
  'create_code_bitty_link',
  'create_markdown_bitty_link',
  'create_html_bitty_link',
  'decode_bitty_link',
  'list_supported_formats',
  'create_box',
  'set_password_lock',
  'set_time_lock',
  'set_access_limit',
  'set_invite_only',
  'publish_box',
  'list_boxes',
  'unlock_box',
  'delete_box',
];

export function getAgentDiscovery() {
  return {
    name: 'bittybox-agent-handshake',
    title: 'Bitty Box Agent Handshake',
    protocol: 'bittybox-url-native-micro-web',
    version: '2.0.0',
    baseUrl: BASE_URL,
    primaryHumanSurface: '/edit',
    discovery: {
      html: '/agents',
      json: '/agents.json',
      wellKnown: '/.well-known/bittybox-agent.json',
      capabilities: '/api/agent/capabilities',
      apiDocs: '/api/docs',
    },
    authentication: {
      optionalForPublicCreate: true,
      headerOptions: ['Authorization: Bearer <YOUR_API_KEY>', 'X-API-Key: <YOUR_API_KEY>'],
      apiKeyPrefix: 'bb_live_',
      manageKeys: '/accounts',
      note: 'Unauthenticated creation works for public URL-native links. Account/API-key calls can attribute links, use credits, and manage server-gated boxes.',
    },
    mcp: {
      endpoint: '/mcp',
      alternateEndpoint: '/api/mcp',
      absoluteEndpoint: `${BASE_URL}/mcp`,
      transport: 'streamable-http',
      protocolVersionHeader: 'MCP-Protocol-Version',
      acceptHeader: 'application/json, text/event-stream',
      tools: MCP_TOOLS,
    },
    rest: {
      createUrl: { methods: ['POST', 'GET'], path: '/api/agent/url', canonical: '/api/bitty/create' },
      createChain: { methods: ['POST', 'GET'], path: '/api/agent/chain', canonical: '/api/bitty/chain' },
      createBoxChain: { methods: ['POST', 'GET'], path: '/api/agent/box-chain', canonical: '/api/bitty/box-chain' },
      inspectUrl: { methods: ['POST', 'GET'], path: '/api/agent/inspect', canonical: '/api/bitty/decode' },
      validatePayload: { methods: ['POST'], path: '/api/agent/validate' },
      formats: { methods: ['GET'], path: '/api/bitty/formats' },
      boxes: {
        create: { methods: ['POST'], path: '/api/boxes' },
        status: { methods: ['GET'], path: '/api/boxes/:id/status' },
        unlock: { methods: ['POST'], path: '/api/boxes/:id/unlock' },
        payload: { methods: ['GET'], path: '/api/boxes/:id/payload?grant=<TOKEN>' },
      },
    },
    payload: {
      acceptedInputs: ['content', 'code', 'markdown', 'html', 'json', 'svg', 'pages'],
      formats: ['auto', 'text', 'markdown', 'code', 'html', 'json', 'svg', 'canvas', 'recipe'],
      linkModel: 'The payload is compressed into the URL hash. Browser hash fragments are shareable and visible to anyone holding the link.',
      chainModel: 'Pass pages[] to create a Box Chain. Each page accepts content, title, format, language, theme, description, favicon, image, password, and Studio-compatible lockConfig metadata.',
      recommendedUrlLengthBudget: 12000,
      hardRequestBodyLimit: '15mb',
      encryption: 'Pass password to create AES-256-GCM encrypted URL payloads. Do not place live secrets in unencrypted boxes.',
    },
    agentInstructions: [
      'Use /mcp when your runtime supports MCP Streamable HTTP; otherwise use POST /api/agent/url.',
      'Use create_bitty_chain, create_box_chain, POST /api/agent/chain, or POST /api/agent/box-chain for multi-box chains.',
      'Prefer POST for non-trivial payloads; use GET only for tiny smoke tests.',
      'Set format explicitly when you already know the artifact type; use auto only when handing Bitty Box raw mixed content.',
      'For executable HTML, include a complete document with its own CSS and JS. The resulting URL renders in a sandboxed browser surface.',
      'For private or time/limit-gated delivery, create a URL first, then wrap it with /api/boxes and lock endpoints.',
      'Do not encode API keys, OAuth tokens, private customer data, or credentials unless the payload is encrypted and the recipient has the password through a separate channel.',
      'If urlLength is high, shorten assets, externalize heavy media, or wrap the payload in a server-gated box instead of forcing a monster URL.',
    ],
    warnings: [
      'URL-native links are portable but not secret. Treat unencrypted URLs as public bearer artifacts.',
      'Very long URLs may fail in some chat apps, QR scanners, mobile browsers, or redirectors.',
      'Server-gated boxes enforce locks at unlock time; URL-only links are enforced only by their encoded encryption state.',
      'Generated HTML runs inside the Bitty Box viewer context; never assume it has access to third-party cookies or hidden server credentials.',
    ],
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function codeBlock(id, code) {
  return `<pre class="code-block"><button class="copy-btn" onclick="copyBlock('${id}')">Copy</button><code id="${id}">${escapeHtml(code)}</code></pre>`;
}

export function renderAgentsPage() {
  const discovery = getAgentDiscovery();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Bitty Box Agent Handshake',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    url: `${BASE_URL}/agents`,
    description: 'Agent-facing Bitty Box protocol page for MCP and REST creation of portable URL-native micro-web apps.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  const mcpConfig = `{
  "mcpServers": {
    "bittybox": {
      "type": "http",
      "url": "https://bittybox.org/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_API_KEY>",
        "Accept": "application/json, text/event-stream",
        "MCP-Protocol-Version": "2025-06-18"
      }
    }
  }
}`;

  const restCreate = `curl -sS https://bittybox.org/api/agent/url \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer <YOUR_API_KEY>' \\
  -d '{
    "title": "agent-built-demo",
    "format": "html",
    "content": "<!doctype html><html><body><h1>Hello from an agent</h1></body></html>",
    "theme": "dark"
  }'`;

  const restChain = `curl -sS https://bittybox.org/api/agent/box-chain \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer <YOUR_API_KEY>' \\
  -d '{
    "title": "agent-chain-demo",
    "pages": [
      { "title": "Intro", "format": "markdown", "content": "# Intro\\nStart here.", "favicon": "📦" },
      { "title": "Code", "format": "code", "language": "javascript", "content": "console.log(\\"next box\\");" },
      { "title": "Finish", "format": "html", "content": "<h1>Done</h1><p>Last box.</p>" }
    ]
  }'`;

  const restInspect = `curl -sS https://bittybox.org/api/agent/inspect \\
  -H 'Content-Type: application/json' \\
  -d '{ "url": "https://bittybox.org/#agent-built-demo/data:text/html;charset=utf-8;format=gz;base64,<payload>" }'`;

  const boxLock = `# 1) Create a URL-native Bitty link with /api/agent/url.
# 2) Wrap it as a server-gated box.
curl -sS https://bittybox.org/api/boxes \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer <YOUR_API_KEY>' \\
  -d '{
    "title": "client-deliverable",
    "bittyUrl": "<BITTY_URL>",
    "lockConfig": {
      "timeWindow": { "enabled": true, "notAfter": "2026-12-31T23:59:00Z" },
      "openLimit": { "enabled": true, "maxOpens": 5 }
    }
  }'`;

  const validate = `curl -sS https://bittybox.org/api/agent/validate \\
  -H 'Content-Type: application/json' \\
  -d '{ "format": "markdown", "content": "# Launch brief\\nShip the weird thing." }'`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bitty Box Agent Handshake — API &amp; MCP for AI Agents</title>
  <meta name="description" content="Everything an AI agent needs to create Bitty Box URL-native micro-web apps through REST or MCP.">
  <link rel="icon" type="image/png" href="/favicon.png">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <style>
    :root { color-scheme: dark; --bg: #050711; --panel: rgba(12, 18, 38, 0.82); --panel-2: rgba(3, 7, 18, 0.84); --line: rgba(125, 211, 252, 0.24); --text: #e5f7ff; --muted: #9bb3c7; --cyan: #22d3ee; --blue: #60a5fa; --green: #34d399; --pink: #f472b6; --warn: #fbbf24; --mono: 'SFMono-Regular', 'JetBrains Mono', Consolas, monospace; --sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: radial-gradient(circle at 20% 0%, rgba(34, 211, 238, 0.18), transparent 32rem), radial-gradient(circle at 88% 12%, rgba(96, 165, 250, 0.14), transparent 28rem), linear-gradient(135deg, #020617 0%, #08111f 52%, #030712 100%); color: var(--text); font-family: var(--sans); }
    a { color: var(--cyan); text-decoration: none; } a:hover { text-decoration: underline; }
    .nav { position: sticky; top: 0; z-index: 10; backdrop-filter: blur(18px); background: rgba(3, 7, 18, 0.72); border-bottom: 1px solid var(--line); }
    .nav-inner { max-width: 1180px; margin: 0 auto; padding: 0.9rem 1.25rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .brand { display: flex; align-items: center; gap: 0.7rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
    .brand img { width: 30px; height: 30px; border-radius: 8px; }
    .nav-links { display: flex; align-items: center; gap: 0.95rem; flex-wrap: wrap; color: var(--muted); font-size: 0.9rem; }
    .wrap { max-width: 1180px; margin: 0 auto; padding: 3.2rem 1.25rem 5rem; }
    .hero { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr); gap: 2rem; align-items: stretch; margin-bottom: 2rem; }
    .eyebrow { display: inline-flex; align-items: center; gap: 0.4rem; border: 1px solid var(--line); background: rgba(34, 211, 238, 0.08); color: var(--cyan); padding: 0.4rem 0.7rem; border-radius: 999px; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800; }
    h1 { font-size: clamp(2.6rem, 6vw, 5.7rem); line-height: 0.92; letter-spacing: -0.06em; margin: 1.1rem 0 1rem; }
    h2 { font-size: clamp(1.35rem, 2.5vw, 2rem); margin: 0 0 0.7rem; letter-spacing: -0.03em; }
    h3 { margin: 0 0 0.35rem; font-size: 1rem; }
    p { color: var(--muted); line-height: 1.65; }
    .lead { font-size: 1.15rem; max-width: 760px; }
    .panel { background: linear-gradient(180deg, var(--panel), rgba(8, 13, 28, 0.7)); border: 1px solid var(--line); border-radius: 24px; padding: 1.45rem; box-shadow: 0 24px 80px rgba(0,0,0,0.28); }
    .hero-card { display: flex; flex-direction: column; justify-content: space-between; gap: 1rem; }
    .status-grid { display: grid; grid-template-columns: 1fr; gap: 0.8rem; }
    .chip { border: 1px solid rgba(52, 211, 153, 0.28); background: rgba(52, 211, 153, 0.08); border-radius: 16px; padding: 0.85rem; }
    .chip b { display: block; color: var(--green); font-family: var(--mono); font-size: 0.82rem; margin-bottom: 0.25rem; }
    .cta-row { display: flex; gap: 0.8rem; flex-wrap: wrap; margin-top: 1.4rem; }
    .button { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; padding: 0.82rem 1rem; font-weight: 850; border: 1px solid var(--line); background: rgba(255,255,255,0.05); color: var(--text); }
    .button.primary { background: linear-gradient(135deg, var(--cyan), var(--blue)); color: #020617; border: 0; }
    .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1rem; margin-top: 1rem; }
    .span-4 { grid-column: span 4; } .span-6 { grid-column: span 6; } .span-8 { grid-column: span 8; } .span-12 { grid-column: span 12; }
    .mini { border: 1px solid rgba(148, 163, 184, 0.18); background: rgba(15, 23, 42, 0.58); border-radius: 18px; padding: 1rem; }
    .mini .k { color: var(--cyan); font-family: var(--mono); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; }
    .code-block { position: relative; margin: 0.9rem 0 0; padding: 1.1rem; overflow: auto; border-radius: 16px; border: 1px solid rgba(125, 211, 252, 0.2); background: var(--panel-2); color: #dff8ff; font-family: var(--mono); font-size: 0.82rem; line-height: 1.55; white-space: pre; }
    .copy-btn { position: absolute; top: 0.75rem; right: 0.75rem; border: 1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.08); color: #fff; border-radius: 10px; padding: 0.35rem 0.55rem; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 18px; }
    th, td { text-align: left; padding: 0.85rem; border-bottom: 1px solid rgba(148, 163, 184, 0.16); vertical-align: top; }
    th { color: var(--cyan); font-size: 0.76rem; letter-spacing: 0.09em; text-transform: uppercase; }
    td code, .inline-code { font-family: var(--mono); color: #e0f2fe; background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(125, 211, 252, 0.16); border-radius: 8px; padding: 0.12rem 0.35rem; }
    ul { color: var(--muted); line-height: 1.65; padding-left: 1.2rem; }
    .warning { border-color: rgba(251, 191, 36, 0.34); background: rgba(251, 191, 36, 0.07); }
    .warning h3 { color: var(--warn); }
    @media (max-width: 900px) { .hero { grid-template-columns: 1fr; } .span-4, .span-6, .span-8 { grid-column: span 12; } .nav-inner { align-items: flex-start; flex-direction: column; } }
  </style>
</head>
<body>
  <nav class="nav">
    <div class="nav-inner">
      <a href="/" class="brand"><img src="/favicon.png" alt="Bitty Box"><span>Bitty Box</span></a>
      <div class="nav-links">
        <a href="/edit">Human Creator</a>
        <a href="/agents" aria-current="page">Agents</a>
        <a href="/agents.json">Discovery JSON</a>
        <a href="/api/docs">API Docs</a>
        <a href="/mcp">MCP Endpoint</a>
      </div>
    </div>
  </nav>

  <main class="wrap">
    <section class="hero">
      <div>
        <span class="eyebrow">🤖 Agent-native creation protocol</span>
        <h1>Bitty Box Agent Handshake</h1>
        <p class="lead">Everything an AI agent needs to create, inspect, lock, and hand off portable micro-web apps through Bitty Box. Use MCP when your agent runtime supports tools; use REST when you need raw HTTP. The human surface stays <a href="/edit">/edit</a>. The agent layer runs underneath it like a mischievous compression engine.</p>
        <div class="cta-row">
          <a class="button primary" href="/agents.json">Read machine discovery</a>
          <a class="button" href="/api/docs">Open full API docs</a>
          <a class="button" href="/accounts">Manage API keys</a>
        </div>
      </div>
      <aside class="panel hero-card">
        <div>
          <h2>Fast path</h2>
          <p>Give Bitty Box content. Get back a URL that carries the app itself.</p>
        </div>
        <div class="status-grid">
          <div class="chip"><b>MCP</b><span class="inline-code">https://bittybox.org/mcp</span></div>
          <div class="chip"><b>REST create</b><span class="inline-code">POST /api/agent/url</span></div>
          <div class="chip"><b>REST chain</b><span class="inline-code">POST /api/agent/box-chain</span></div>
          <div class="chip"><b>Human creator</b><span class="inline-code">/edit</span></div>
        </div>
      </aside>
    </section>

    <section class="grid">
      <div class="panel span-12">
        <h2>Agent decision tree</h2>
        <div class="grid">
          <div class="mini span-4"><div class="k">01 / Tools</div><h3>Your runtime speaks MCP?</h3><p>Connect to <code>/mcp</code> and call <code>create_html_bitty_link</code>, <code>create_markdown_bitty_link</code>, <code>create_bitty_chain</code>, or <code>create_box_chain</code>.</p></div>
          <div class="mini span-4"><div class="k">02 / HTTP</div><h3>Only have fetch/curl?</h3><p>POST content to <code>/api/agent/url</code>. It is a clean agent alias for <code>/api/bitty/create</code>.</p></div>
          <div class="mini span-4"><div class="k">03 / Gates</div><h3>Need locks or limits?</h3><p>Create the URL first, then wrap it with <code>/api/boxes</code> and lock endpoints for password, time, opens, or invite-only control.</p></div>
        </div>
      </div>

      <div class="panel span-6">
        <h2>MCP client configuration</h2>
        <p>Use Streamable HTTP. API keys are optional for public link creation but recommended for attribution, credits, and box management.</p>
        ${codeBlock('mcp-config', mcpConfig)}
      </div>

      <div class="panel span-6">
        <h2>REST create URL</h2>
        <p>For agents without MCP, POST a payload and receive a portable Bitty Box URL plus stats, QR data, warnings, and embed snippets.</p>
        ${codeBlock('rest-create', restCreate)}
      </div>

      <div class="panel span-6">
        <h2>REST create Box Chain</h2>
        <p>POST ordered <code>pages</code> and receive an entry URL plus every chained box URL. The first URL links to the second, and so on.</p>
        ${codeBlock('rest-chain', restChain)}
      </div>

      <div class="panel span-6">
        <h2>Inspect / decode a Bitty link</h2>
        <p>Use this before modifying an existing Bitty Box link or when a user drops you a URL and asks for a change.</p>
        ${codeBlock('rest-inspect', restInspect)}
      </div>

      <div class="panel span-6">
        <h2>Validate before generating</h2>
        <p>Cheap preflight for content size, detected format, and URL-risk hints. Use it when your agent is about to shove a whale through a straw.</p>
        ${codeBlock('rest-validate', validate)}
      </div>

      <div class="panel span-12">
        <h2>Core endpoints</h2>
        <table>
          <thead><tr><th>Use</th><th>Endpoint</th><th>Notes</th></tr></thead>
          <tbody>
            <tr><td>Create URL-native artifact</td><td><code>POST /api/agent/url</code><br><code>POST /api/bitty/create</code></td><td>Fields: <code>content</code>, <code>title</code>, <code>format</code>, <code>language</code>, <code>theme</code>, <code>password</code>, <code>editable</code>.</td></tr>
            <tr><td>Create Box Chain</td><td><code>POST /api/agent/box-chain</code><br><code>POST /api/agent/chain</code><br><code>POST /api/bitty/box-chain</code><br><code>POST /api/bitty/chain</code></td><td>Fields: <code>pages[]</code>, optional <code>title</code>, <code>chainId</code>, <code>domain</code>. Page fields match the human Studio model.</td></tr>
            <tr><td>Inspect/decode</td><td><code>POST /api/agent/inspect</code><br><code>POST /api/bitty/decode</code></td><td>Fields: <code>url</code>, optional <code>password</code>. Chain metadata is returned when present.</td></tr>
            <tr><td>Capabilities</td><td><code>GET /api/agent/capabilities</code><br><code>GET /agents.json</code></td><td>Machine-readable discovery contract for crawlers and agents.</td></tr>
            <tr><td>Formats</td><td><code>GET /api/bitty/formats</code></td><td>Supported renderers and feature flags.</td></tr>
            <tr><td>MCP tools</td><td><code>POST /mcp</code></td><td>Streamable HTTP MCP server. Use <code>Accept: application/json, text/event-stream</code>.</td></tr>
            <tr><td>Lockable boxes</td><td><code>POST /api/boxes</code><br><code>POST /api/boxes/:id/lock/password</code><br><code>POST /api/boxes/:id/lock/time</code><br><code>POST /api/boxes/:id/lock/access-limit</code></td><td>Wrap a Bitty URL with server-gated policy when a raw public URL is too exposed.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="panel span-8">
        <h2>MCP tool surface</h2>
        <div class="grid">
          ${discovery.mcp.tools.map((tool) => `<div class="mini span-4"><div class="k">tool</div><h3><code>${tool}</code></h3></div>`).join('')}
        </div>
      </div>

      <div class="panel span-4 warning">
        <h2>Rules agents must not break</h2>
        <ul>
          ${discovery.agentInstructions.slice(0, 6).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>

      <div class="panel span-6">
        <h2>Lockable box handoff</h2>
        <p>Use boxes when you need server-side expiry, limited opens, password locks, invite-only access, or a future policy wrapper.</p>
        ${codeBlock('box-lock', boxLock)}
      </div>

      <div class="panel span-6 warning">
        <h2>Security &amp; portability warnings</h2>
        <ul>
          ${discovery.warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
    </section>
  </main>

  <script>
    function copyBlock(id) {
      const el = document.getElementById(id);
      if (!el) return;
      navigator.clipboard.writeText(el.innerText).then(() => {
        const button = el.parentElement && el.parentElement.querySelector('button');
        if (button) {
          const old = button.textContent;
          button.textContent = 'Copied';
          setTimeout(() => { button.textContent = old; }, 1200);
        }
      });
    }
  </script>
</body>
</html>`;
}

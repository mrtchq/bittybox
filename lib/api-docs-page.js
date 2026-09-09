export function renderApiDocsPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API &amp; MCP Server Documentation — Bitty Box</title>
  <link rel="icon" type="image/png" href="https://subpagebucket.s3.eu-north-1.amazonaws.com/library/934/662688fd-f782-4799-bf47-ccb19209b841.png" id="favicon">
  <link rel="stylesheet" href="/hybrid-theme.css">
  <style>
    .docs-container {
      max-width: 1100px;
      margin: 0 auto 5rem;
      padding: 0 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
    }

    .hero-docs {
      text-align: center;
      padding: 2rem 0 1rem;
    }

    .hero-docs h1 {
      font-family: var(--font-title);
      font-size: 2.6rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 0.75rem;
    }

    .section-box {
      padding: 2rem;
    }

    .section-title {
      font-family: var(--font-title);
      font-size: 1.35rem;
      font-weight: 700;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      border-bottom: 1px solid var(--glass-border);
      padding-bottom: 0.75rem;
    }

    pre.code-block {
      background: #030712;
      color: #f3f4f6;
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      padding: 1.25rem;
      font-family: var(--font-mono);
      font-size: 0.85rem;
      line-height: 1.55;
      overflow-x: auto;
      margin: 0.75rem 0;
      position: relative;
    }

    .copy-btn-corner {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      border-radius: 6px;
      padding: 0.3rem 0.6rem;
      font-size: 0.75rem;
      cursor: pointer;
    }
    .copy-btn-corner:hover { background: rgba(255, 255, 255, 0.2); }

    .method-badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      font-family: var(--font-title);
    }
    .method-post { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
    .method-get { background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); }

    .tool-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .tool-item {
      background: var(--neu-inset-shadow);
      border-radius: 14px;
      padding: 1.25rem;
      border: 1px solid var(--glass-subtle);
    }

    .tool-name {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 1rem;
      color: var(--accent-blue);
      margin-bottom: 0.25rem;
    }
  </style>
</head>
<body>

  <!-- Navigation Bar -->
  <nav class="navbar-glass">
    <a href="/" class="nav-brand" style="display:inline-flex;align-items:center;gap:0.6rem;">
      <img src="https://subpagebucket.s3.eu-north-1.amazonaws.com/library/934/662688fd-f782-4799-bf47-ccb19209b841.png" alt="Bitty Box" style="width:24px;height:24px;object-fit:contain;border-radius:4px;">
      <span>BITTY BOX</span>
    </a>
    <div class="nav-links">
      <a href="/" class="nav-link">⚡ Create</a>
      <a href="/accounts" class="nav-link">🔑 Accounts &amp; Keys</a>
      <a href="/api/docs" class="nav-link active">🤖 MCP Server</a>
      <a href="/api/docs" class="nav-link active">📡 API Docs</a>
      <a href="/edit" class="nav-link">✏️ Rich Editor</a>
      <a href="/history" class="nav-link">📜 History</a>
      <button class="theme-toggle-btn" onclick="toggleTheme()" id="themeBtn" title="Toggle Theme">🌓</button>
    </div>
  </nav>

  <div class="docs-container">

    <div class="hero-docs">
      <div class="badge-tag blue" style="margin-bottom: 0.5rem;">Developer &amp; Agent Documentation</div>
      <h1>REST API &amp; Model Context Protocol</h1>
      <p style="color: var(--text-muted); font-size: 1.1rem; max-width: 650px; margin: 0 auto 1.5rem;">
        Complete developer guide to programmatic micro-site compression, decoding, and AI agent integration.
      </p>

      <div style="display: flex; justify-content: center; gap: 1rem;">
        <div class="btn-wrapper btn-sm" style="--width: 200px;">
          <a href="/accounts" class="btn">
            <span class="btn-txt">🔑 Manage API Keys</span>
            <div class="dot pulse"></div>
          </a>
        </div>
      </div>
    </div>

    <!-- MCP Section -->
    <div class="glass-panel section-box">
      <div class="section-title">
        <span>🤖</span> Model Context Protocol (MCP) Server
      </div>
      <p style="color: var(--text-muted); margin-bottom: 1.25rem;">
        Bitty Box exposes an official MCP Server that gives AI agents the tool to generate and render any text, code, or mini-app link on demand.
      </p>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
        <div class="stat-card">
          <div class="stat-sub">Streamable HTTP Transport</div>
          <strong style="font-family: var(--font-mono); font-size: 13px;">https://bittybox.org/mcp</strong>
        </div>
        <div class="stat-card">
          <div class="stat-sub">Local Stdio Executable</div>
          <strong style="font-family: var(--font-mono); font-size: 13px;">/usr/local/bin/bitty-mcp</strong>
        </div>
      </div>

      <h3 style="font-family: var(--font-title); font-size: 1.05rem; margin-bottom: 0.5rem;">MCP Client Configuration (.mcp.json)</h3>
      <pre class="code-block"><button class="copy-btn-corner" onclick="copyBlock('mcp-doc-cfg')">📋 Copy</button><code id="mcp-doc-cfg">{
  "mcpServers": {
    "bittybox": {
      "type": "http",
      "url": "https://bittybox.org/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_API_KEY>",
        "Accept": "application/json, text/event-stream"
      }
    }
  }
}</code></pre>

      <h3 style="font-family: var(--font-title); font-size: 1.05rem; margin: 1.5rem 0 0.75rem;">Exposed MCP Tools</h3>
      <div class="tool-list">
        <div class="tool-item">
          <div class="tool-name">create_bitty_link</div>
          <div style="font-size: 0.9rem; color: var(--text-muted);">
            Universal tool for encoding text, code, markdown, HTML, SVG, or JSON into a permanent compressed Bitty link.
          </div>
        </div>
        <div class="tool-item">
          <div class="tool-name">create_bitty_chain</div>
          <div style="font-size: 0.9rem; color: var(--text-muted);">
            Sequential multi-page Box Chain generator (slide decks, multi-step code walkthroughs, progressive tutorials, and chained workflows).
          </div>
        </div>
        <div class="tool-item">
          <div class="tool-name">create_box_chain</div>
          <div style="font-size: 0.9rem; color: var(--text-muted);">
            Agent-discoverable alias for creating human Studio-compatible Box Chains with ordered pages and per-page metadata.
          </div>
        </div>
        <div class="tool-item">
          <div class="tool-name">create_code_bitty_link</div>
          <div style="font-size: 0.9rem; color: var(--text-muted);">
            Syntax-highlighted code viewer with line numbers, copy button, and file download (Python, TypeScript, Rust, Go, SQL, Bash, etc.).
          </div>
        </div>
        <div class="tool-item">
          <div class="tool-name">create_markdown_bitty_link</div>
          <div style="font-size: 0.9rem; color: var(--text-muted);">
            Rich GitHub-flavored markdown documents with tables, checklists, blockquotes, code blocks, and dark/light themes.
          </div>
        </div>
        <div class="tool-item">
          <div class="tool-name">create_html_bitty_link</div>
          <div style="font-size: 0.9rem; color: var(--text-muted);">
            Sandboxed interactive mini-web applications, calculators, widgets, and charts.
          </div>
        </div>
        <div class="tool-item">
          <div class="tool-name">decode_bitty_link</div>
          <div style="font-size: 0.9rem; color: var(--text-muted);">
            Decompresses and extracts original content, title, and metadata from any Bitty link.
          </div>
        </div>
      </div>
    </div>

    <!-- REST API Reference -->
    <div class="glass-panel section-box">
      <div class="section-title">
        <span>📡</span> REST API Reference
      </div>

      <div style="margin-bottom: 2rem;">
        <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem;">
          <span class="method-badge method-post">POST</span>
          <code style="font-size: 1rem; font-weight: 700;">/api/bitty/create</code>
        </div>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Create a compressed Bitty Link.</p>
        <pre class="code-block"><button class="copy-btn-corner" onclick="copyBlock('post-create-sample')">📋 Copy</button><code id="post-create-sample">// Request Body
{
  "content": "def greet(name):\n    return f'Hello, {name}!'",
  "title": "greet.py",
  "format": "code",          // "auto" | "code" | "markdown" | "html" | "json" | "svg"
  "language": "python",      // optional language
  "theme": "dark",           // "auto" | "dark" | "light"
  "password": ""             // optional AES-256-GCM passcode
}

// Response (200 OK)
{
  "success": true,
  "url": "https://bittybox.org/#greet.py/data:text/html;charset=utf-8;format=gz;base64,...",
  "title": "greet.py",
  "format": "code",
  "language": "python",
  "stats": {
    "rawBytes": 48,
    "renderedBytes": 7654,
    "compressedBytes": 2480,
    "urlLength": 3390,
    "compressionRatio": "68%"
  },
  "qrCodeUrl": "https://chart.googleapis.com/chart?...",
  "markdownLink": "[greet.py](https://bittybox.org/#greet.py/...)"
}</code></pre>
      </div>

      <div style="margin-bottom: 2rem;">
        <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem;">
          <span class="method-badge method-post">POST</span>
          <code style="font-size: 1rem; font-weight: 700;">/api/bitty/chain</code>
          <code style="font-size: 0.92rem; font-weight: 700;">/api/agent/box-chain</code>
        </div>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Create a sequential Box Chain of multiple linked Bitty Boxes. Each page can include the same metadata used by the human Studio chain creator.</p>
        <pre class="code-block"><button class="copy-btn-corner" onclick="copyBlock('post-chain-sample')">📋 Copy</button><code id="post-chain-sample">// Request Body
{
  "title": "Interactive Tutorial",
  "pages": [
    {
      "title": "1. Overview",
      "content": "# Overview\\nWelcome to the guide.",
      "format": "markdown",
      "description": "Start here",
      "favicon": "📦"
    },
    { "title": "2. Implementation", "content": "console.log('Step 2');", "format": "code", "language": "javascript" },
    {
      "title": "3. Summary",
      "content": "<h1>Complete</h1><p>You made it!</p>",
      "format": "html",
      "lockConfig": {
        "openLimit": { "enabled": true, "maxOpens": 3, "showRemainingCount": true }
      }
    }
  ]
}

// Response (200 OK)
{
  "success": true,
  "chainId": "bbc_...",
  "total": 3,
  "title": "1. Overview",
  "url": "https://bittybox.org/#/1.-Overview/ch/bbc_...~0~3/nx/.../data:...",
  "primaryUrl": "https://bittybox.org/#/1.-Overview/ch/bbc_...~0~3/nx/.../data:...",
  "urls": [
    "https://bittybox.org/#/1.-Overview/ch/bbc_...~0~3/nx/.../data:...",
    "https://bittybox.org/#/2.-Implementation/ch/bbc_...~1~3/nx/.../data:...",
    "https://bittybox.org/#/3.-Summary/ch/bbc_...~2~3/data:..."
  ],
  "pages": [ ... ],
  "aliases": ["/api/agent/chain", "/api/agent/box-chain"],
  "markdownLink": "[1. Overview (Box 1 of 3)](https://bittybox.org/...)"
}</code></pre>
      </div>

      <div>
        <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem;">
          <span class="method-badge method-post">POST</span>
          <code style="font-size: 1rem; font-weight: 700;">/api/bitty/decode</code>
        </div>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Decode an existing Bitty Link back to its original content.</p>
        <pre class="code-block"><button class="copy-btn-corner" onclick="copyBlock('post-decode-sample')">📋 Copy</button><code id="post-decode-sample">// Request Body
{
  "url": "https://bittybox.org/#greet.py/data:text/html;charset=utf-8;format=gz;base64,...",
  "password": "" // optional
}

// Response (200 OK)
{
  "success": true,
  "title": "greet.py",
  "mediatype": "text/html",
  "content": "<!DOCTYPE html>...",
  "byteLength": 7654
}</code></pre>
      </div>
    </div>

  </div>

  <script>
    function copyBlock(id) {
      const text = document.getElementById(id).innerText;
      navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'));
    }

    function toggleTheme() {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('bitty_theme', next);
    }
  </script>
</body>
</html>`;
}

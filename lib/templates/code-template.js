import hljs from 'highlight.js';

const EXTENSION_MAP = {
  python: 'py',
  javascript: 'js',
  typescript: 'ts',
  rust: 'rs',
  go: 'go',
  c: 'c',
  cpp: 'cpp',
  csharp: 'cs',
  java: 'java',
  kotlin: 'kt',
  swift: 'swift',
  php: 'php',
  ruby: 'rb',
  sql: 'sql',
  bash: 'sh',
  sh: 'sh',
  shell: 'sh',
  zsh: 'zsh',
  json: 'json',
  yaml: 'yaml',
  yml: 'yml',
  toml: 'toml',
  dockerfile: 'Dockerfile',
  html: 'html',
  css: 'css',
  scss: 'scss',
  markdown: 'md',
  xml: 'xml',
  diff: 'diff'
};

export function renderCodeToHtml(code, options = {}) {
  const title = options.title || 'Code Snippet';
  const lang = (options.language || detectLanguage(code, title)).toLowerCase();
  const theme = options.theme || 'dark';

  let highlighted = '';
  try {
    if (hljs.getLanguage(lang)) {
      highlighted = hljs.highlight(code, { language: lang }).value;
    } else {
      highlighted = hljs.highlightAuto(code).value;
    }
  } catch {
    highlighted = escapeHtml(code);
  }

  // Format line numbers
  const lines = code.split('\n');
  const lineCount = lines.length;
  const ext = EXTENSION_MAP[lang] || 'txt';
  const fileName = title.includes('.') ? title : `${title.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.${ext}`;

  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #0d1117;
      --card-bg: #161b22;
      --header-bg: #1f242c;
      --border: #30363d;
      --fg: #e6edf3;
      --muted: #8b949e;
      --accent: #58a6ff;
      --accent-hover: #79c0ff;
      --line-num: #484f58;
      --line-num-hover: #8b949e;
      --line-highlight: rgba(56, 139, 253, 0.1);
      --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    :root[data-theme="light"] {
      --bg: #f6f8fa;
      --card-bg: #ffffff;
      --header-bg: #f1f3f5;
      --border: #d0d7de;
      --fg: #1f2328;
      --muted: #656d76;
      --accent: #0969da;
      --accent-hover: #0550ae;
      --line-num: #8c959f;
      --line-num-hover: #1f2328;
      --line-highlight: rgba(9, 105, 218, 0.08);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--fg);
      font-family: var(--font-sans);
      padding: 1.5rem;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: background-color 0.2s, color 0.2s;
    }
    .code-container {
      width: 100%;
      max-width: 1100px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.25);
    }
    .code-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1.25rem;
      background: var(--header-bg);
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .file-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-family: var(--font-mono);
      font-size: 0.9rem;
      font-weight: 600;
    }
    .lang-badge {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      background: var(--accent);
      color: #ffffff;
      letter-spacing: 0.05em;
    }
    .meta-details {
      font-size: 0.8rem;
      color: var(--muted);
      font-weight: normal;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.75rem;
      font-size: 0.8rem;
      font-weight: 500;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--card-bg);
      color: var(--fg);
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .code-viewer {
      display: flex;
      overflow-x: auto;
      font-family: var(--font-mono);
      font-size: 14px;
      line-height: 1.6;
      padding: 1rem 0;
    }
    .line-numbers {
      user-select: none;
      text-align: right;
      padding: 0 1rem 0 1.25rem;
      color: var(--line-num);
      border-right: 1px solid var(--border);
      min-width: 3.5rem;
    }
    .line-numbers span {
      display: block;
    }
    .code-content {
      padding: 0 1.25rem;
      flex-grow: 1;
      white-space: pre;
    }
    .code-content.wrap {
      white-space: pre-wrap;
      word-break: break-word;
    }
    /* Highlight.js Dark theme */
    .hljs-comment, .hljs-quote { color: #8b949e; font-style: italic; }
    .hljs-keyword, .hljs-selector-tag, .hljs-subst { color: #ff7b72; font-weight: 600; }
    .hljs-number, .hljs-literal, .hljs-variable, .hljs-template-variable { color: #79c0ff; }
    .hljs-string, .hljs-doctag { color: #a5d6ff; }
    .hljs-title, .hljs-section, .hljs-selector-id { color: #d2a8ff; font-weight: 600; }
    .hljs-type, .hljs-class .hljs-title { color: #ffa657; font-weight: 600; }
    .hljs-attr, .hljs-attribute { color: #79c0ff; }
    .hljs-symbol, .hljs-bullet { color: #f2cc60; }
    .hljs-built_in, .hljs-builtin-name { color: #ffa657; }
    .hljs-meta { color: #d2a8ff; }
    .hljs-deletion { background: #ffebe9; }
    .hljs-addition { background: #dafbe1; }

    /* Light Theme Syntax overrides */
    :root[data-theme="light"] .hljs-comment { color: #6e7781; }
    :root[data-theme="light"] .hljs-keyword { color: #cf222e; }
    :root[data-theme="light"] .hljs-number { color: #0550ae; }
    :root[data-theme="light"] .hljs-string { color: #0a3069; }
    :root[data-theme="light"] .hljs-title { color: #8250df; }
    :root[data-theme="light"] .hljs-type { color: #953800; }

    @media (max-width: 600px) {
      body { padding: 0.75rem; }
      .code-header { flex-direction: column; align-items: flex-start; }
      .header-actions { width: 100%; justify-content: flex-start; flex-wrap: wrap; }
    }
  </style>
</head>
<body>
  <div class="code-container">
    <div class="code-header">
      <div class="file-info">
        <span class="lang-badge">${escapeHtml(lang)}</span>
        <span>${escapeHtml(fileName)}</span>
        <span class="meta-details">• ${lineCount} lines • ${formatBytes(code.length)}</span>
      </div>
      <div class="header-actions">
        <button class="btn" onclick="toggleWrap()" id="wrapBtn">🔀 Wrap</button>
        <button class="btn" onclick="toggleTheme()" id="themeBtn">🌓 Theme</button>
        <button class="btn" onclick="downloadFile()" id="downloadBtn">⬇️ Download</button>
        <button class="btn" onclick="copyCode()" id="copyBtn">📋 Copy</button>
      </div>
    </div>
    <div class="code-viewer">
      <div class="line-numbers">
        ${Array.from({ length: lineCount }, (_, i) => `<span>${i + 1}</span>`).join('')}
      </div>
      <pre class="code-content" id="codeBlock"><code>${highlighted}</code></pre>
    </div>
  </div>

  <textarea id="raw-code" style="display:none;">${escapeHtml(code)}</textarea>

  <script>
    function copyCode() {
      const text = document.getElementById('raw-code').value;
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.innerText = '✓ Copied!';
        setTimeout(() => btn.innerText = '📋 Copy', 1800);
      });
    }

    function toggleTheme() {
      const html = document.documentElement;
      const cur = html.getAttribute('data-theme');
      html.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
    }

    function toggleWrap() {
      const block = document.getElementById('codeBlock');
      block.classList.toggle('wrap');
    }

    function downloadFile() {
      const text = document.getElementById('raw-code').value;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = ${JSON.stringify(fileName)};
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  </script>
</body>
</html>`;
}

function detectLanguage(code, title) {
  if (title && title.includes('.')) {
    const ext = title.split('.').pop().toLowerCase();
    for (const [l, e] of Object.entries(EXTENSION_MAP)) {
      if (e === ext || l === ext) return l;
    }
  }
  const snippet = code.trim().substring(0, 500);
  if (/^#!\/bin\/(bash|sh|zsh)/.test(snippet)) return 'bash';
  if (/^import\s+[\w{}*,\s]+\s+from\s+['"]/.test(snippet) || /^export\s+(const|function|class|default)/.test(snippet)) return 'javascript';
  if (/^def\s+\w+\s*\(|^import\s+\w+|^from\s+\w+\s+import/.test(snippet)) return 'python';
  if (/^fn\s+\w+\s*\(|^use\s+\w+::/.test(snippet)) return 'rust';
  if (/^package\s+\w+\s*\nfunc\s+/.test(snippet)) return 'go';
  if (/^SELECT\s+.*\s+FROM\s+/i.test(snippet) || /^CREATE\s+TABLE/i.test(snippet)) return 'sql';
  if (/^\{\s*"/.test(snippet) || /^\[\s*\{/.test(snippet)) return 'json';
  if (/^<!DOCTYPE html|<html[\s>]/i.test(snippet)) return 'html';
  return 'plaintext';
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(1) + ' KB';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

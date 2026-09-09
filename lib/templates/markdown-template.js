import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

const marked = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);

export function renderMarkdownToHtml(markdown, options = {}) {
  const title = options.title || 'Document';
  const theme = options.theme || 'auto'; // 'auto' | 'dark' | 'light'
  
  const parsedHtml = marked.parse(markdown, { gfm: true, breaks: true });
  
  // Estimate reading stats
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(words / 200));

  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #ffffff;
      --fg: #1f2328;
      --muted: #656d76;
      --border: #d0d7de;
      --card-bg: #f6f8fa;
      --accent: #0969da;
      --accent-hover: #0550ae;
      --code-bg: #f6f8fa;
      --table-stripe: #f6f8fa;
      --shadow: 0 4px 16px rgba(0,0,0,0.06);
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --mono: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
    }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --bg: #0d1117;
        --fg: #e6edf3;
        --muted: #8b949e;
        --border: #30363d;
        --card-bg: #161b22;
        --accent: #58a6ff;
        --accent-hover: #79c0ff;
        --code-bg: #161b22;
        --table-stripe: #161b22;
        --shadow: 0 4px 20px rgba(0,0,0,0.4);
      }
    }
    :root[data-theme="dark"] {
      --bg: #0d1117;
      --fg: #e6edf3;
      --muted: #8b949e;
      --border: #30363d;
      --card-bg: #161b22;
      --accent: #58a6ff;
      --accent-hover: #79c0ff;
      --code-bg: #161b22;
      --table-stripe: #161b22;
      --shadow: 0 4px 20px rgba(0,0,0,0.4);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--fg);
      font-family: var(--font);
      font-size: 16px;
      line-height: 1.65;
      padding: 2.5rem 1.5rem;
      transition: background-color 0.2s, color 0.2s;
    }
    .container {
      max-width: 820px;
      margin: 0 auto;
    }
    header.doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 1.25rem;
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--border);
    }
    .doc-meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.85rem;
      color: var(--muted);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.15rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--fg);
    }
    .actions {
      display: flex;
      gap: 0.5rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.75rem;
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
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.6em;
      font-weight: 600;
      line-height: 1.3;
      color: var(--fg);
    }
    h1 { font-size: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
    h2 { font-size: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.25em; }
    h3 { font-size: 1.25rem; }
    h4 { font-size: 1rem; }
    p, ul, ol, blockquote, table, pre { margin-bottom: 1.1em; }
    ul, ol { padding-left: 2em; }
    li { margin-bottom: 0.3em; }
    li > p { margin-bottom: 0.3em; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    strong { font-weight: 600; }
    hr {
      border: 0;
      height: 1px;
      background: var(--border);
      margin: 2rem 0;
    }
    blockquote {
      border-left: 4px solid var(--accent);
      padding: 0.5rem 1rem;
      color: var(--muted);
      background: var(--card-bg);
      border-radius: 0 6px 6px 0;
    }
    code:not(pre code) {
      font-family: var(--mono);
      font-size: 0.88em;
      padding: 0.2em 0.4em;
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 4px;
    }
    .code-block-wrapper {
      position: relative;
      margin-bottom: 1.25em;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border);
      background: var(--code-bg);
    }
    .code-block-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.35rem 0.85rem;
      font-size: 0.75rem;
      font-family: var(--mono);
      color: var(--muted);
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
    }
    .copy-btn {
      background: transparent;
      border: none;
      color: var(--muted);
      cursor: pointer;
      font-size: 0.75rem;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
    }
    .copy-btn:hover {
      color: var(--fg);
      background: var(--border);
    }
    pre {
      padding: 1rem;
      overflow-x: auto;
      font-family: var(--mono);
      font-size: 0.88em;
      line-height: 1.5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
    }
    th, td {
      padding: 0.65rem 0.9rem;
      border: 1px solid var(--border);
      text-align: left;
    }
    th {
      background: var(--card-bg);
      font-weight: 600;
    }
    tr:nth-child(even) {
      background: var(--table-stripe);
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
    }
    /* Syntax Highlighting Styles (hljs) */
    .hljs-comment, .hljs-quote { color: #8b949e; font-style: italic; }
    .hljs-keyword, .hljs-selector-tag, .hljs-subst { color: #ff7b72; font-weight: 600; }
    .hljs-number, .hljs-literal, .hljs-variable, .hljs-template-variable { color: #79c0ff; }
    .hljs-string, .hljs-doctag { color: #a5d6ff; }
    .hljs-title, .hljs-section, .hljs-selector-id { color: #d2a8ff; font-weight: 600; }
    .hljs-type, .hljs-class .hljs-title { color: #ffa657; font-weight: 600; }
    .hljs-attr, .hljs-attribute { color: #79c0ff; }
    .hljs-symbol, .hljs-bullet { color: #f2cc60; }
    .hljs-built_in, .hljs-builtin-name { color: #ffa657; }
    @media (max-width: 600px) {
      body { padding: 1.25rem 0.9rem; font-size: 15px; }
      header.doc-header { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="doc-header">
      <div class="doc-meta">
        <span class="badge">Markdown</span>
        <span>${words} words</span>
        <span>•</span>
        <span>${readTime} min read</span>
      </div>
      <div class="actions">
        <button class="btn" onclick="toggleTheme()" id="themeBtn">🌓 Theme</button>
        <button class="btn" onclick="copyAllMarkdown()" id="copyDocBtn">📋 Copy</button>
      </div>
    </header>
    <main class="markdown-body">
      ${parsedHtml}
    </main>
  </div>

  <textarea id="raw-content" style="display:none;">${escapeHtml(markdown)}</textarea>

  <script>
    // Add copy buttons and header to code blocks
    document.querySelectorAll('pre code').forEach((codeBlock) => {
      const pre = codeBlock.parentElement;
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';
      
      const lang = Array.from(codeBlock.classList)
        .find(c => c.startsWith('language-'))?.replace('language-', '') || 'code';

      const header = document.createElement('div');
      header.className = 'code-block-header';
      header.innerHTML = '<span>' + lang.toUpperCase() + '</span><button class="copy-btn">Copy</button>';
      
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);

      header.querySelector('.copy-btn').onclick = function() {
        navigator.clipboard.writeText(codeBlock.innerText).then(() => {
          this.innerText = 'Copied!';
          setTimeout(() => this.innerText = 'Copy', 1800);
        });
      };
    });

    function toggleTheme() {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
    }

    function copyAllMarkdown() {
      const text = document.getElementById('raw-content').value;
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyDocBtn');
        btn.innerText = '✓ Copied!';
        setTimeout(() => btn.innerText = '📋 Copy', 1800);
      });
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

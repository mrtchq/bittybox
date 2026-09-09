export function renderJsonToHtml(jsonStr, options = {}) {
  const title = options.title || 'JSON Data';
  const theme = options.theme || 'dark';

  let formatted = '';
  let parsed = null;
  let parseError = null;

  try {
    parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    formatted = JSON.stringify(parsed, null, 2);
  } catch (err) {
    parseError = err.message;
    formatted = String(jsonStr);
  }

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
      --key-color: #79c0ff;
      --str-color: #a5d6ff;
      --num-color: #ff7b72;
      --bool-color: #ffa657;
      --null-color: #ff7b72;
      --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
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
      --key-color: #0550ae;
      --str-color: #0a3069;
      --num-color: #cf222e;
      --bool-color: #953800;
      --null-color: #cf222e;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--fg);
      font-family: var(--font-sans);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .json-card {
      width: 100%;
      max-width: 1000px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.25);
    }
    .json-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1.25rem;
      background: var(--header-bg);
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .badge {
      background: #8957e5;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }
    .actions { display: flex; gap: 0.5rem; }
    .btn {
      display: inline-flex;
      align-items: center;
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
      font-weight: 500;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--card-bg);
      color: var(--fg);
      cursor: pointer;
    }
    .btn:hover { border-color: var(--accent); color: var(--accent); }
    pre {
      padding: 1.25rem;
      font-family: var(--font-mono);
      font-size: 13.5px;
      line-height: 1.6;
      overflow-x: auto;
      white-space: pre-wrap;
    }
    .key { color: var(--key-color); font-weight: 600; }
    .string { color: var(--str-color); }
    .number { color: var(--num-color); }
    .boolean { color: var(--bool-color); font-weight: bold; }
    .null { color: var(--null-color); font-style: italic; }
    .error-banner {
      background: #ffebe9;
      color: #cf222e;
      padding: 0.75rem 1.25rem;
      font-size: 0.85rem;
      border-bottom: 1px solid #ff8182;
    }
  </style>
</head>
<body>
  <div class="json-card">
    <div class="json-header">
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span class="badge">JSON</span>
        <strong>${escapeHtml(title)}</strong>
      </div>
      <div class="actions">
        <button class="btn" onclick="toggleTheme()">🌓 Theme</button>
        <button class="btn" onclick="copyJson()" id="copyBtn">📋 Copy JSON</button>
      </div>
    </div>
    ${parseError ? `<div class="error-banner">⚠️ Invalid JSON format: ${escapeHtml(parseError)}</div>` : ''}
    <pre id="jsonViewer">${colorizeJson(formatted)}</pre>
  </div>
  <textarea id="raw-json" style="display:none;">${escapeHtml(formatted)}</textarea>
  <script>
    function copyJson() {
      const text = document.getElementById('raw-json').value;
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.innerText = '✓ Copied!';
        setTimeout(() => btn.innerText = '📋 Copy JSON', 1800);
      });
    }
    function toggleTheme() {
      const html = document.documentElement;
      html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    }
  </script>
</body>
</html>`;
}

function colorizeJson(json) {
  if (typeof json !== 'string') json = JSON.stringify(json, null, 2);
  json = escapeHtml(json);
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    let cls = 'number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'key';
      } else {
        cls = 'string';
      }
    } else if (/true|false/.test(match)) {
      cls = 'boolean';
    } else if (/null/.test(match)) {
      cls = 'null';
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

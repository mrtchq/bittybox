export function renderSvgToHtml(svgContent, options = {}) {
  const title = options.title || 'SVG Graphic';
  const theme = options.theme || 'dark';

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
      --border: #30363d;
      --fg: #e6edf3;
      --accent: #58a6ff;
      --grid-line: rgba(255,255,255,0.05);
    }
    :root[data-theme="light"] {
      --bg: #f6f8fa;
      --card-bg: #ffffff;
      --border: #d0d7de;
      --fg: #1f2328;
      --accent: #0969da;
      --grid-line: rgba(0,0,0,0.05);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--fg);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1.5rem;
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
    }
    .badge {
      background: #f78166;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }
    .btn {
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--card-bg);
      color: var(--fg);
      cursor: pointer;
    }
    .btn:hover { border-color: var(--accent); color: var(--accent); }
    .viewport {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background-image: linear-gradient(var(--grid-line) 1px, transparent 1px),
                        linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
      background-size: 20px 20px;
    }
    .svg-container {
      max-width: 90vw;
      max-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 10px 30px rgba(0,0,0,0.3));
    }
    .svg-container svg {
      max-width: 100%;
      max-height: 80vh;
      height: auto;
    }
  </style>
</head>
<body>
  <header>
    <div style="display:flex; align-items:center; gap:0.5rem;">
      <span class="badge">SVG</span>
      <strong>${escapeHtml(title)}</strong>
    </div>
    <div style="display:flex; gap:0.5rem;">
      <button class="btn" onclick="toggleTheme()">🌓 Theme</button>
      <button class="btn" onclick="copySvg()" id="copyBtn">📋 Copy SVG</button>
      <button class="btn" onclick="downloadSvg()">⬇️ Download</button>
    </div>
  </header>
  <div class="viewport">
    <div class="svg-container" id="svgBox">
      ${svgContent}
    </div>
  </div>
  <textarea id="raw-svg" style="display:none;">${escapeHtml(svgContent)}</textarea>
  <script>
    function copySvg() {
      const text = document.getElementById('raw-svg').value;
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.innerText = '✓ Copied!';
        setTimeout(() => btn.innerText = '📋 Copy SVG', 1800);
      });
    }
    function toggleTheme() {
      const html = document.documentElement;
      html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    }
    function downloadSvg() {
      const text = document.getElementById('raw-svg').value;
      const blob = new Blob([text], { type: 'image/svg+xml;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '${escapeHtml(title.toLowerCase().replace(/[^a-z0-9_-]/g, '_'))}.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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

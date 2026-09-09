export function renderCanvasToHtml(jsCode, options = {}) {
  const title = options.title || 'Canvas Animation';
  const theme = options.theme || 'dark';

  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    .hud {
      position: absolute;
      top: 12px;
      left: 12px;
      display: flex;
      gap: 8px;
      align-items: center;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(8px);
      padding: 6px 12px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.15);
      font-size: 13px;
      z-index: 100;
    }
    .hud button {
      background: transparent;
      border: none;
      color: #aaa;
      cursor: pointer;
      font-size: 13px;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .hud button:hover {
      color: #fff;
      background: rgba(255,255,255,0.1);
    }
  </style>
</head>
<body>
  <div class="hud">
    <span style="font-weight:600;">${escapeHtml(title)}</span>
    <button onclick="restart()">↺ Restart</button>
    <button onclick="takeSnapshot()">📸 Snapshot</button>
  </div>
  <canvas id="canvas"></canvas>
  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    let width, height;

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    function takeSnapshot() {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = '${escapeHtml(title.toLowerCase().replace(/[^a-z0-9_-]/g, '_'))}.png';
      a.click();
    }

    let userMain = null;
    function runUserCode() {
      try {
        const fn = new Function('canvas', 'ctx', 'width', 'height', ${JSON.stringify(jsCode)});
        userMain = fn(canvas, ctx, width, height);
      } catch (err) {
        console.error('Canvas execution error:', err);
      }
    }
    function restart() {
      resize();
      runUserCode();
    }
    runUserCode();
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

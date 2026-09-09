import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3012;
const DIST_DIR = path.join(__dirname, 'dist');

// Disable x-powered-by header
app.disable('x-powered-by');

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'bittybox', timestamp: new Date().toISOString() });
});

// Serve static assets with caching
app.use(express.static(DIST_DIR, {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// SPA Fallback: All unmatched GET requests serve index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[bittybox] Production server listening on http://127.0.0.1:${PORT}`);
  console.log(`[bittybox] Serving static bundle from ${DIST_DIR}`);
});

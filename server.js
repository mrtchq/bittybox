const http = require('http');
const fs = require('fs');
const path = require('path');

const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3005;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let reqUrl = req.url.split('?')[0];
  let reqPath;
  try {
    reqPath = decodeURIComponent(reqUrl);
  } catch (e) {
    reqPath = reqUrl;
  }

  if (reqPath === '/' || reqPath === '') {
    reqPath = '/bittybox.html';
  }

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${reqPath}`);
      return;
    }

    serveFile(filePath, res);
  });
});

function serveFile(filePath, res) {
  const baseName = path.basename(filePath).toLowerCase();
  const ext = path.extname(filePath).toLowerCase();

  let contentType = MIME_TYPES[ext];
  if (!contentType) {
    if (baseName === 'css2' || baseName.endsWith('.css')) {
      contentType = 'text/css; charset=utf-8';
    } else if (baseName === 'saved_resource' || baseName.endsWith('.js')) {
      contentType = 'text/javascript; charset=utf-8';
    } else {
      contentType = 'application/octet-stream';
    }
  }

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

function startServer(port) {
  server.listen(port, () => {
    console.log(`=================================================`);
    console.log(` Bitty Box Web App Server`);
    console.log(` Server active at: http://localhost:${port}/`);
    console.log(` Direct URL: http://localhost:${port}/bittybox.html`);
    console.log(` Serving: ${PUBLIC_DIR}`);
    console.log(`=================================================`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(DEFAULT_PORT);

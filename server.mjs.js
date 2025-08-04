// server.mjs
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url );
const __dirname = path.dirname(__filename);

const PORT = 3000;
const STATIC_DIR = path.join(__dirname);

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res ) => {
  let filePath = path.join(STATIC_DIR, req.url === '/' ? 'index.html' : req.url);

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch (err) { /* Ignora */ }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Server Error: ${error.code}`);
    }
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://127.0.0.1:${PORT}/` );
});
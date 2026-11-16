import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist', import.meta.url));
const port = Number(process.env.BEZHVOSTOV_PORT || 4173);
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.jpg': 'image/jpeg', '.webp': 'image/webp',
};

await stat(resolve(root, 'index.html')).catch(() => {
  throw new Error('Сначала выполните npm run build');
});

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    let file = resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    const info = await stat(file);
    if (info.isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        response.writeHead(308, { Location: `/${url.pathname.replace(/^\/+/, '')}/${url.search}` }).end();
        return;
      }
      file = resolve(file, 'index.html');
      await stat(file);
    }
    response.writeHead(200, {
      'Content-Type': mime[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    if (request.method === 'HEAD') response.end();
    else createReadStream(file).on('error', () => response.destroy()).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Страница не найдена');
  }
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/`));

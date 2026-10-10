// שרת פיתוח מקומי בלי תלויות: מגיש את הקבצים הסטטיים ומריץ את פונקציות ה-api כמו ב-Vercel.
// הרצה: node dev-server.js   (אפשר להגדיר TRAVELPAYOUTS_TOKEN / SERPAPI_KEY בסביבה או בקובץ .env)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 3000);

if (existsSync(join(root, '.env'))) {
  for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };

createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  try {
    const api = /^\/api\/([a-z]+)$/.exec(path);
    if (api) {
      const mod = await import(`./api/${api[1]}.js`);
      return await mod.default(req, res);
    }
    const file = normalize(join(root, path === '/' ? 'index.html' : path));
    if (!file.startsWith(root) || file.includes('/lib/') || file.includes('/api/')) throw new Error('forbidden');
    const body = await readFile(file);
    res.setHeader('Content-Type', `${TYPES[extname(file)] || 'application/octet-stream'}; charset=utf-8`);
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}).listen(port, () => {
  console.log(`http://localhost:${port}  (${process.env.TRAVELPAYOUTS_TOKEN ? 'מחירים אמיתיים' : 'מצב דמו'})`);
});

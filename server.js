// Локальный сервер: раздаёт сайт и проксирует запросы к Steam (обход CORS). Нужен Node.js 18+.
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 8000, ROOT = __dirname;
const ALLOW = ['store.steampowered.com', 'cdn.akamai.steamstatic.com'];
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.md':'text/plain; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon','.png':'image/png'};
const cache = new Map();

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/proxy') {
    const t = u.searchParams.get('url'); let host = '';
    try { host = new URL(t).hostname; } catch {}
    if (!ALLOW.includes(host)) { res.writeHead(400); return res.end('bad url'); }
    const hit = cache.get(t);
    if (hit && Date.now() - hit.t < 600000) { res.writeHead(200, {'content-type': hit.ct, 'access-control-allow-origin': '*'}); return res.end(hit.b); }
    try {
      const r = await fetch(t, {headers: {'user-agent': 'Mozilla/5.0', 'accept-language': 'ru-RU,ru;q=0.9', cookie: 'birthtime=0; lastagecheckage=1-0-1990; wants_mature_content=1'}});
      const b = Buffer.from(await r.arrayBuffer()), ct = r.headers.get('content-type') || 'application/json';
      if (r.ok) cache.set(t, {t: Date.now(), ct, b});
      res.writeHead(r.status, {'content-type': ct, 'access-control-allow-origin': '*'}); return res.end(b);
    } catch { res.writeHead(502); return res.end('upstream error'); }
  }
  const f = path.join(ROOT, u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, {'content-type': MIME[path.extname(f)] || 'application/octet-stream'}); res.end(d);
  });
}).listen(PORT, () => console.log('Game Tracker: http://localhost:' + PORT));

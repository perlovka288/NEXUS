'use strict';
// Game Tracker: локальный сервер (сайт + API + детектор игр). Нужен Node.js 18+.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), EventEmitter = require('events');
const {createStore} = require('./lib/store'), {Tracker, ymd, HARD_IGNORE_APPIDS, HARD_IGNORE_NAME} = require('./lib/tracker'), P = require('./lib/providers'), {DEFAULT_RAWG_KEY} = require('./lib/defaults');

const PUB = path.join(__dirname, 'public');
const ALLOW = ['store.steampowered.com', 'cdn.akamai.steamstatic.com', 'shared.akamai.steamstatic.com'];
const MIME = {'.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif'};
const FIELDS = {name: 'str', status: 'str', hours: 'num', rating: 'num', note: 'str', cover: 'str', desc: 'str', released: 'str', dir: 'str', src: 'str', exe: 'arr', genres: 'arr', started: 'str', finished: 'str', progress: 'num'};
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const sleep = ms => new Promise(r => setTimeout(r, ms));
// секунды по дням из списка сессий (для игр, записанных до появления учёта по дням)
function daysFromSessions(ss) {
  const d = {};
  for (const x of ss || []) {
    const s = new Date(x.s), e = new Date(x.e); if (isNaN(s) || isNaN(e)) continue;
    if (e <= s) { const k = ymd(s); d[k] = (d[k] || 0) + (x.sec || 0); continue; }
    const span = (e - s) / 1000; let cur = s;
    while (cur < e) { const nx = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1), end = nx < e ? nx : e, k = ymd(cur); d[k] = (d[k] || 0) + (x.sec || 0) * ((end - cur) / 1000) / span; cur = end; }
  }
  for (const k of Object.keys(d)) d[k] = Math.round(d[k] * 10) / 10;
  return d;
}
const ID_RE = /^[\w-]{1,40}$/;
const iso = () => new Date().toISOString();
const normName = s => String(s || '').toLowerCase().replace(/[^a-z0-9а-яё]+/g, '');
const cleanName = s => String(s).replace(/\s*(\(.*?\)|\[.*?\]|[ _]v?\d+(\.\d+){1,}\b.*|\b(repack|gog|fitgirl|codex|goldberg)\b.*)/gi, '').replace(/[_.]+/g, ' ').replace(/([a-zа-яё])([A-ZА-ЯЁ])/g, '$1 $2').replace(/([a-zа-яё])(\d)/gi, '$1 $2').replace(/\s+/g, ' ').trim();
function bestMatch(q, items) {
  const nq = normName(q), tok = s => new Set(String(s).toLowerCase().split(/[^a-z0-9а-яё]+/).filter(Boolean));
  let best = null, bs = 0;
  for (const it of items) {
    const ni = normName(it.name); let s = 0;
    if (ni === nq) s = 1;
    else if (ni.startsWith(nq) || nq.startsWith(ni)) s = Math.min(ni.length, nq.length) / Math.max(ni.length, nq.length) + .15;
    else { const a = tok(q), b = tok(it.name), i = [...a].filter(x => b.has(x)).length; s = i / (a.size + b.size - i || 1); }
    if (s > bs) { bs = s; best = it; }
  }
  return bs >= .6 ? best : null;
}
const readBody = (req, max) => new Promise((ok, no) => {
  const c = []; let n = 0;
  req.on('data', d => { n += d.length; if (n > max) { no(new Error('too big')); req.destroy(); } else c.push(d); });
  req.on('end', () => ok(Buffer.concat(c))); req.on('error', no);
});
function imgExt(b) {
  if (b.length < 12) return null;
  if (b[0] === 0x89 && b[1] === 0x50) return 'png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpg';
  if (b.toString('ascii', 0, 4) === 'GIF8') return 'gif';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

function start({dataDir = path.join(__dirname, 'data'), port = 8000, host = '127.0.0.1', hooks = {}, trackerOpts = {}} = {}) {
  const store = createStore(dataDir), events = new EventEmitter(), lib = () => store.data.library, cfg = () => store.data.config, meta = () => store.data.meta;
  const rawgKey = () => cfg().keys.rawg || DEFAULT_RAWG_KEY;
  const coverMiss = new Map(), cache = new Map(), clients = new Set();
  const emit = e => { for (const r of clients) r.write('data: ' + JSON.stringify(e) + '\n\n'); events.emit('event', e); };

  // добавление найденной трекером игры в библиотеку
  async function resolveGame(m) {
    const L = lib();
    if (m.id && L[m.id]) return m.id;
    let id = m.id || null, name = m.name, src = m.id ? 'steam' : 'custom';
    if (!id) {
      const q = cleanName(m.name), nn = normName(q);
      for (const [k, g] of Object.entries(L)) if (normName(g.name) === nn) { if (m.dir && !g.dir) { g.dir = m.dir; store.save('library'); } return k; }
      try { const b = bestMatch(q, await P.steamSearch(q)); if (b) { id = b.id; name = b.name; src = 'steam'; } } catch {}
      if (!id) { id = 'c' + Date.now().toString(36); name = q; }
    }
    if (L[id]) { if (m.dir && !L[id].dir) L[id].dir = m.dir; store.save('library'); return id; }
    L[id] = {name, status: 'playing', hours: 0, rating: '', note: '', src, added: iso(), auto: true, dir: m.dir || ''};
    store.save('library'); emit({type: 'added', id, name}); emit({type: 'lib'}); queueMeta(id);
    return id;
  }
  // данные RAWG для игр библиотеки: среднее время прохождения (для прогресса), платформы, жанры, Metascore
  const metaQ = new Set(); let metaRun = false;
  async function fetchMeta(id) {
    const g = lib()[id]; if (!g) return null;
    try {
      let it = null;
      if (/^r\d+$/.test(id)) it = await P.rawgById(rawgKey(), id.slice(1));
      else { const q = cleanName(g.name), r = await P.rawgList(rawgKey(), {search: q, size: 8}); it = bestMatch(q, r.results); }
      meta()[id] = it ? {rawgId: +String(it.id).slice(1), name: it.name, avg: it.playtime || 0, platforms: it.parents.length ? it.parents : it.platforms, genres: it.genres, released: it.released, metacritic: it.metacritic, rating: it.rating, at: Date.now()} : {miss: Date.now()};
      store.save('meta'); return meta()[id];
    } catch (e) { return null; } // сеть/лимит: повторим позже
  }
  async function runMeta() {
    if (metaRun) return; metaRun = true;
    try { for (let id; (id = metaQ.values().next().value) !== undefined;) { metaQ.delete(id); if (lib()[id]) { await fetchMeta(id); emit({type: 'meta'}); await sleep(300); } } } finally { metaRun = false; }
  }
  function queueMeta(id) { const m = meta()[id]; if (!m || (m.miss && Date.now() - m.miss > 7 * 864e5) || (m.at && Date.now() - m.at > 30 * 864e5)) { metaQ.add(id); setTimeout(runMeta, 500); } }
  const wantMeta = () => { for (const id of Object.keys(lib())) queueMeta(id); };

  // служебное: убираем Wallpaper Engine (работает сутками), переносим старые сессии в учёт по дням
  (function cleanup() {
    for (const [id, g] of Object.entries(lib())) {
      if (HARD_IGNORE_APPIDS.has(id) || (g.auto && HARD_IGNORE_NAME.test(String(g.name).trim()))) { delete lib()[id]; delete store.data.covers[id]; delete meta()[id]; continue; }
      if (!g.days && g.sessions?.length) g.days = daysFromSessions(g.sessions);
    }
    store.save('library'); store.save('covers'); store.save('meta');
  })();

  const tracker = new Tracker(store, {resolve: resolveGame, ...trackerOpts});
  tracker.on('event', e => { for (const r of clients) r.write('data: ' + JSON.stringify(e) + '\n\n'); events.emit('event', e); });

  async function resolveCover(id, name, force) {
    const cv = store.data.covers;
    if (!force && cv[id]) return cv[id];
    const miss = coverMiss.get(id); if (!force && miss && Date.now() - miss < 600000) return null;
    const k = cfg().keys, isSteam = /^\d+$/.test(id); let r = null;
    try {
      const viaSgdb = async () => { if (!r && k.steamgriddb) { const u = await P.sgdb(k.steamgriddb, {steamId: isSteam ? id : null, name}).catch(() => null); if (u) r = {url: u, banner: false}; } };
      if (force) await viaSgdb(); // «подобрать заново» — сначала SteamGridDB, там обычно больше вариантов
      if (!r && isSteam) { const u = await P.steamPortrait(id); if (u) r = {url: u, banner: false}; }
      await viaSgdb();
      if (!r && rawgKey() && name) { const u = await P.rawgCover(rawgKey(), name).catch(() => null); if (u) r = {url: u, banner: true}; }
    } catch {}
    if (r) { cv[id] = r; store.save('covers'); } else coverMiss.set(id, Date.now());
    return r;
  }
  const masked = () => { const k = cfg().keys, m = v => v ? {set: true, tail: v.slice(-4)} : {set: false};
    return {keys: {steamgriddb: m(k.steamgriddb), rawg: {set: true, tail: rawgKey().slice(-4), builtin: !k.rawg}, steamKey: m(k.steamKey), steamId: k.steamId}, tracker: cfg().tracker, desktop: !!hooks.getAutostart, autostart: hooks.getAutostart ? !!hooks.getAutostart() : false}; };
  function patchGame(id, b, imported) {
    const isNew = !lib()[id], g = lib()[id] || (lib()[id] = {name: 'Игра', status: 'planned', hours: '', rating: '', note: '', added: iso()}), prev = isNew ? null : g.status;
    for (const [k, t] of Object.entries(FIELDS)) {
      if (!(k in b)) continue; const v = b[k];
      if (t === 'str') g[k] = String(v ?? '').slice(0, k === 'note' || k === 'desc' ? 5000 : 500);
      else if (t === 'num') g[k] = v === '' || v == null ? '' : Math.max(0, +v || 0);
      else g[k] = Array.isArray(v) ? v.map(x => String(x).slice(0, 200)).slice(0, 30) : [];
    }
    if (!['playing', 'done', 'planned', 'dropped'].includes(g.status)) g.status = 'planned';
    if (g.rating !== '' && g.rating > 10) g.rating = 10;
    for (const k of ['started', 'finished']) if (g[k] && !DATE_RE.test(g[k])) g[k] = '';
    if (g.progress !== undefined && g.progress !== '') g.progress = Math.min(100, g.progress);
    // даты ставятся сами: «Играю» → дата начала, «Прошёл» → дата окончания (если вы не указали их вручную)
    if (!imported && 'status' in b && g.status !== prev) {
      if (g.status === 'done' && !('finished' in b) && !g.finished) g.finished = ymd();
      if (g.status !== 'done' && prev === 'done' && !('finished' in b)) g.finished = '';
      if (g.status === 'playing' && !('started' in b) && !g.started && !g.firstPlayed) g.started = ymd();
    }
    store.save('library'); if (isNew) queueMeta(id);
    return g;
  }

  async function api(req, res, u) {
    const p = u.pathname, m = req.method, J = (o, c = 200) => { res.writeHead(c, {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'}); res.end(JSON.stringify(o)); };
    const body = async () => { try { return JSON.parse((await readBody(req, 5e6)).toString() || '{}'); } catch { return {}; } };
    let x;
    if (p === '/api/events') {
      res.writeHead(200, {'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive'}); res.write('retry: 3000\n\n');
      clients.add(res); const ka = setInterval(() => res.write(': ka\n\n'), 25000); req.on('close', () => { clearInterval(ka); clients.delete(res); }); return;
    }
    if (p === '/api/lib' && m === 'GET') return J(lib());
    if ((x = p.match(/^\/api\/lib\/([\w-]+)$/))) {
      if (!ID_RE.test(x[1])) return J({error: 'bad id'}, 400);
      if (m === 'PUT') { const g = patchGame(x[1], await body()); return J(g); }
      if (m === 'DELETE') { delete lib()[x[1]]; delete store.data.covers[x[1]]; store.save('library'); store.save('covers'); return J({ok: true}); }
    }
    if (p === '/api/lib/import' && m === 'POST') {
      const b = await body(), src = b.lib && typeof b.lib === 'object' ? b.lib : null; if (!src) return J({error: 'Неверный файл'}, 400);
      let n = 0; if (b.mode === 'replace') store.data.library = {};
      for (const [id, g] of Object.entries(src)) if (ID_RE.test(id) && g && typeof g === 'object' && (b.mode === 'replace' || !lib()[id])) { patchGame(id, g, true); for (const k of ['sessions', 'days', 'added', 'firstPlayed', 'last']) if (g[k]) lib()[id][k] = g[k]; n++; }
      emit({type: 'lib'}); return J({ok: true, n});
    }
    if (p === '/api/export') { res.writeHead(200, {'content-type': 'application/json', 'content-disposition': 'attachment; filename="game-tracker-library.json"'}); return res.end(JSON.stringify({version: 2, lib: lib()}, null, 2)); }
    if (p === '/api/config') {
      if (m === 'GET') return J(masked());
      if (m === 'PUT') {
        const b = await body();
        for (const [k, v] of Object.entries(b.keys || {})) if (k in cfg().keys) cfg().keys[k] = v == null ? '' : String(v).trim().slice(0, 200);
        if (b.tracker) { const t = cfg().tracker, n = b.tracker;
          for (const k of ['enabled', 'autoAdd', 'autoStatus']) if (k in n) t[k] = !!n[k];
          for (const k of ['folders', 'ignore']) if (Array.isArray(n[k])) t[k] = n[k].map(s => String(s).trim()).filter(Boolean).slice(0, 100); }
        coverMiss.clear(); store.save('config'); tracker.buildRoots(); return J(masked());
      }
    }
    if (p === '/api/config/test' && m === 'POST') {
      const b = await body(), k = cfg().keys;
      try {
        if (b.provider === 'steamgriddb') { if (!k.steamgriddb) throw new Error('Ключ не задан'); if (!(await P.sgdb(k.steamgriddb, {name: 'Half-Life'}))) throw new Error('Ответ пустой'); }
        else if (b.provider === 'rawg') { if (!(await P.rawgSearch(rawgKey(), 'Half-Life')).length) throw new Error('Ответ пустой'); }
        else if (b.provider === 'steam') { if (!k.steamKey || !k.steamId) throw new Error('Нужны ключ и SteamID64'); const g = await P.steamOwned(k.steamKey, k.steamId); return J({ok: true, msg: `Работает, игр в профиле: ${g.length}`}); }
        else throw new Error('Неизвестный источник');
        return J({ok: true, msg: 'Работает'});
      } catch (e) { return J({ok: false, msg: String(e.message || e).replace(/(key=)[^&\s]+/g, '$1***')}); }
    }
    if (p === '/api/search') {
      const q = (u.searchParams.get('q') || '').trim(); if (q.length < 2) return J([]);
      const [a, b] = await Promise.all([P.steamSearch(q).catch(() => []), P.rawgSearch(rawgKey(), q).catch(() => [])]);
      const names = new Set(a.map(i => normName(i.name)));
      return J([...a, ...b.filter(i => !names.has(normName(i.name)))]);
    }
    if (p === '/api/cover') {
      const id = u.searchParams.get('id') || ''; if (!ID_RE.test(id)) return J({error: 'bad id'}, 400);
      const r = await resolveCover(id, u.searchParams.get('name') || lib()[id]?.name || '', u.searchParams.get('force') === '1'); return J(r || {});
    }
    if (p === '/api/rawg/browse') { // каталог RAWG с фильтрами по платформе, жанру, году
      const q = u.searchParams, o = {search: (q.get('q') || '').trim().slice(0, 100), page: Math.max(1, Math.min(500, +q.get('page') || 1))};
      const list = (v, re) => String(v || '').split(',').filter(x => re.test(x)).join(',');
      o.parent_platforms = list(q.get('platform'), /^\d{1,3}$/); o.genres = list(q.get('genre'), /^[a-z0-9-]{1,40}$/);
      const y = q.get('year') || ''; if (/^\d{4}$/.test(y)) o.dates = `${y}-01-01,${y}-12-31`; else if (y === 'old') o.dates = '1970-01-01,1999-12-31';
      o.ordering = ['-added', '-rating', '-released', '-metacritic', 'name'].includes(q.get('ordering')) ? q.get('ordering') : '-added';
      try { return J(await P.rawgList(rawgKey(), o)); } catch (e) { return J({error: String(e.message).replace(/(key=)[^&\s]+/g, '$1***')}, 502); }
    }
    if ((x = p.match(/^\/api\/rawg\/(\d+)$/))) {
      try { return J(await P.rawgGame(rawgKey(), x[1])); } catch (e) { return J({error: String(e.message).replace(/(key=)[^&\s]+/g, '$1***')}, 502); }
    }
    if (p === '/api/meta' && m === 'GET') return J(meta());
    if ((x = p.match(/^\/api\/meta\/([\w-]+)\/refresh$/)) && m === 'POST') { if (!lib()[x[1]]) return J({error: 'not found'}, 404); const r = await fetchMeta(x[1]); emit({type: 'meta'}); return J(r || {}); }
    if (p === '/api/upload' && m === 'POST') {
      let buf; try { buf = await readBody(req, 8e6); } catch { return J({error: 'Файл больше 8 МБ'}, 413); }
      const ext = imgExt(buf); if (!ext) return J({error: 'Нужна картинка PNG, JPG, WEBP или GIF'}, 400);
      const name = crypto.randomBytes(8).toString('hex') + '.' + ext; fs.writeFileSync(path.join(store.uploads, name), buf); return J({url: '/uploads/' + name});
    }
    if (p === '/api/steam/import' && m === 'POST') {
      const b = await body(), k = cfg().keys; if (!k.steamKey || !k.steamId) return J({error: 'Укажите Steam Web API Key и SteamID64'}, 400);
      try {
        const owned = await P.steamOwned(k.steamKey, k.steamId); let added = 0, updated = 0;
        for (const g of owned) {
          const h = Math.round(g.minutes / 6) / 10, ex = lib()[g.appid];
          if (ex) { if (h > (+ex.hours || 0)) { ex.hours = h; updated++; } continue; }
          if (b.onlyPlayed !== false && !g.minutes) continue;
          lib()[g.appid] = {name: g.name, status: g.minutes ? 'playing' : 'planned', hours: g.minutes ? h : '', rating: '', note: '', src: 'steam', added: iso(), last: g.last ? new Date(g.last * 1000).toISOString() : undefined}; added++;
        }
        store.save('library'); emit({type: 'lib'}); wantMeta(); return J({ok: true, added, updated, total: owned.length});
      } catch (e) { return J({error: String(e.message).replace(/(key=)[^&\s]+/g, '$1***')}, 502); }
    }
    if (p === '/api/tracker/status') return J(tracker.status());
    if (p === '/api/tracker/processes') return J(tracker.processes());
    if (p === '/api/tracker/rescan' && m === 'POST') { await tracker.rescan(); return J(tracker.status()); }
    if (p === '/api/desktop/autostart' && hooks.getAutostart) { if (m === 'PUT') hooks.setAutostart(!!(await body()).on); return J({on: !!hooks.getAutostart()}); }
    if (p === '/api/desktop/open-data' && m === 'POST' && hooks.openData) { hooks.openData(); return J({ok: true}); }
    return J({error: 'not found'}, 404);
  }

  const server = http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url, 'http://localhost');
      const hn = (req.headers.host || '').replace(/:\d+$/, '');
      if (!['localhost', '127.0.0.1', '[::1]'].includes(hn)) { res.writeHead(403); return res.end('forbidden'); }
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers.origin) { let oh = ''; try { oh = new URL(req.headers.origin).host; } catch {} if (oh !== req.headers.host) { res.writeHead(403); return res.end('forbidden'); } }
      if (u.pathname.startsWith('/api/')) return await api(req, res, u);
      if (u.pathname === '/proxy') {
        const t = u.searchParams.get('url'); let h = ''; try { h = new URL(t).hostname; } catch {}
        if (!ALLOW.includes(h)) { res.writeHead(400); return res.end('bad url'); }
        const hit = cache.get(t);
        if (hit && Date.now() - hit.t < 600000) { res.writeHead(200, {'content-type': hit.ct}); return res.end(hit.b); }
        try {
          const r = await fetch(t, {headers: {'user-agent': 'Mozilla/5.0', 'accept-language': 'ru-RU,ru;q=0.9', cookie: 'birthtime=0; lastagecheckage=1-0-1990; wants_mature_content=1'}, signal: AbortSignal.timeout(15000)});
          const b = Buffer.from(await r.arrayBuffer()), ct = r.headers.get('content-type') || 'application/json';
          if (r.ok) { if (cache.size > 300) cache.delete(cache.keys().next().value); cache.set(t, {t: Date.now(), ct, b}); }
          res.writeHead(r.status, {'content-type': ct}); return res.end(b);
        } catch { res.writeHead(502); return res.end('upstream error'); }
      }
      let root = PUB, rel = decodeURIComponent(u.pathname);
      if (rel.startsWith('/uploads/')) { root = store.uploads; rel = rel.slice(8); }
      const f = path.normalize(path.join(root, rel === '/' ? 'index.html' : rel));
      if (!f.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
      fs.readFile(f, (e, d) => {
        if (e) { res.writeHead(404); return res.end('not found'); }
        res.writeHead(200, {'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': root === PUB ? 'no-cache' : 'public, max-age=86400'}); res.end(d);
      });
    } catch (e) { try { res.writeHead(500); res.end('error'); } catch {} console.error(e); }
  });
  return new Promise((ok, no) => {
    server.once('error', no);
    server.listen(port, host, () => { tracker.start(); if (!trackerOpts.noMeta) { setTimeout(wantMeta, 4000); setInterval(wantMeta, 30 * 60 * 1000).unref?.(); } ok({server, port: server.address().port, store, tracker, events, close() { tracker.stop(); store.flush(); server.close(); }}); });
  });
}
module.exports = {start, bestMatch, cleanName};
if (require.main === module) {
  const dataDir = process.env.GT_DATA || path.join(__dirname, 'data');
  start({dataDir, port: +process.env.PORT || 8000}).then(s => { console.log('Game Tracker: http://localhost:' + s.port + '\nДанные: ' + dataDir); process.on('SIGINT', () => { s.close(); process.exit(0); }); }).catch(e => { console.error('Не удалось запустить:', e.message); process.exit(1); });
}

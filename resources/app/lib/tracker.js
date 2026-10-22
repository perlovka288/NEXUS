'use strict';
// Детектор запущенных игр и подсчёт времени
const fs = require('fs'), path = require('path'), os = require('os'), {spawn, execFile} = require('child_process'), EventEmitter = require('events');

const NOISE = /(unins|crash|report|redist|dxsetup|setup|installer|easyanticheat|^eac|beclient|battleye|anticheat|cefsub|webhelper|overlay|helper|updater|service|dotnet|directx|ue4prereq)/i;
const SKIP_DIR = /^(launcher|epiconlineservices|directxredist|common|redist|_commonredist|\.egstore|installer)$/i;
const norm = p => String(p).replace(/\\/g, '/').toLowerCase().replace(/\/+$/, '');
const base = n => n.slice(n.lastIndexOf('/') + 1);
// Программы, которые работают сутками и не являются играми: никогда не считаем их время (Wallpaper Engine и служебные компоненты Steam)
const HARD_IGNORE_EXE = /^(wallpaper(32|64|_engine|service32|service)?|webwallpaper(32|64)?|applicationwallpaperengine(32|64)?)\.exe$/i;
const HARD_IGNORE_DIR = /\/(wallpaper_engine|steamworks shared|steam linux runtime[^/]*)(\/|$)/i;
const HARD_IGNORE_APPIDS = new Set(['431960', '228980', '1070560', '1391110', '1628350']); // Wallpaper Engine, Steamworks Redist, Steam Linux Runtime
const HARD_IGNORE_NAME = /^wallpaper engine$/i;
const isHardIgnored = (n, b) => HARD_IGNORE_EXE.test(b) || HARD_IGNORE_DIR.test(n + '/');
// локальная дата YYYY-MM-DD
const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Скрипт для Windows: раз в 5 секунд печатает «ID_запущенной_игры_Steam|путь1<TAB>путь2…»
const PS = `$ErrorActionPreference='SilentlyContinue'
[Console]::OutputEncoding=[Text.Encoding]::UTF8
while($true){
 $rid=(Get-ItemProperty 'HKCU:\\Software\\Valve\\Steam').RunningAppID
 $p=(Get-Process | Where-Object {$_.Path} | ForEach-Object {$_.Path} | Sort-Object -Unique) -join "\`t"
 [Console]::Out.WriteLine("$rid|$p"); [Console]::Out.Flush()
 Start-Sleep -Seconds 5
}`;

class Tracker extends EventEmitter {
  constructor(store, opts = {}) {
    super();
    this.store = store; this.opts = opts;
    this.active = new Map(); this.alias = new Map(); this.resolving = new Set();
    this.steamGames = []; this.steamCommons = []; this.steamLibs = 0; this.rootsN = [];
    this.procs = []; this.lastTick = 0; this.lastEmit = 0; this.ps = null; this.timer = null; this.scanT = null; this.stopped = false;
  }
  get cfg() { return this.store.data.config.tracker; }
  get lib() { return this.store.data.library; }
  get supported() { return !!this.opts.provider || process.platform === 'win32' || process.platform === 'linux'; }

  // --- поиск установленных игр Steam и папок с играми ---
  async scanSteam() {
    const roots = new Set(this.opts.steamRoots || []);
    if (process.platform === 'win32') {
      try {
        const out = await new Promise(r => execFile('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'], {windowsHide: true}, (e, o) => r(o || '')));
        const m = out.match(/SteamPath\s+REG_SZ\s+(.+)/i); if (m) roots.add(m[1].trim().replace(/\//g, '\\'));
      } catch {}
      roots.add('C:\\Program Files (x86)\\Steam'); roots.add('C:\\Program Files\\Steam');
    } else { roots.add(path.join(os.homedir(), '.steam/steam')); roots.add(path.join(os.homedir(), '.local/share/Steam')); }
    const libs = new Set();
    for (const r of roots) {
      if (!fs.existsSync(path.join(r, 'steamapps'))) continue;
      libs.add(r);
      try { for (const m of fs.readFileSync(path.join(r, 'steamapps', 'libraryfolders.vdf'), 'utf8').matchAll(/"path"\s+"([^"]+)"/g)) libs.add(m[1].replace(/\\\\/g, '\\')); } catch {}
    }
    const games = [], commons = [];
    for (const l of libs) {
      const apps = path.join(l, 'steamapps'); let files = [];
      try { files = fs.readdirSync(apps); } catch { continue; }
      commons.push(path.join(apps, 'common'));
      for (const f of files) {
        if (!/^appmanifest_\d+\.acf$/.test(f)) continue;
        try {
          const t = fs.readFileSync(path.join(apps, f), 'utf8');
          const id = t.match(/"appid"\s+"(\d+)"/)?.[1], name = t.match(/"name"\s+"([^"]*)"/)?.[1], dir = t.match(/"installdir"\s+"([^"]*)"/)?.[1];
          if (id && dir) games.push({appid: id, name: name || dir, dir: norm(path.join(apps, 'common', dir))});
        } catch {}
      }
    }
    this.steamGames = games; this.steamCommons = commons; this.steamLibs = libs.size;
    this.buildRoots();
  }
  buildRoots() {
    const r = new Set(this.steamCommons);
    for (const p of [process.env['ProgramFiles'], process.env['ProgramFiles(x86)']].filter(Boolean))
      for (const s of ['Epic Games', 'GOG Galaxy\\Games', 'Ubisoft\\Ubisoft Game Launcher\\games', 'EA Games', 'Origin Games', 'Rockstar Games']) r.add(path.join(p, s));
    for (const s of ['GOG Games', 'Games', 'Game', 'Игры', 'Epic Games', 'XboxGames'])
      for (let c = 67; c <= 90; c++) r.add(String.fromCharCode(c) + ':\\' + s);
    for (const f of this.cfg.folders || []) if (f) r.add(f);
    this.rootsN = [...r].filter(x => { try { return fs.statSync(x).isDirectory(); } catch { return false; } }).map(norm);
  }
  rescan() { return this.scanSteam().catch(() => {}); }

  // --- сопоставление процесса с игрой ---
  match(p) {
    const n = norm(p), b = base(n);
    if (NOISE.test(b) || isHardIgnored(n, b)) return null;
    for (const [id, g] of Object.entries(this.lib)) {
      if (g.dir && n.startsWith(norm(g.dir) + '/')) return {key: id, id, name: g.name};
      if (g.exe && g.exe.some(e => e.toLowerCase() === b)) return {key: id, id, name: g.name};
    }
    const ign = new Set((this.cfg.ignore || []).map(s => String(s).toLowerCase().trim()));
    if (ign.has(b)) return null;
    for (const g of this.steamGames) if (n.startsWith(g.dir + '/')) return HARD_IGNORE_APPIDS.has(g.appid) || HARD_IGNORE_NAME.test(g.name) || ign.has(g.appid) || ign.has(g.name.toLowerCase()) ? null : {key: g.appid, id: g.appid, name: g.name, dir: p.replace(/\\/g, '/').slice(0, g.dir.length)};
    for (const r of this.rootsN) {
      if (!n.startsWith(r + '/')) continue;
      const rest = n.slice(r.length + 1); if (!rest.includes('/')) continue;
      const seg = rest.split('/')[0]; if (SKIP_DIR.test(seg)) return null;
      const real = p.replace(/\\/g, '/').slice(r.length + 1).split('/')[0];
      if (ign.has(real.toLowerCase())) return null;
      return {key: 'dir:' + r + '/' + seg, id: null, name: real, dir: p.replace(/\\/g, '/').slice(0, r.length + 1 + seg.length)};
    }
    return null;
  }

  // --- один «тик» опроса ---
  tick(snap) {
    if (!this.cfg.enabled) { this.endAll(); return; }
    const now = Date.now(), dt = this.lastTick ? Math.min((now - this.lastTick) / 1000, 30) : 0;
    this.lastTick = now; this.procs = snap.paths || [];
    const seen = new Map();
    for (const p of this.procs) { const m = this.match(p); if (m && !seen.has(m.key)) seen.set(m.key, m); }
    const rid = String(snap.rid || '0').trim();
    if (/^\d+$/.test(rid) && rid !== '0' && !HARD_IGNORE_APPIDS.has(rid) && !this.cfg.ignore?.includes(rid) && ![...seen.values()].some(m => m.id === rid)) {
      const g = this.steamGames.find(x => x.appid === rid);
      seen.set(rid, {key: rid, id: rid, name: g?.name || this.lib[rid]?.name || 'Steam ' + rid});
    }
    for (const m of seen.values()) {
      let id = m.id && this.lib[m.id] ? m.id : this.alias.get(m.key);
      if (!id || !this.lib[id]) {
        if (!this.cfg.autoAdd || !this.opts.resolve) continue;
        if (!this.resolving.has(m.key)) {
          this.resolving.add(m.key);
          Promise.resolve(this.opts.resolve(m)).then(r => { if (r) this.alias.set(m.key, r); }).catch(() => {}).finally(() => this.resolving.delete(m.key));
        }
        continue;
      }
      let a = this.active.get(m.key);
      if (!a) { a = {id, name: this.lib[id].name, start: now, seconds: 0, last: now}; this.active.set(m.key, a); this.begin(a); }
      a.last = now;
      if (dt) { a.seconds += dt; this.addTime(id, dt); }
    }
    for (const [k, a] of this.active) if (now - a.last > 20000) { this.active.delete(k); this.finish(a); }
  }
  addTime(id, dt) {
    const g = this.lib[id]; if (!g) return;
    g.hours = Math.round(((+g.hours || 0) + dt / 3600) * 10000) / 10000;
    g.last = new Date().toISOString();
    const day = ymd(), dd = g.days || (g.days = {}); dd[day] = Math.round(((dd[day] || 0) + dt) * 10) / 10; // секунды по календарным дням
    this.store.save('library');
    if (Date.now() - this.lastEmit > 30000) { this.lastEmit = Date.now(); this.emit('event', {type: 'lib'}); }
  }
  begin(a) {
    const g = this.lib[a.id];
    if (this.cfg.autoStatus && (!g.status || g.status === 'planned' || g.status === 'dropped')) g.status = 'playing';
    if (!g.firstPlayed) { g.firstPlayed = new Date().toISOString(); if (!g.started) g.started = ymd(); }
    g.last = new Date().toISOString();
    this.store.save('library');
    this.emit('event', {type: 'start', id: a.id, name: a.name}); this.emit('event', {type: 'lib'});
  }
  finish(a) {
    const g = this.lib[a.id];
    if (g && a.seconds >= 30) { (g.sessions = g.sessions || []).push({s: a.start, e: a.last, sec: Math.round(a.seconds)}); if (g.sessions.length > 500) g.sessions.shift(); this.store.save('library'); }
    this.emit('event', {type: 'end', id: a.id, name: a.name, seconds: Math.round(a.seconds)}); this.emit('event', {type: 'lib'});
  }
  endAll() { for (const [k, a] of this.active) { this.active.delete(k); this.finish(a); } }

  // --- источники списка процессов ---
  linuxPaths() {
    const out = new Set();
    for (const d of fs.readdirSync('/proc')) { if (!/^\d+$/.test(d)) continue; try { out.add(fs.readlinkSync('/proc/' + d + '/exe')); } catch {} }
    return [...out];
  }
  startPS() {
    if (this.stopped) return;
    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(PS, 'utf16le').toString('base64')], {windowsHide: true, stdio: ['ignore', 'pipe', 'ignore']});
    this.ps = ps; let buf = '';
    ps.stdout.setEncoding('utf8');
    ps.stdout.on('data', d => {
      buf += d; let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).replace(/\r$/, ''); buf = buf.slice(i + 1);
        const k = line.indexOf('|'); if (k < 0) continue;
        try { this.tick({rid: line.slice(0, k), paths: line.slice(k + 1).split('\t').filter(Boolean)}); } catch (e) { console.error('tick', e.message); }
      }
    });
    ps.on('exit', () => { if (!this.stopped) setTimeout(() => this.startPS(), 5000); });
    ps.on('error', () => {});
  }
  async start() {
    await this.rescan();
    this.scanT = setInterval(() => this.rescan(), 10 * 60 * 1000);
    if (this.opts.provider) this.timer = setInterval(async () => { try { this.tick(await this.opts.provider()); } catch {} }, this.opts.interval || 5000);
    else if (process.platform === 'win32') this.startPS();
    else if (process.platform === 'linux') this.timer = setInterval(() => { try { this.tick({rid: 0, paths: this.linuxPaths()}); } catch {} }, 5000);
  }
  stop() { this.stopped = true; clearInterval(this.timer); clearInterval(this.scanT); this.endAll(); try { this.ps?.kill(); } catch {} }

  status() {
    const now = Date.now();
    return {supported: this.supported, platform: process.platform, enabled: !!this.cfg.enabled, steamLibs: this.steamLibs, steamGames: this.steamGames.length, roots: this.rootsN.length,
      now: [...this.active.values()].map(a => ({id: a.id, name: a.name, since: a.start, seconds: Math.round(a.seconds)})), ts: now};
  }
  // запущенные программы для ручной привязки (без системных)
  processes() {
    const seen = new Map();
    for (const p of this.procs) {
      const n = norm(p);
      if (/^[a-z]:\/windows\//.test(n) || /\/(microsoft|windowsapps|common files)\//.test(n) || NOISE.test(base(n))) continue;
      const dir = p.replace(/\\/g, '/').replace(/\/[^/]*$/, '');
      if (!seen.has(dir)) seen.set(dir, {path: p, name: base(p.replace(/\\/g, '/')), dir});
    }
    return [...seen.values()].slice(0, 80);
  }
}
module.exports = {Tracker, norm, ymd, HARD_IGNORE_APPIDS, HARD_IGNORE_NAME};

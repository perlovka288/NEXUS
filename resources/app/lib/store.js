'use strict';
// Хранилище данных в JSON-файлах (атомарная запись + резервная копия)
const fs = require('fs'), path = require('path');
const DEFAULTS = () => ({
  library: {},
  config: {
    keys: {steamgriddb: '', rawg: '', steamKey: '', steamId: ''},
    tracker: {enabled: true, autoAdd: true, autoStatus: true, folders: [], ignore: []}
  },
  covers: {},
  meta: {}
});
function createStore(dir) {
  fs.mkdirSync(path.join(dir, 'uploads'), {recursive: true});
  const names = {library: 'library.json', config: 'config.json', covers: 'covers.json', meta: 'meta.json'};
  const data = DEFAULTS(), timers = {};
  const file = k => path.join(dir, names[k]);
  for (const k of Object.keys(names)) {
    try {
      const j = JSON.parse(fs.readFileSync(file(k), 'utf8'));
      data[k] = k === 'config' ? {keys: {...data.config.keys, ...j.keys}, tracker: {...data.config.tracker, ...j.tracker}} : j;
      if (k === 'library') fs.copyFileSync(file(k), file(k) + '.bak');
    } catch {}
  }
  function write(k) {
    const f = file(k), tmp = f + '.tmp';
    try { fs.writeFileSync(tmp, JSON.stringify(data[k], null, k === 'covers' || k === 'meta' ? 0 : 2)); fs.renameSync(tmp, f); }
    catch (e) { console.error('save failed', k, e.message); }
  }
  function save(k) { clearTimeout(timers[k]); timers[k] = setTimeout(() => write(k), 400); }
  function flush() { for (const k of Object.keys(timers)) { clearTimeout(timers[k]); write(k); } }
  return {dir, data, save, flush, uploads: path.join(dir, 'uploads')};
}
module.exports = {createStore};

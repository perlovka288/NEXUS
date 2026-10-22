'use strict';
// Настройки, добавление своих игр, управление обложками и привязкой игры к папке
const modal = () => $('#modal');
async function uploadFile(f) {
  const r = await fetch('/api/upload', {method: 'POST', body: f}), j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Не удалось загрузить'); return j.url;
}
const pickFile = accept => new Promise(ok => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => ok(i.files[0] || null); i.click(); });
const dateRu = s => { try { return new Date(s).toLocaleDateString('ru-RU', {day: 'numeric', month: 'long', year: 'numeric'}); } catch { return ''; } };

// ===== прогресс, даты, статистика игры =====
const ymdL = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayNum = s => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c; };
const nDays = n => `${n} ${plural(n, 'день', 'дня', 'дней')}`;
const dRu = s => s ? dateRu(s + 'T12:00:00') : '—';
const dShort = d => d.toLocaleDateString('ru-RU', {day: 'numeric', month: 'short'});
const frow = (a, b) => b || b === 0 ? `<div class="fr"><small>${a}</small><div>${b}</div></div>` : '';

// Прогресс: вручную → «Прошёл» = 100% → часы / среднее время прохождения (RAWG)
function progressOf(id) {
  const g = lib[id]; if (!g) return null;
  if (g.progress !== '' && g.progress != null && !isNaN(+g.progress)) return {pct: Math.min(100, Math.max(0, Math.round(+g.progress))), kind: 'manual'};
  if (g.status === 'done') return {pct: 100, kind: 'done'};
  const avg = +rmeta[id]?.avg || 0, h = +g.hours || 0;
  return avg > 0 && h > 0 ? {pct: Math.min(99, Math.round(h / avg * 100)), kind: 'auto', avg} : null;
}
function gameStats(id) {
  const g = lib[id], days = g.days || {}, ss = g.sessions || [], dk = Object.keys(days).filter(k => days[k] >= 60).sort();
  const d2 = v => v ? ymdL(new Date(v)) : '', today = ymdL();
  const start = g.started || d2(g.firstPlayed) || dk[0] || d2(g.added) || '';
  const end = g.finished || (g.status === 'playing' ? today : (d2(g.last) || dk[dk.length - 1] || today));
  const sec = ss.map(x => x.sec || 0);
  return {start, days, dk, span: start ? Math.max(1, dayNum(end) - dayNum(start) + 1) : 0, played: dk.length, tracked: dk.reduce((a, k) => a + days[k], 0),
    n: ss.length, avgSes: sec.length ? sec.reduce((a, b) => a + b, 0) / sec.length : 0, maxSes: sec.length ? Math.max(...sec) : 0};
}
function statsHtml(id) {
  const g = lib[id];
  if (!g) return '<p class="mut">Добавьте игру в библиотеку: здесь появятся прогресс, даты начала и конца, игровые дни и сессии.</p>';
  const s = gameStats(id), p = progressOf(id), m = rmeta[id] || {}, h = +g.hours || 0;
  const prog = p ? `<div class="pgr"><div class="pgr-h"><b>${p.pct}%</b><span class="mut">${p.kind === 'done' ? 'Игра пройдена' : p.kind === 'manual' ? 'Прогресс указан вручную' : `Оценка: ${fmtH(h)} ч из ~${fmtH(p.avg)} ч (среднее время прохождения по RAWG)`}</span></div><div class="rs-bar"><i style="width:${p.pct}%"></i></div></div>`
    : '<p class="mut">Прогресс появится, когда у игры будут часы и RAWG найдёт среднее время прохождения. Его можно задать и вручную справа.</p>';
  const endTxt = g.finished ? dRu(g.finished) : g.status === 'playing' ? 'ещё играю' : '—';
  const facts = frow('Начал играть', s.start ? dRu(s.start) : '—') + frow('Закончил', endTxt)
    + frow('Календарный срок', s.span ? nDays(s.span) : '') + frow('Реально играл', s.played ? nDays(s.played) + (s.span ? ` из ${s.span}` : '') : '—')
    + frow('Всего наиграно', h ? fmtH(h) + ' ч' : '—') + frow('В игровой день в среднем', s.played ? fmtDur(s.tracked / s.played) : '')
    + frow('Сессий', s.n || '') + frow('Средняя / самая длинная', s.n ? `${fmtDur(s.avgSes)} / ${fmtDur(s.maxSes)}` : '')
    + frow('Последний запуск', g.last ? dateRu(g.last) : '—') + frow('Среднее время прохождения', m.avg ? fmtH(m.avg) + ' ч' : '')
    + frow('Платформы', esc((m.platforms || []).join(', '))) + frow('Жанры', esc((m.genres || []).join(', ')))
    + frow('Metascore', m.metacritic || '') + frow('Рейтинг игроков (RAWG)', m.rating ? m.rating.toFixed(1) + ' / 5' : '');
  const arr = []; let max = 0;
  for (let i = 29; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const v = s.days[ymdL(d)] || 0; max = Math.max(max, v); arr.push([d, v]); }
  const chart = max ? `<div class="dchart" role="img" aria-label="Время игры по дням за 30 дней">${arr.map(([d, v]) => `<i class="${v ? 'on' : ''}" title="${dShort(d)}: ${v ? fmtDur(v) : 'не играл'}" style="height:${v ? Math.max(5, Math.round(v / max * 100)) : 2}%"></i>`).join('')}</div><div class="dchart-l mut"><span>${dShort(arr[0][0])}</span><span>сегодня</span></div>`
    : '<p class="mut">За последние 30 дней запусков не было.</p>';
  const ses = (g.sessions || []).slice(-8).reverse().map(x => { const d = new Date(x.s); return `<li><span>${dShort(d)}, ${d.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}</span><b>${fmtDur(x.sec)}</b></li>`; }).join('');
  return `${prog}<div class="facts">${facts}</div><h3 class="sth">Активность за 30 дней</h3>${chart}
  ${ses ? `<h3 class="sth">Последние сессии</h3><ul class="slist">${ses}</ul>` : ''}
  <p class="hint l">Игровые дни и сессии считаются автоматически, пока приложение запущено. Даты начала и конца можно поправить справа.</p>`;
}
function renderStatsBox(id) { const el = $('#statsbox'); if (el && curId() == id) el.innerHTML = statsHtml(id); }

// блок под настройками игры на её странице
function extSide(id, g) {
  const own = !isSteam(id);
  return `${own ? `<div class="lbl"><span>О игре</span></div>
  <input class="tin" data-k="name" value="${esc(g.name)}" placeholder="Название" aria-label="Название">
  <input class="tin" data-k="released" value="${esc(g.released)}" placeholder="Дата выхода" aria-label="Дата выхода">
  <textarea data-k="desc" class="mini" placeholder="Описание" aria-label="Описание">${esc(g.desc)}</textarea>` : ''}
  <div class="lbl"><span>Даты</span></div>
  <div class="two"><label class="dl">Начало<input type="date" class="tin" data-k="started" value="${esc(g.started)}" aria-label="Дата начала"></label>
    <label class="dl">Конец<input type="date" class="tin" data-k="finished" value="${esc(g.finished)}" aria-label="Дата окончания"></label></div>
  <p class="hint l">Ставятся сами: при первом запуске и при статусе «Прошёл». Можно исправить вручную.</p>
  <div class="lbl"><span>Прогресс, %</span><b>${progressOf(id) ? progressOf(id).pct + '%' : 'нет'}</b></div>
  <input class="tin" type="number" min="0" max="100" step="1" data-k="progress" placeholder="Авто (по времени прохождения)" value="${g.progress === '' || g.progress == null ? '' : esc(g.progress)}" aria-label="Прогресс в процентах">
  <div class="lbl"><span>Обложка</span></div>
  <div class="covctl"><input data-k="cover" value="${esc(g.cover)}" placeholder="Ссылка на картинку" aria-label="Ссылка на обложку">
    <button class="ib" data-act="cover-up" title="Загрузить файл" aria-label="Загрузить файл">${ic('upload', 16)}</button>
    <button class="ib" data-act="cover-auto" title="Подобрать автоматически" aria-label="Подобрать автоматически">${ic('wand', 16)}</button>
    <button class="ib" data-act="cover-reset" title="Сбросить" aria-label="Сбросить обложку">${ic('x', 16)}</button></div>
  <div class="lbl"><span>Автоучёт времени</span></div>
  <div class="covctl"><input data-k="dir" value="${esc(g.dir)}" placeholder="Папка игры на диске" aria-label="Папка игры">
    <button class="ib" data-act="bind" title="Выбрать из запущенных программ" aria-label="Выбрать из запущенных программ">${ic('folder', 16)}</button></div>
  <select id="bindsel" hidden aria-label="Запущенные программы"></select>
  ${g.last || g.sessions?.length ? `<p class="hint">${g.last ? 'Последний запуск: ' + dateRu(g.last) : ''}${g.sessions?.length ? ' · сессий: ' + g.sessions.length : ''}</p>` : ''}`;
}
const setCover = (id, url) => { lib[id].cover = url; push(id, {cover: url}); patchCover(id); refreshPage(id); };
const patchCover = id => document.querySelectorAll(`.gc[data-id="${CSS.escape(id)}"] img`).forEach(i => { i.dataset.st = 0; i.src = lib[id].cover || (isSteam(id) ? CDN + id + '/library_600x900.jpg' : '/uploads/none.png'); });

function extAct(act, b) {
  const pid = state.pid, host = b.closest('[data-id]'), id = host?.dataset.id;
  const A = {
    newgame: () => openNew(),
    'ng-close': () => closeNew(),
    'ng-save': () => saveNew(),
    'ng-up': async () => { const f = await pickFile('image/*'); if (!f) return; try { $('#ng-cover').value = await uploadFile(f); ngPrev(); } catch (e) { toast(e.message); } },
    'ng-auto': async () => { const n = $('#ng-name').value.trim(); if (!n) return toast('Сначала введите название'); const r = await jf(`/api/cover?id=${ngId}&name=${encodeURIComponent(n)}&force=1`).catch(() => ({})); if (r.url) { $('#ng-cover').value = r.url; ngPrev(); } else toast('Не нашлось. Добавьте ключ SteamGridDB или RAWG в настройках'); },
    'cover-up': async () => { if (!lib[pid]) return; const f = await pickFile('image/*'); if (!f) return; try { setCover(pid, await uploadFile(f)); toast('Обложка загружена'); } catch (e) { toast(e.message); } },
    'cover-auto': async () => { if (!lib[pid]) return; const r = await jf(`/api/cover?id=${encodeURIComponent(pid)}&name=${encodeURIComponent(lib[pid].name)}&force=1`).catch(() => ({})); if (r.url) { setCover(pid, r.url); toast('Обложка подобрана'); } else toast('Не нашлось. Подключите SteamGridDB в настройках или загрузите свою'); },
    'cover-reset': () => { if (lib[pid]) { setCover(pid, ''); toast('Стандартная обложка'); } },
    bind: async () => { const sel = $('#bindsel'); if (!sel) return; const list = await jf('/api/tracker/processes').catch(() => []);
      sel.innerHTML = `<option value="">${list.length ? 'Выберите запущенную игру…' : 'Сейчас ничего подходящего не запущено. Запустите игру и нажмите снова'}</option>` + list.map(p => `<option value="${esc(p.dir)}">${esc(p.name)} — ${esc(p.dir)}</option>`).join(''); sel.hidden = false; },
    tog: async () => { const k = b.dataset.k; if (k === 'autostart') { const on = !b.classList.contains('on'); await jf('/api/desktop/autostart', 'PUT', {on}); return renderSettings(); }
      if (k === 'onlyPlayed') { b.classList.toggle('on'); b.setAttribute('aria-checked', b.classList.contains('on')); return; }
      await jf('/api/config', 'PUT', {tracker: {[k]: !b.classList.contains('on')}}); renderSettings(); },
    savelists: async () => { const l = id => $(id).value.split('\n').map(s => s.trim()).filter(Boolean); await jf('/api/config', 'PUT', {tracker: {folders: l('#s-folders'), ignore: l('#s-ignore')}}); await jf('/api/tracker/rescan', 'POST'); toast('Сохранено'); renderSettings(); },
    rescan: async () => { await jf('/api/tracker/rescan', 'POST'); toast('Список установленных игр обновлён'); renderSettings(); },
    savekey: async () => { const p = b.dataset.p, v = $('#k-' + p).value.trim(), body = {};
      if (p === 'steam') { if (v) body.steamKey = v; body.steamId = $('#k-steamid').value.trim(); } else if (v) body[p] = v; else return toast('Поле пустое');
      await jf('/api/config', 'PUT', {keys: body}); toast('Ключ сохранён'); renderSettings(); },
    clearkey: async () => { const p = b.dataset.p; await jf('/api/config', 'PUT', {keys: p === 'steam' ? {steamKey: null, steamId: null} : {[p]: null}}); toast('Ключ удалён'); renderSettings(); },
    testkey: async () => { b.disabled = true; const r = await jf('/api/config/test', 'POST', {provider: b.dataset.p}).catch(() => ({ok: false, msg: 'Нет связи с сервером'})); b.disabled = false; toast((r.ok ? '✓ ' : '✕ ') + r.msg); },
    steamimport: async () => { b.disabled = true; toast('Импортирую библиотеку Steam…'); const r = await jf('/api/steam/import', 'POST', {onlyPlayed: $('[data-k=onlyPlayed]').classList.contains('on')}).catch(() => ({error: 'Нет связи с сервером'})); b.disabled = false;
      if (r.error) return toast(r.error); toast(`Готово: добавлено ${r.added}, обновлены часы у ${r.updated} (всего в профиле ${r.total})`); syncLib(); },
    importfile: async () => { const f = await pickFile('.json,application/json'); if (!f) return; try { const j = JSON.parse(await f.text()); const r = await jf('/api/lib/import', 'POST', {lib: j.lib || j, mode: 'merge'}); if (r.error) throw new Error(r.error); toast(`Импортировано игр: ${r.n}`); syncLib(); } catch (e) { toast('Не удалось прочитать файл: ' + e.message); } },
    opendata: () => jf('/api/desktop/open-data', 'POST')
  };
  const fn = A[act]; if (!fn) return false; fn(); return true;
}
document.addEventListener('change', e => {
  if (e.target.id !== 'bindsel' || !e.target.value) return;
  const id = state.pid, g = lib[id]; if (!g) return;
  g.dir = e.target.value; push(id, {dir: g.dir}); e.target.hidden = true; refreshPage(id); toast('Папка привязана — часы пойдут автоматически');
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal().hidden) closeNew(); });

// ===== добавление своей игры =====
let ngId = '';
function openNew() {
  ngId = 'c' + Date.now().toString(36);
  modal().innerHTML = `<div class="mbox" role="dialog" aria-modal="true" aria-label="Новая игра">
  <div class="mh"><h2>Своя игра</h2><button class="ib" data-act="ng-close" aria-label="Закрыть">${ic('x', 18)}</button></div>
  <div class="mgrid"><div class="mcover" id="ng-prev"><span class="mut">Обложка</span></div>
  <div class="mform">
    <label>Название<input id="ng-name" class="tin" placeholder="Например, My Game" autocomplete="off"></label>
    <label>Обложка<span class="covctl"><input id="ng-cover" placeholder="Ссылка на картинку" oninput="ngPrev()">
      <button class="ib" data-act="ng-up" title="Загрузить файл" aria-label="Загрузить файл">${ic('upload', 16)}</button><button class="ib" data-act="ng-auto" title="Подобрать автоматически" aria-label="Подобрать автоматически">${ic('wand', 16)}</button></span></label>
    <div class="two"><label>Статус<select id="ng-status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${k === 'playing' ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
    <label>Наиграно, ч<input id="ng-hours" type="number" min="0" step="0.5" class="tin" placeholder="0"></label></div>
    <label>Папка игры (для автоучёта часов)<input id="ng-dir" class="tin" placeholder="D:\\Games\\MyGame"></label>
    <label>Описание<textarea id="ng-desc" class="mini" placeholder="Необязательно"></textarea></label>
    <p class="hint l">Игры из Steam проще найти через поиск вверху, а запущенные на ПК приложение найдёт само.</p>
    <button class="btn" data-act="ng-save">${ic('check', 16)} Добавить</button></div></div></div>`;
  modal().hidden = false; document.body.classList.add('lock'); $('#ng-name').focus();
}
function ngPrev() { const u = $('#ng-cover').value.trim(); $('#ng-prev').innerHTML = u ? `<img src="${esc(u)}" alt="" onerror="this.remove()">` : '<span class="mut">Обложка</span>'; }
function closeNew() { modal().hidden = true; modal().innerHTML = ''; document.body.classList.remove('lock'); }
function saveNew() {
  const name = $('#ng-name').value.trim(); if (!name) { $('#ng-name').focus(); return toast('Введите название'); }
  const h = $('#ng-hours').value;
  lib[ngId] = {name, status: $('#ng-status').value, hours: h === '' ? '' : Math.max(0, +h), rating: '', note: '', cover: $('#ng-cover').value.trim(), desc: $('#ng-desc').value.trim(), dir: $('#ng-dir').value.trim(), src: 'custom', added: new Date().toISOString()};
  push(ngId); names[ngId] = name; const id = ngId; closeNew(); nav(); toast(`«${name}» добавлена`); location.hash = 'game=' + id;
}

// ===== страница настроек =====
const tg = (k, on, label, hint) => `<div class="srow"><div><b>${label}</b>${hint ? `<p class="mut">${hint}</p>` : ''}</div><button class="tg${on ? ' on' : ''}" role="switch" aria-checked="${!!on}" aria-label="${esc(label)}" data-act="tog" data-k="${k}"><i></i></button></div>`;
const chipOf = k => k.set ? `<span class="okc">${ic('check', 12)} ${k.builtin ? 'встроенный ключ' : 'подключён'} · ••••${esc(k.tail)}</span>` : '<span class="mut">не подключён</span>';
const keyRow = (p, title, hint, url, k, extra = '') => `<div class="kcard"><div class="kh"><div><b>${title}</b><p class="mut">${hint} <a href="${url}" target="_blank" rel="noreferrer">Получить ключ</a></p></div>${chipOf(k)}</div>
  <div class="covctl"><input id="k-${p}" type="password" autocomplete="off" placeholder="${k.set ? 'Вставьте новый ключ, чтобы заменить' : 'Вставьте ключ'}" aria-label="${title}">
  <button class="ib" data-act="savekey" data-p="${p}" title="Сохранить" aria-label="Сохранить">${ic('check', 16)}</button>
  <button class="ib" data-act="testkey" data-p="${p}" title="Проверить" aria-label="Проверить">${ic('play', 16)}</button>
  <button class="ib" data-act="clearkey" data-p="${p}" title="Удалить ключ" aria-label="Удалить ключ">${ic('trash', 16)}</button></div>${extra}</div>`;
async function renderSettings() {
  const box = $('#settingsBox'); if (!box) return;
  if (!online) { box.innerHTML = '<p class="mut">Настройки доступны, когда приложение запущено через Game Tracker.exe или server.js.</p>'; return; }
  let c, s; try { [c, s] = await Promise.all([jf('/api/config'), jf('/api/tracker/status')]); } catch { box.innerHTML = '<p class="mut">Нет связи с сервером.</p>'; return; }
  if (state.view !== 'settings') return;
  const t = c.tracker, k = c.keys;
  const status = !s.supported ? 'Автоучёт работает в Windows (и Linux). На этой системе он отключён.' : !s.enabled ? 'Отслеживание выключено.' : s.now.length ? `Сейчас играете: <b>${esc(s.now[0].name)}</b>` : 'Слежу за запуском игр. Запустите любую игру, и она появится в библиотеке.';
  box.innerHTML = `
  <section class="scard"><h2>Отслеживание игр</h2><p class="mut sdesc">${status}</p>
    ${tg('enabled', t.enabled, 'Следить за запущенными играми', 'Приложение видит процессы игр, ищет их в Steam и считает время.')}
    ${tg('autoAdd', t.autoAdd, 'Добавлять найденные игры в библиотеку', 'Новые игры подтягиваются сами, обложка и название берутся из Steam.')}
    ${tg('autoStatus', t.autoStatus, 'Ставить статус «Играю» при запуске', 'Только для игр со статусом «Буду играть» или «Брошено».')}
    ${c.desktop ? tg('autostart', c.autostart, 'Запускать вместе с Windows', 'Приложение сворачивается в трей и считает часы в фоне.') : ''}
    <div class="srow col"><div><b>Дополнительные папки с играми</b><p class="mut">По одной на строку. Steam, Epic, GOG, EA и папки «Games» на всех дисках ищутся сами (найдено игр Steam: ${s.steamGames}, папок: ${s.roots}).</p></div>
      <textarea id="s-folders" class="mini" placeholder="D:\\Мои игры">${esc((t.folders || []).join('\n'))}</textarea></div>
    <div class="srow col"><div><b>Не учитывать</b><p class="mut">Название папки, имя .exe или appid Steam. Wallpaper Engine и служебные программы Steam уже исключены автоматически.</p></div>
      <textarea id="s-ignore" class="mini" placeholder="wallpaper_engine">${esc((t.ignore || []).join('\n'))}</textarea></div>
    <div class="sbtns"><button class="ib wide" data-act="savelists" title="Сохранить списки">${ic('check', 16)} Сохранить</button><button class="ib" data-act="rescan" title="Пересканировать установленные игры" aria-label="Пересканировать">${ic('upr', 16)}</button></div>
  </section>
  <section class="scard"><h2>Источники данных и API-ключи</h2><p class="mut sdesc">Ключи хранятся только на вашем компьютере (файл config.json) и никуда, кроме самих сервисов, не отправляются.</p>
    ${keyRow('steamgriddb', 'SteamGridDB: вертикальные обложки', 'Красивые постеры 600×900 для любых игр, в том числе тех, у которых Steam отдаёт только баннер.', 'https://www.steamgriddb.com/profile/preferences/api', k.steamgriddb)}
    ${keyRow('rawg', 'RAWG: база игр', 'Главная база приложения: каталог с фильтрами по платформам, описания, скриншоты, среднее время прохождения для прогресса. Уже работает со встроенным ключом, свой вставляйте только при желании.', 'https://rawg.io/apidocs', k.rawg)}
    ${keyRow('steam', 'Steam Web API: импорт библиотеки и часов', 'Подтягивает все ваши игры и сколько вы в них наиграли. Профиль и «Сведения об играх» должны быть открытыми.', 'https://steamcommunity.com/dev/apikey', k.steamKey,
      `<div class="covctl" style="margin-top:8px"><input id="k-steamid" value="${esc(k.steamId)}" placeholder="SteamID64 (17 цифр, из ссылки на профиль)" aria-label="SteamID64"></div>
       <div class="srow"><div><b>Только игры, в которые играли</b></div><button class="tg on" role="switch" aria-checked="true" data-act="tog" data-k="onlyPlayed" aria-label="Только сыгранные"><i></i></button></div>
       <div class="sbtns"><button class="ib wide" data-act="steamimport" title="Импортировать">${ic('download', 16)} Импортировать из Steam</button></div>`)}
  </section>
  <section class="scard"><h2>Данные</h2>
    <p class="mut sdesc">Библиотека лежит в файле library.json (рядом лежит резервная копия .bak). Можно сохранить её и перенести на другой ПК.</p>
    <div class="sbtns"><a class="ib wide" href="/api/export" download>${ic('download', 16)} Экспорт</a><button class="ib wide" data-act="importfile">${ic('upload', 16)} Импорт</button>${c.desktop ? `<button class="ib wide" data-act="opendata">${ic('folder', 16)} Папка с данными</button>` : ''}</div>
  </section>`;
}
boot();

'use strict';
// [appid, название] — встроенный каталог популярных игр Steam
const FEATURED = [
[570,"Dota 2"],[730,"Counter-Strike 2"],[1091500,"Cyberpunk 2077"],[292030,"The Witcher 3: Wild Hunt"],[271590,"Grand Theft Auto V"],
[1245620,"Elden Ring"],[1086940,"Baldur's Gate 3"],[2050650,"Resident Evil 4"],[1196590,"Resident Evil Village"],[883710,"Resident Evil 2"],
[952060,"Resident Evil 3"],[1174180,"Red Dead Redemption 2"],[377160,"Fallout 4"],[22380,"Fallout: New Vegas"],[1151340,"Fallout 76"],
[374320,"Dark Souls III"],[570940,"Dark Souls: Remastered"],[335300,"Dark Souls II: SotFS"],[1687950,"Persona 5 Royal"],[1113000,"Persona 4 Golden"],
[2161700,"Persona 3 Reload"],[1172470,"Apex Legends"],[252490,"Rust"],[578080,"PUBG: BATTLEGROUNDS"],[440,"Team Fortress 2"],
[550,"Left 4 Dead 2"],[620,"Portal 2"],[220,"Half-Life 2"],[546560,"Half-Life: Alyx"],[10,"Counter-Strike 1.6"],
[105600,"Terraria"],[413150,"Stardew Valley"],[489830,"Skyrim Special Edition"],[1145360,"Hades"],[1145350,"Hades II"],
[367520,"Hollow Knight"],[1030300,"Hollow Knight: Silksong"],[268910,"Cuphead"],[814380,"Sekiro: Shadows Die Twice"],[582010,"Monster Hunter: World"],
[2246340,"Monster Hunter Wilds"],[553850,"Helldivers 2"],[1623730,"Palworld"],[1966720,"Lethal Company"],[990080,"Hogwarts Legacy"],
[1716740,"Starfield"],[1190460,"Death Stranding"],[870780,"Control"],[782330,"DOOM Eternal"],[379720,"DOOM"],
[1328670,"Mass Effect Legendary Edition"],[2208920,"Assassin's Creed Valhalla"],[812140,"Assassin's Creed Odyssey"],[552520,"Far Cry 5"],[2369390,"Far Cry 6"],
[1172620,"Sea of Thieves"],[892970,"Valheim"],[264710,"Subnautica"],[526870,"Satisfactory"],[427520,"Factorio"],
[255710,"Cities: Skylines"],[289070,"Sid Meier's Civilization VI"],[1142710,"Total War: WARHAMMER III"],[813780,"Age of Empires II: DE"],[394360,"Hearts of Iron IV"],
[236850,"Europa Universalis IV"],[1158310,"Crusader Kings III"],[281990,"Stellaris"],[252950,"Rocket League"],[1097150,"Fall Guys"],
[945360,"Among Us"],[739630,"Phasmophobia"],[548430,"Deep Rock Galactic"],[632360,"Risk of Rain 2"],[1794680,"Vampire Survivors"],
[646570,"Slay the Spire"],[632470,"Disco Elysium"],[435150,"Divinity: Original Sin 2"],[379430,"Kingdom Come: Deliverance"],[261550,"Mount & Blade II: Bannerlord"],
[397540,"Borderlands 3"],[49520,"Borderlands 2"],[203160,"Tomb Raider (2013)"],[750920,"Shadow of the Tomb Raider"],[412020,"Metro Exodus"],
[208650,"Batman: Arkham Knight"],[1971870,"Mortal Kombat 1"],[1778820,"TEKKEN 8"],[1364780,"Street Fighter 6"],[2138710,"Sifu"],
[524220,"NieR: Automata"],[601150,"Devil May Cry 5"],[1593500,"God of War"],[1151640,"Horizon Zero Dawn"],[1817070,"Marvel's Spider-Man Remastered"],
[1888930,"The Last of Us Part I"],[2215430,"Ghost of Tsushima"],[2358720,"Black Myth: Wukong"],[1627720,"Lies of P"],[1888160,"Armored Core VI"],
[1868140,"Dave the Diver"],[1313140,"Cult of the Lamb"],[504230,"Celeste"],[391540,"Undertale"],[1057090,"Ori and the Will of the Wisps"],
[1426210,"It Takes Two"],[728880,"Overcooked! 2"],[230410,"Warframe"],[1085660,"Destiny 2"],[238960,"Path of Exile"],
[1599340,"Lost Ark"],[2767030,"Marvel Rivals"],[2357570,"Overwatch 2"],[381210,"Dead by Daylight"],[359550,"Rainbow Six Siege"],
[1517290,"Battlefield 2042"],[1272080,"PAYDAY 3"],[218620,"PAYDAY 2"],[2124490,"Silent Hill 2"],[534380,"Dying Light 2"],
[239140,"Dying Light"],[1259420,"Days Gone"],[108600,"Project Zomboid"],[251570,"7 Days to Die"],[346110,"ARK: Survival Evolved"],
[1326470,"Sons of the Forest"],[668580,"Atomic Heart"],[1643320,"S.T.A.L.K.E.R. 2"],[1659040,"HITMAN World of Assassination"],[2622380,"Elden Ring Nightreign"],
[2379780,"Balatro"],[1903340,"Clair Obscur: Expedition 33"],[3527290,"PEAK"],[1030840,"Mafia: Definitive Edition"]
];

// Подборки для каруселей каталога (id игр из списка выше). Неразобранное попадает в «Ещё».
const CATS = [
['Экшен и приключения',[1091500,271590,1174180,1190460,870780,1593500,1151640,1817070,1888930,2215430,2358720,1259420,208650,203160,750920,2138710,524220,601150,1659040,1030840]],
['Ролевые игры',[292030,1245620,1086940,489830,377160,22380,632470,435150,379430,261550,1687950,1113000,2161700,1903340,1328670,2208920,812140,1716740,990080,1643320,238960,1599340,1151340]],
['Сложные игры',[374320,570940,335300,814380,1627720,1888160,367520,1030300,268910,504230,2622380,582010,2246340]],
['Шутеры',[730,1172470,578080,440,550,10,359550,1517290,2767030,2357570,782330,379720,553850,552520,2369390,397540,49520,412020,1272080,218620,668580,1085660,230410]],
['Хорроры и выживание',[2050650,1196590,883710,952060,2124490,739630,1966720,381210,534380,239140,108600,251570,346110,1326470,252490,892970,264710,1623730]],
['Стратегии и симуляторы',[255710,289070,1142710,813780,394360,236850,1158310,281990,526870,427520,646570,2379780,1794680]],
['Инди и кооператив',[105600,413150,1145360,1145350,391540,1057090,1426210,728880,945360,1097150,252950,548430,632360,1868140,1313140,1172620,3527290]],
['Valve',[570,620,220,546560]]
];
const NAME = new Map(FEATURED);
const ROWS = (() => {
  const used = new Set(), rows = CATS.map(([t, ids]) => [t, ids.filter(id => NAME.has(id) && !used.has(id) && used.add(id))]);
  const rest = FEATURED.map(f => f[0]).filter(id => !used.has(id));
  if (rest.length) rows.push(['Ещё', rest]);
  return rows.filter(r => r[1].length);
})();
const CAT_OF = new Map(ROWS.flatMap(([t, ids]) => ids.map(id => [id, t])));

const STATUS = {playing:'Играю',done:'Прошёл',planned:'Буду играть',dropped:'Брошено'};
const KEY = 'gameTracker.v1', CDN = 'https://cdn.akamai.steamstatic.com/steam/apps/', PX = 'https://api.allorigins.win/raw?url=';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dec = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
const IC = {
  pad:'<path d="M6 12h4M8 10v4"/><circle cx="15" cy="13" r="1"/><circle cx="18" cy="11" r="1"/><path d="M17.3 5H6.7a4 4 0 0 0-3.9 3.2l-1.6 7.5A3 3 0 0 0 4 19c1 0 1.9-.5 2.4-1.3L8 15h8l1.6 2.7c.5.8 1.4 1.3 2.4 1.3a3 3 0 0 0 2.8-3.3l-1.6-7.5A4 4 0 0 0 17.3 5z"/>',
  back:'<path d="m12 19-7-7 7-7M19 12H5"/>', chevL:'<path d="m15 18-6-6 6-6"/>', chevR:'<path d="m9 18 6-6-6-6"/>',
  upr:'<path d="M7 17 17 7M7 7h10v10"/>', plus:'<path d="M12 5v14M5 12h14"/>', x:'<path d="M6 6l12 12M18 6 6 18"/>',
  max:'<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
  up:'<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  down:'<path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>'};
const ic = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;

let lib = {};
try { lib = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { lib = {}; }
const state = {view:'catalog', filter:'all', sort:'name', q:'', remote:[], pid:0, tab:'ov', shot:0};
const steam = {items:[], start:0, total:0, busy:false};
const info = {}, pend = {}, names = {};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(lib)); } catch { toast('Не удалось сохранить данные в браузере'); } };
let tt;
function toast(m){ const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 3200); }
// Сначала свой сервер (/proxy из server.js), затем публичные прокси
const PROXIES = [u => '/proxy?url=' + encodeURIComponent(u), u => PX + encodeURIComponent(u), u => 'https://corsproxy.io/?url=' + encodeURIComponent(u), u => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u)];
let pi = 0;
async function proxy(u){
  for (let k = 0; k < PROXIES.length; k++) {
    const i = (pi + k) % PROXIES.length;
    try { const r = await fetch(PROXIES[i](u)); if (!r.ok) continue; const j = JSON.parse(await r.text()); pi = i; return j; } catch {}
  }
  throw new Error('proxy');
}

// Подробности игры из Steam: разработчик, дата, жанры, скриншоты
function details(id){
  return pend[id] || (pend[id] = proxy(`https://store.steampowered.com/api/appdetails?appids=${id}&l=russian&cc=US`)
    .then(j => info[id] = j[id]?.success ? j[id].data : null).catch(() => { delete pend[id]; return null; }));
}

// ===== карточки =====
const actInner = id => lib[id]
  ? `<span class="gc-st s-${lib[id].status}">${STATUS[lib[id].status]}</span>`
  : `<button class="gc-add" data-act="add" aria-label="Добавить в библиотеку">${ic('plus', 16)}</button>`;
function labelOf(id){
  if (state.view === 'library') { const g = lib[id] || {}; return [g.hours ? g.hours + ' ч' : '', g.rating ? '★ ' + g.rating : ''].filter(Boolean).join(' · '); }
  return state.view === 'steam' ? 'Steam' : (CAT_OF.get(+id) || 'Steam');
}
function card(id, name, im, label){
  names[id] = name;
  const alt = [CDN + id + '/header.jpg', im, CDN + id + '/capsule_616x353.jpg', CDN + id + '/library_hero.jpg'].filter(Boolean).map(esc).join('|');
  return `<div class="gc" data-id="${id}" data-name="${esc(name)}">
  <a class="gc-link" href="#game=${id}" draggable="false" aria-label="Открыть: ${esc(name)}">
    <img src="${CDN}${id}/library_600x900.jpg" alt="" loading="lazy" draggable="false" data-id="${id}" data-name="${esc(name)}" data-alt="${alt}">
    <span class="gc-shade"></span>
    <span class="gc-txt"><span class="gc-cat">${esc(label || '')}</span><span class="gc-title">${esc(name)}</span></span>
    <span class="gc-go">${ic('upr', 16)}</span>
  </a>
  <div class="gc-act">${actInner(id)}</div></div>`;
}
const patchCards = id => document.querySelectorAll(`.gc[data-id="${id}"] .gc-act`).forEach(el => el.innerHTML = actInner(id));

function rowsHtml(){
  return ROWS.map(([t, ids]) => `<section class="row"><div class="row-h"><h2>${esc(t)}<i>${ids.length}</i></h2>
  <div class="arrows"><button class="rb" data-car="-1" aria-label="Назад">${ic('chevL')}</button><button class="rb" data-car="1" aria-label="Вперёд">${ic('chevR')}</button></div></div>
  <div class="track">${ids.map(id => card(id, NAME.get(id), null, t)).join('')}</div></section>`).join('');
}

function list(){
  const q = state.q.trim().toLowerCase();
  if (state.view === 'steam') return steam.items;
  let items;
  if (state.view === 'library') items = Object.entries(lib).filter(([, g]) => state.filter === 'all' || g.status === state.filter).map(([id, g]) => [+id, g.name]);
  else { const seen = new Set(); items = [...state.remote, ...FEATURED].filter(([id]) => !seen.has(id) && seen.add(id)); }
  if (q) items = items.filter(([id, n]) => n.toLowerCase().includes(q) || String(id) === q || (state.view === 'catalog' && state.remote.some(r => r[0] === id)));
  if (state.view === 'catalog') return items;
  const v = id => lib[id] || {};
  return items.sort((a, b) => state.sort === 'hours' ? (+v(b[0]).hours||0) - (+v(a[0]).hours||0) : state.sort === 'rating' ? (+v(b[0]).rating||0) - (+v(a[0]).rating||0) : a[1].localeCompare(b[1]));
}
function head(){
  const v = state.view;
  $('#h1').textContent = v === 'steam' ? 'Весь Steam' : v === 'library' ? (state.filter === 'all' ? 'Моя библиотека' : STATUS[state.filter]) : (state.q.trim() ? 'Результаты' : 'Каталог');
  $('#sub').textContent = v === 'steam' ? 'Полный магазин Steam: популярное, новинки и лучшие по отзывам.' : v === 'library' ? 'Ваши игры, часы и оценки.' : 'Подборки популярных игр. Нажмите на карточку, чтобы открыть страницу.';
  $('.tools').hidden = v === 'catalog'; $('#stats').hidden = v !== 'library';
  const o = v === 'steam' ? [['topsellers','Популярные'],['new','Новинки'],['reviews','По отзывам']] : [['name','По названию'],['hours','По времени'],['rating','По оценке']];
  const s = $('#sort');
  if (s.dataset.v !== v) { s.dataset.v = v; state.sort = o[0][0]; s.innerHTML = o.map(([k, t]) => `<option value="${k}">${t}</option>`).join(''); }
}
function nav(){
  const nl = (v, t, n) => `<button class="nl${state.view === v ? ' on' : ''}" data-view="${v}">${t}${n != null ? `<i>${n}</i>` : ''}</button>`;
  $('#nav').innerHTML = nl('catalog', 'Каталог') + nl('steam', 'Весь Steam') + nl('library', 'Библиотека', Object.keys(lib).length);
  $('#logo').innerHTML = ic('pad', 22) + ' GAME TRACKER';
}
function chips(){
  const c = s => Object.values(lib).filter(g => s === 'all' || g.status === s).length;
  $('#chips').innerHTML = state.view === 'library' ? [['all', 'Все'], ...Object.entries(STATUS)].map(([k, v]) => `<button class="fc${state.filter === k ? ' on' : ''}" data-f="${k}">${v} ${c(k)}</button>`).join('') : '';
}
function stats(){
  const v = Object.values(lib), n = s => v.filter(g => g.status === s).length;
  const h = Math.round(v.reduce((a, g) => a + (+g.hours || 0), 0) * 10) / 10;
  $('#stats').innerHTML = [['Всего игр', v.length], ['В игре', n('playing')], ['Пройдено', n('done')], ['Запланировано', n('planned')], ['Брошено', n('dropped')], ['Всего часов', h]].map(([l, x]) => `<div><b>${x}</b><small>${l}</small></div>`).join('');
}
function render(){
  head();
  const home = state.view === 'catalog' && !state.q.trim();
  $('#rows').hidden = !home; $('#grid').hidden = home;
  let items = [];
  if (home) { $('#rows').innerHTML = rowsHtml(); $('#grid').innerHTML = ''; }
  else { items = list(); $('#rows').innerHTML = ''; $('#grid').innerHTML = items.map(([id, n, im]) => card(id, n, im, labelOf(id))).join(''); }
  const e = $('#empty'); e.hidden = home || items.length > 0 || (state.view === 'steam' && steam.busy);
  e.textContent = state.view === 'library' ? 'Здесь пока пусто. Откройте каталог и добавьте первую игру.' : 'Ничего не найдено. Попробуйте другое название.';
  const m = $('#more'); m.hidden = !(state.view === 'steam' && steam.items.length < steam.total); m.disabled = steam.busy;
  m.textContent = steam.busy ? 'Загрузка…' : `Показать ещё (${steam.items.length} из ${steam.total})`;
  nav(); chips(); stats(); requestAnimationFrame(updRows);
}

// Обложки: цепочка запасных источников, потом данные игры, потом градиент
function ph(i){ if (i.dataset.hero) return i.remove(); const d = document.createElement('div'); d.className = 'ph'; if (!i.closest('.gc')) d.textContent = i.dataset.name; i.replaceWith(d); }
document.addEventListener('error', e => {
  const i = e.target; if (i.tagName !== 'IMG' || !i.dataset.id) return;
  const alt = (i.dataset.alt || '').split('|').filter(Boolean);
  if (alt.length) { i.src = alt.shift(); i.dataset.alt = alt.join('|'); return; }
  if (i.dataset.det) return ph(i);
  i.dataset.det = 1;
  details(+i.dataset.id).then(d => { const u = d?.header_image || d?.screenshots?.[0]?.path_thumbnail; u ? i.src = u : ph(i); });
}, true);

// ===== карусели: стрелки, состояние кнопок, перетаскивание мышью =====
function updRow(row){
  const t = row.querySelector('.track'); if (!t) return;
  const [p, n] = row.querySelectorAll('.rb');
  if (p) p.disabled = t.scrollLeft <= 2;
  if (n) n.disabled = t.scrollLeft + t.clientWidth >= t.scrollWidth - 2;
}
const updRows = () => document.querySelectorAll('.row').forEach(updRow);
document.addEventListener('scroll', e => { const t = e.target; if (t.classList?.contains('track')) updRow(t.parentElement); }, true);
addEventListener('resize', updRows);
let drag = null, suppress = false;
document.addEventListener('mousedown', e => {
  const t = e.target.closest?.('.track,.thumbs'); if (!t || e.button !== 0) return;
  drag = {t, x: e.clientX, l: t.scrollLeft, moved: false};
});
document.addEventListener('mousemove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; drag.t.classList.add('drag'); }
  if (drag.moved) drag.t.scrollLeft = drag.l - dx;
});
addEventListener('mouseup', () => {
  if (!drag) return;
  drag.t.classList.remove('drag'); if (drag.moved) { suppress = true; setTimeout(() => suppress = false, 0); }
  drag = null;
});
document.addEventListener('click', e => { if (suppress) { e.preventDefault(); e.stopPropagation(); suppress = false; } }, true);
// колесо мыши над лентой миниатюр листает её горизонтально
document.addEventListener('wheel', e => {
  const t = e.target.closest?.('.thumbs'); if (!t || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
  e.preventDefault(); t.scrollLeft += e.deltaY;
}, {passive: false});

// ===== страница игры (маршрут #game=ID) =====
let snap = null;
const curId = () => +($('#page .gp')?.dataset.id || 0);
function route(){
  const m = location.hash.match(/^#game=(\d+)/), home = $('#home');
  if (m) {
    if (!home.hidden) snap = {view: state.view, y: scrollY, x: [...document.querySelectorAll('#rows .track')].map(t => t.scrollLeft)};
    home.hidden = true; $('#page').hidden = false; openPage(+m[1]); scrollTo(0, 0);
  } else {
    closeLb(); state.pid = 0; $('#page').hidden = true; $('#page').innerHTML = ''; home.hidden = false; render();
    if (snap && snap.view === state.view && !state.q.trim()) {
      document.querySelectorAll('#rows .track').forEach((t, i) => { t.style.scrollBehavior = 'auto'; t.scrollLeft = snap.x[i] || 0; t.style.scrollBehavior = ''; });
      scrollTo(0, snap.y);
    } else scrollTo(0, 0);
    snap = null; requestAnimationFrame(updRows);
  }
}
async function openPage(id){
  const root = $('#page'), name = names[id] || lib[id]?.name || 'Игра ' + id;
  if (state.pid !== id) { state.pid = id; state.tab = 'ov'; state.shot = 0; Object.assign(rs, {id, type:'all', lang:'russian', auto:false}); }
  root.innerHTML = pageHtml(id, name, info[id] || null, false); afterPage();
  loadSummary(id);
  if (!info[id]) { const d = await details(id); if (location.hash !== '#game=' + id) return; root.innerHTML = pageHtml(id, name, d, !d); afterPage(); }
}
const afterPage = () => { setTab(state.tab); };
function pageHtml(id, name, d, fail){
  name = d?.name || name;
  const pl = d?.platforms ? Object.entries({windows:'Windows', mac:'macOS', linux:'Linux'}).filter(([k]) => d.platforms[k]).map(e => e[1]).join(', ') : '';
  const meta = [d?.release_date?.date, (d?.developers || [])[0], pl].filter(Boolean);
  const hero = [d?.background_raw, d?.screenshots?.[0]?.path_full, d?.header_image, CDN + id + '/header.jpg'].filter(Boolean).map(esc).join('|');
  const shots = d?.screenshots || [];
  const vids = (d?.movies || []).map(m => [m.thumbnail, m.mp4?.max || m.mp4?.['480'] || m.webm?.max]).filter(v => v[1]).slice(0, 4);
  const fr = (a, b) => b ? `<div class="fr"><small>${a}</small><div>${b}</div></div>` : '';
  const facts = d ? fr('Дата выхода', esc(d.release_date?.date)) + fr('Платформы', esc(pl)) + fr('Разработчик', esc((d.developers || []).join(', '))) + fr('Издатель', esc((d.publishers || []).join(', '))) + fr('Цена', esc(d.is_free ? 'Бесплатно' : d.price_overview?.final_formatted)) + fr('Metacritic', esc(d.metacritic?.score)) : '';
  const link = fr('Steam', `<a href="https://store.steampowered.com/app/${id}" target="_blank" rel="noreferrer">store.steampowered.com/app/${id}</a>`);
  const desc = d ? `<p>${esc(dec(d.short_description || ''))}</p>` : `<p class="mut">${fail ? 'Не удалось загрузить данные из Steam. Попробуйте открыть страницу чуть позже.' : 'Загружаем данные из Steam…'}</p>`;
  const genres = (d?.genres || []).length ? `<div class="chips">${d.genres.map(g => `<span class="chip">${esc(g.description)}</span>`).join('')}</div>` : '';
  const tabs = [['ov', 'Обзор'], ...(shots.length ? [['sh', 'Скриншоты', shots.length]] : []), ...(vids.length ? [['vd', 'Видео', vids.length]] : []), ['rv', 'Отзывы']];
  if (!tabs.some(t => t[0] === state.tab)) state.tab = 'ov';
  const rb = (a, v, t) => `<button class="${rs[a === 'rt' ? 'type' : 'lang'] === v ? 'on' : ''}" data-${a}="${v}">${t}</button>`;
  return `<div class="gp" data-id="${id}" data-name="${esc(name)}">
  <div class="hero"><img class="bg" src="${CDN}${id}/library_hero.jpg" alt="" data-id="${id}" data-hero="1" data-name="${esc(name)}" data-alt="${hero}">
  <img class="logo-i" src="${CDN}${id}/logo.png" alt="" onerror="this.remove()">
  <button class="back" data-act="back">${ic('back', 16)} Назад</button></div>
  <div class="gwrap"><div class="gmain"><h1>${esc(name)}</h1><div class="gmeta">${meta.map(m => `<span>${esc(m)}</span>`).join('')}</div>
  <div class="tabs" role="tablist" aria-label="Разделы страницы">${tabs.map(([k, t, n]) => `<button role="tab" data-tab="${k}">${t}${n ? `<i>${n}</i>` : ''}</button>`).join('')}</div>
  <div class="tp" data-p="ov" role="tabpanel">${desc}${genres}<div class="facts">${facts}${link}</div></div>
  ${shots.length ? `<div class="tp" data-p="sh" role="tabpanel" hidden><div class="viewer"><img id="shot" src="${esc(shots[Math.min(state.shot, shots.length - 1)].path_full)}" alt="Скриншот" data-act="zoom">
    <button class="vnav prev" data-act="sprev" aria-label="Предыдущий скриншот">${ic('chevL', 20)}</button><button class="vnav next" data-act="snext" aria-label="Следующий скриншот">${ic('chevR', 20)}</button>
    <button class="vzoom" data-act="zoom" aria-label="Открыть на весь экран">${ic('max', 16)}</button><span class="vcount" id="vcount"></span></div>
    <div class="thumbs" id="thumbs">${shots.map((s, i) => `<button data-i="${i}" aria-label="Скриншот ${i + 1}"><img src="${esc(s.path_thumbnail)}" alt="" loading="lazy" draggable="false"></button>`).join('')}</div></div>` : ''}
  ${vids.length ? `<div class="tp vids" data-p="vd" role="tabpanel" hidden>${vids.map(v => `<video controls preload="none" poster="${esc(v[0])}" src="${esc(v[1])}"></video>`).join('')}</div>` : ''}
  <div class="tp" data-p="rv" role="tabpanel" hidden><div id="rsum"></div>
    <div class="rtools"><div class="seg2" role="group" aria-label="Тип отзывов">${rb('rt', 'all', 'Все')}${rb('rt', 'positive', 'Положительные')}${rb('rt', 'negative', 'Отрицательные')}</div>
    <div class="seg2" role="group" aria-label="Язык отзывов">${rb('rl', 'russian', 'Русские')}${rb('rl', 'all', 'Любые')}</div></div>
    <div id="rlist"></div><div class="morewrap"><button id="rmore" class="btn" data-act="rmore" hidden>Показать ещё</button></div></div></div>
  <aside id="pside">${pside(id)}</aside></div></div>`;
}
function setTab(t){
  state.tab = t;
  document.querySelectorAll('#page [data-tab]').forEach(b => { const on = b.dataset.tab === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
  document.querySelectorAll('#page .tp').forEach(p => p.hidden = p.dataset.p !== t);
  document.querySelectorAll('#page video').forEach(v => v.pause());
  if (t === 'sh') showShot(state.shot);
  if (t === 'rv') revInit(curId());
}

// ===== скриншоты =====
function showShot(i){
  const sh = info[state.pid]?.screenshots || []; if (!sh.length) return;
  i = (i + sh.length) % sh.length; state.shot = i; const s = sh[i];
  const img = $('#shot');
  if (img && img.src !== s.path_full) { const n = new Image(); n.onload = () => { if (state.shot === i) img.src = s.path_full; }; n.src = s.path_full; }
  const c = $('#vcount'); if (c) c.textContent = `${i + 1} / ${sh.length}`;
  const th = $('#thumbs');
  if (th) { [...th.children].forEach((b, k) => b.classList.toggle('on', k === i)); const t = th.children[i]; if (t) th.scrollTo({left: t.offsetLeft - (th.clientWidth - t.offsetWidth) / 2, behavior: 'smooth'}); }
  if (!$('#lb').hidden) { $('#lbimg').src = s.path_full; $('#lbcount').textContent = `${i + 1} / ${sh.length}`; }
  const nx = sh[(i + 1) % sh.length]; new Image().src = nx.path_full;
}
function openLb(){
  const sh = info[state.pid]?.screenshots || []; if (!sh.length) return;
  const lb = $('#lb');
  lb.innerHTML = `<img id="lbimg" alt=""><button class="lbx" data-act="lbclose" aria-label="Закрыть">${ic('x', 20)}</button>
  <button class="vnav prev" data-act="lbprev" aria-label="Предыдущий">${ic('chevL', 22)}</button><button class="vnav next" data-act="lbnext" aria-label="Следующий">${ic('chevR', 22)}</button><span class="vcount" id="lbcount"></span>`;
  lb.hidden = false; document.body.classList.add('lock'); showShot(state.shot);
}
function closeLb(){ const lb = $('#lb'); if (lb.hidden) return; lb.hidden = true; lb.innerHTML = ''; document.body.classList.remove('lock'); }

// ===== боковая панель =====
function pside(id){
  const g = lib[id], d = info[id], ms = d?.metacritic?.score, s = rsum[id];
  const tot = s ? s.total_positive + s.total_negative : 0, pct = tot ? Math.round(s.total_positive / tot * 100) : 0;
  return `<div class="tiles"><div class="tile"><b>${g?.rating || '—'}</b>Ваша оценка</div>${ms ? `<div class="tile"><b>${ms}</b>Metascore</div>` : ''}${tot ? `<div class="tile"><b>${pct}%</b>Отзывы Steam</div>` : ''}</div><div class="mctl">${mctrl(id)}</div>`;
}
const refreshPage = id => { const p = $('#pside'); if (p && curId() == id) p.innerHTML = pside(id); };
function mctrl(id){
  const g = lib[id];
  if (!g) return `<button class="btn" data-act="add">${ic('plus', 16)} В библиотеку</button><p class="hint">После добавления можно выбрать статус, указать часы и оценку.</p>`;
  return `<div class="seg" role="radiogroup" aria-label="Статус">${Object.entries(STATUS).map(([k, v]) => `<button class="${g.status === k ? 'on' : ''}" role="radio" aria-checked="${g.status === k}" data-act="status" data-v="${k}">${v}</button>`).join('')}</div>
  <div class="lbl"><span>Наиграно</span></div>
  <div class="hours"><button data-act="hadd" data-v="-1" aria-label="Минус час">−</button><input type="number" min="0" step="0.5" data-k="hours" placeholder="0" value="${esc(g.hours)}" aria-label="Часы"><button data-act="hadd" data-v="1" aria-label="Плюс час">+</button></div>
  <div class="quick">${[1, 5, 10].map(n => `<button data-act="hadd" data-v="${n}">+${n} ч</button>`).join('')}</div>
  <div class="lbl"><span>Оценка</span><b>${g.rating || 'нет'}</b></div>
  <div class="rate">${Array.from({length: 10}, (_, i) => i + 1).map(n => `<button class="${+g.rating === n ? 'on' : ''}" data-act="rate" data-v="${n}">${n}</button>`).join('')}</div>
  <textarea data-k="note" placeholder="Заметка об игре" aria-label="Заметка">${esc(g.note)}</textarea>
  <button class="ghost" data-act="del">Удалить из библиотеки</button>`;
}

// ===== отзывы игроков Steam =====
const RDESC = {'Overwhelmingly Positive':'Крайне положительные','Very Positive':'Очень положительные','Positive':'Положительные','Mostly Positive':'В основном положительные','Mixed':'Смешанные','Mostly Negative':'В основном отрицательные','Negative':'Отрицательные','Very Negative':'Очень отрицательные','Overwhelmingly Negative':'Крайне отрицательные'};
const rs = {id:0, type:'all', lang:'russian', auto:false}, rsum = {}, rc = {};
const clean = t => String(t || '').replace(/\[\/?[a-z0-9*]+(=[^\]]*)?\]/gi, '').replace(/\n{3,}/g, '\n\n').trim();
const fmt = n => (+n || 0).toLocaleString('ru-RU');
const fetchRevs = (id, lang, type, cursor, n = 10) => proxy(`https://store.steampowered.com/appreviews/${id}?` + new URLSearchParams({json:1, language:lang, filter:'all', review_type:type, purchase_type:'all', num_per_page:n, day_range:'9223372036854775807', cursor}));
async function loadSummary(id){
  if (rsum[id] === undefined) { try { rsum[id] = (await fetchRevs(id, 'all', 'all', '*', 1)).query_summary || null; } catch { rsum[id] = null; } }
  refreshPage(id); if (curId() === id) renderRevs();
}
function revInit(id){ if (!id) return; renderRevs(); revLoad(id); }
async function revLoad(id){
  const k = `${id}|${rs.lang}|${rs.type}`, lang = rs.lang, type = rs.type;
  const c = rc[k] || (rc[k] = {list:[], cursor:'*', done:false, busy:false, err:false});
  if (c.busy || c.done) return renderRevs();
  c.busy = true; c.err = false; renderRevs();
  try {
    const j = await fetchRevs(id, lang, type, c.cursor), raw = j.reviews || [];
    c.list.push(...raw.filter(v => clean(v.review))); c.cursor = j.cursor || c.cursor;
    if (!raw.length || raw.length < 10 || !j.cursor) c.done = true;
  } catch { c.err = true; }
  c.busy = false;
  if (!c.err && !c.list.length && c.done && lang === 'russian' && type === 'all' && rs.lang === 'russian') { rs.lang = 'all'; rs.auto = true; return revLoad(id); }
  renderRevs();
}
function revHtml(v){
  const up = v.voted_up, h = Math.round((v.author?.playtime_forever || 0) / 6) / 10, txt = clean(v.review);
  const dt = new Date(v.timestamp_created * 1000).toLocaleDateString('ru-RU', {day:'numeric', month:'long', year:'numeric'});
  const long = txt.length > 320 || txt.split('\n').length > 5;
  return `<article class="rev"><div class="rh"><span class="rv ${up ? 'up' : 'down'}">${ic(up ? 'up' : 'down', 15)}${up ? 'Рекомендует' : 'Не рекомендует'}</span><span class="rm">${h} ч в игре · ${dt}</span></div>
  <p class="rt${long ? ' clamp' : ''}">${esc(txt)}</p><div class="rf">${long ? '<button class="more" data-act="expand">Читать полностью</button>' : '<span></span>'}${v.votes_up ? `<span class="mut">Полезно: ${fmt(v.votes_up)}</span>` : ''}</div></article>`;
}
function renderRevs(){
  const id = rs.id, el = $('#rlist'); if (!el || curId() !== id) return;
  const s = rsum[id], sm = $('#rsum');
  if (s === undefined) sm.innerHTML = '<p class="mut">Загружаем рейтинг…</p>';
  else if (!s || !(s.total_positive + s.total_negative)) sm.innerHTML = '<p class="mut">Сводки по отзывам Steam пока нет.</p>';
  else { const tot = s.total_positive + s.total_negative, pct = Math.round(s.total_positive / tot * 100);
    sm.innerHTML = `<div class="rs"><div class="rs-n">${pct}%</div><div class="rs-t"><b>${esc(RDESC[s.review_score_desc] || s.review_score_desc || 'Отзывы игроков')}</b><span class="mut">${fmt(tot)} отзывов в Steam</span></div></div><div class="rs-bar"><i style="width:${pct}%"></i></div><div class="rs-l mut"><span>Рекомендуют: ${fmt(s.total_positive)}</span><span>Не рекомендуют: ${fmt(s.total_negative)}</span></div>`; }
  document.querySelectorAll('[data-rt]').forEach(b => b.classList.toggle('on', b.dataset.rt === rs.type));
  document.querySelectorAll('[data-rl]').forEach(b => b.classList.toggle('on', b.dataset.rl === rs.lang));
  const c = rc[`${id}|${rs.lang}|${rs.type}`], more = $('#rmore');
  const note = (rs.auto && rs.lang === 'all' ? '<p class="rnote mut">Отзывов на русском пока нет — показаны отзывы на всех языках.</p>' : '');
  if (!c || (c.busy && !c.list.length)) { el.innerHTML = note + '<p class="rnote mut">Загружаем отзывы…</p>'; more.hidden = true; return; }
  el.innerHTML = note + (c.list.length ? c.list.map(revHtml).join('') : c.err ? '<p class="rnote mut">Не удалось загрузить отзывы. Попробуйте позже.</p>' : '<p class="rnote mut">Отзывов с такими параметрами нет.</p>');
  more.hidden = c.done || (!c.list.length && c.err); more.disabled = c.busy; more.textContent = c.busy ? 'Загрузка…' : 'Показать ещё';
}

// ===== клики и ввод =====
document.addEventListener('click', e => {
  const t = e.target; let b;
  if (t.id === 'lb') return closeLb();
  if ((b = t.closest('[data-car]'))) { const tr = b.closest('.row').querySelector('.track'); tr.scrollBy({left: +b.dataset.car * tr.clientWidth * .85}); return; }
  if ((b = t.closest('[data-tab]'))) return setTab(b.dataset.tab);
  if ((b = t.closest('[data-i]'))) return showShot(+b.dataset.i);
  if ((b = t.closest('[data-rt]'))) { rs.type = b.dataset.rt; return revInit(rs.id); }
  if ((b = t.closest('[data-rl]'))) { rs.lang = b.dataset.rl; rs.auto = false; return revInit(rs.id); }
  b = t.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act;
  if (act === 'back') { location.hash = ''; return; }
  if (act === 'sprev') return showShot(state.shot - 1);
  if (act === 'snext') return showShot(state.shot + 1);
  if (act === 'zoom') return openLb();
  if (act === 'lbclose') return closeLb();
  if (act === 'lbprev') return showShot(state.shot - 1);
  if (act === 'lbnext') return showShot(state.shot + 1);
  if (act === 'rmore') return revLoad(rs.id);
  if (act === 'expand') { const r = b.closest('.rev'), cl = r.querySelector('.rt').classList.toggle('clamp'); b.textContent = cl ? 'Читать полностью' : 'Свернуть'; return; }
  const w = b.closest('[data-id]'), id = w?.dataset.id, name = w?.dataset.name, g = lib[id];
  if (!id || (!g && act !== 'add')) return;
  if (act === 'status') g.status = b.dataset.v;
  else if (act === 'hadd') g.hours = Math.max(0, Math.round(((+g.hours || 0) + +b.dataset.v) * 10) / 10);
  else if (act === 'rate') g.rating = +g.rating === +b.dataset.v ? '' : +b.dataset.v;
  else if (act === 'add') { lib[id] = {name, status:'planned', hours:'', rating:'', note:''}; toast(`«${name}» добавлена в библиотеку`); }
  else if (act === 'del') { delete lib[id]; toast(`«${name}» удалена из библиотеки`); }
  save(); nav(); stats();
  if (!$('#home').hidden) patchCards(id);
  refreshPage(id);
});
document.addEventListener('input', e => {
  const k = e.target.dataset.k; if (!k) return;
  let v = e.target.value;
  if (k === 'hours' && v !== '') v = Math.max(0, +v);
  const g = lib[e.target.closest('[data-id]')?.dataset.id]; if (!g) return;
  g[k] = v; save(); stats();
});
// клавиатура: стрелки в галерее / лайтбоксе, Esc, стрелки на вкладках
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') return closeLb();
  if (e.target.closest?.('input,textarea,select')) return;
  const tl = e.target.closest?.('[role=tablist]');
  if (tl && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    const bs = [...tl.querySelectorAll('[data-tab]')], i = bs.indexOf(e.target.closest('[data-tab]')), n = bs[(i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length];
    n.focus(); setTab(n.dataset.tab); e.preventDefault(); return;
  }
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  if (!$('#lb').hidden || (state.pid && state.tab === 'sh')) { showShot(state.shot + (e.key === 'ArrowRight' ? 1 : -1)); e.preventDefault(); }
});
// свайпы на телефоне: галерея и лайтбокс
let tx = null;
document.addEventListener('touchstart', e => { tx = e.target.closest?.('.viewer,#lb') ? e.touches[0].clientX : null; }, {passive: true});
document.addEventListener('touchend', e => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(dx) > 45) showShot(state.shot + (dx < 0 ? 1 : -1)); }, {passive: true});

$('#nav').onclick = e => {
  const b = e.target.closest('[data-view]'); if (!b) return;
  state.view = b.dataset.view; state.filter = 'all'; snap = null; if (location.hash) location.hash = ''; head(); scrollTo(0, 0);
  if (state.view === 'steam' && !steam.items.length) loadSteam(true); else render();
};
$('#chips').onclick = e => { const b = e.target.closest('[data-f]'); if (b) { state.filter = b.dataset.f; render(); } };
$('#sort').onchange = e => { state.sort = e.target.value; state.view === 'steam' ? loadSteam(true) : render(); };

// Просмотр всего Steam: по 50 игр
async function loadSteam(reset){
  if (steam.busy) return;
  if (reset) Object.assign(steam, {items:[], start:0, total:0});
  steam.busy = true; render();
  try {
    const p = new URLSearchParams({start:steam.start, count:50, infinite:1, category1:998, l:'russian', cc:'US', term:state.q.trim()});
    if (state.sort === 'new') p.set('sort_by', 'Released_DESC'); else if (state.sort === 'reviews') p.set('sort_by', 'Reviews_DESC'); else p.set('filter', 'topsellers');
    const j = await proxy('https://store.steampowered.com/search/results/?' + p);
    const doc = new DOMParser().parseFromString(j.results_html || '', 'text/html');
    let rows = [...doc.querySelectorAll('a[data-ds-appid]')].filter(a => !a.dataset.dsAppid.includes(',')).map(a => [+a.dataset.dsAppid, a.querySelector('.title')?.textContent.trim() || 'Без названия', a.querySelector('img')?.getAttribute('src')]);
    if (!rows.length && j.items) rows = j.items.map(i => [+(String(i.logo || '').match(/apps\/(\d+)/) || [])[1], i.name, i.logo]).filter(r => r[0]);
    const seen = new Set(steam.items.map(i => i[0]));
    rows.forEach(([id, n, im]) => { if (!seen.has(id)) { seen.add(id); steam.items.push([id, n, im]); } });
    steam.start += 50; steam.total = j.total_count || steam.items.length;
    if (!rows.length && reset) toast('Steam ничего не вернул по этому запросу');
  } catch { toast('Не удалось загрузить список Steam. Попробуйте ещё раз чуть позже.'); }
  steam.busy = false; render();
}
$('#more').onclick = () => loadSteam(false);

// Поиск с автокомплитом, debounce 300 мс
async function remote(q){
  if (q.length < 2) { state.remote = []; sug(); return render(); }
  try {
    const j = await proxy(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&l=russian&cc=US`);
    state.remote = (j.items || []).map(i => [i.id, i.name, i.tiny_image]);
    if (!state.remote.length) toast('В Steam ничего не нашлось');
  } catch { state.remote = []; toast('Нет связи со Steam. Поиск идёт по встроенному каталогу.'); }
  if (q === state.q.trim()) { sug(); if (state.view !== 'steam') render(); }
}
function sug(){
  const u = $('#sug'), r = state.remote.slice(0, 6);
  u.hidden = !r.length || !state.q.trim();
  u.innerHTML = r.map(([id, n]) => `<li data-id="${id}" data-name="${esc(n)}"><img src="${CDN}${id}/header.jpg" alt="" onerror="this.style.visibility='hidden'"><span>${esc(n)}</span></li>`).join('');
}
let dt;
$('#q').addEventListener('input', e => {
  state.q = e.target.value; snap = null; if (location.hash) location.hash = ''; if (state.view !== 'steam') render(); clearTimeout(dt);
  dt = setTimeout(() => { if (state.view === 'steam') loadSteam(true); remote(state.q.trim()); }, 300);
});
$('#sug').addEventListener('click', e => { const li = e.target.closest('li'); if (li) { $('#sug').hidden = true; names[li.dataset.id] = li.dataset.name; location.hash = 'game=' + li.dataset.id; } });
document.addEventListener('click', e => { if (!e.target.closest('.search')) $('#sug').hidden = true; });
$('#q').addEventListener('focus', sug);

nav(); route(); addEventListener('hashchange', route);

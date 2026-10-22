'use strict';
// Внешние источники данных: RAWG (основная база игр), Steam, SteamGridDB
const UA = 'Mozilla/5.0 GameTracker';
const T = ms => AbortSignal.timeout(ms);
async function getJson(url, headers = {}, ms = 12000) {
  const r = await fetch(url, {headers: {'user-agent': UA, ...headers}, signal: T(ms)});
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
async function exists(url) {
  try {
    let r = await fetch(url, {method: 'HEAD', headers: {'user-agent': UA}, signal: T(8000)});
    if (r.status === 405 || r.status === 403) r = await fetch(url, {headers: {'user-agent': UA, range: 'bytes=0-0'}, signal: T(8000)});
    return r.ok && /image/.test(r.headers.get('content-type') || 'image');
  } catch { return false; }
}
const CDN = 'https://cdn.akamai.steamstatic.com/steam/apps/';

// --- Steam ---
async function steamSearch(q) {
  const j = await getJson(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&l=russian&cc=US`);
  return (j.items || []).map(i => ({id: String(i.id), name: i.name, img: i.tiny_image, src: 'steam'}));
}
// Вертикальная обложка Steam. Новые игры хранят её по хэш-пути, поэтому сначала спрашиваем у Steam точный адрес.
async function steamPortrait(appid) {
  const urls = [];
  try {
    const input = encodeURIComponent(JSON.stringify({ids: [{appid: +appid}], context: {language: 'english', country_code: 'US'}, data_request: {include_assets: true}}));
    const j = await getJson('https://api.steampowered.com/IStoreBrowseService/GetItems/v1?input_json=' + input);
    const a = j?.response?.store_items?.[0]?.assets;
    if (a?.asset_url_format) {
      const base = 'https://shared.akamai.steamstatic.com/store_item_assets/' + a.asset_url_format;
      for (const f of [a.library_capsule_2x, a.library_capsule]) if (f) urls.push(base.replace('${FILENAME}', f));
    }
  } catch {}
  urls.push(CDN + appid + '/library_600x900_2x.jpg', CDN + appid + '/library_600x900.jpg');
  for (const u of urls) if (await exists(u)) return u;
  return null;
}
async function steamOwned(key, steamid) {
  const j = await getJson(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${encodeURIComponent(key)}&steamid=${encodeURIComponent(steamid)}&include_appinfo=1&include_played_free_games=1&format=json`, {}, 30000);
  if (!j.response || !Array.isArray(j.response.games)) throw new Error('Профиль скрыт или ключ/SteamID неверны (в Steam: Профиль → Настройки приватности → «Сведения об играх» = Открытые)');
  return j.response.games.map(g => ({appid: String(g.appid), name: g.name, minutes: g.playtime_forever || 0, last: g.rtime_last_played || 0}));
}

// --- SteamGridDB (вертикальные обложки 600x900) ---
async function sgdb(key, {steamId, name}) {
  const H = {authorization: 'Bearer ' + key};
  const pick = j => (j.data || []).find(x => x.url && !x.nsfw && !x.humor) || (j.data || [])[0];
  let r;
  if (steamId) {
    try { r = pick(await getJson(`https://www.steamgriddb.com/api/v2/grids/steam/${steamId}?dimensions=600x900&types=static`, H)); } catch {}
    if (r) return r.url;
  }
  if (!name) return null;
  const s = await getJson('https://www.steamgriddb.com/api/v2/search/autocomplete/' + encodeURIComponent(name), H);
  const g = s.data?.[0]; if (!g) return null;
  r = pick(await getJson(`https://www.steamgriddb.com/api/v2/grids/game/${g.id}?dimensions=600x900&types=static`, H));
  return r?.url || null;
}

// --- RAWG: основная база игр (поиск, фильтры по платформам и жанрам, описания, время прохождения) ---
const RAWG = 'https://api.rawg.io/api';
const rawgItem = i => ({
  id: 'r' + i.id, name: i.name, img: i.background_image, src: 'rawg', released: i.released || '', rating: i.rating || 0, metacritic: i.metacritic || null,
  playtime: i.playtime || 0, // среднее время прохождения по данным RAWG, часы
  platforms: (i.platforms || []).map(x => x.platform.name), parents: (i.parent_platforms || []).map(x => x.platform.name), genres: (i.genres || []).map(x => x.name)
});
// список игр с фильтрами: search, parent_platforms, genres, dates, ordering, page
async function rawgList(key, o = {}) {
  const p = new URLSearchParams({key, page_size: String(o.size || 40), page: String(o.page || 1), exclude_additions: 'true'});
  for (const k of ['search', 'parent_platforms', 'genres', 'dates', 'ordering']) if (o[k]) p.set(k, String(o[k]));
  const j = await getJson(`${RAWG}/games?${p}`);
  return {count: j.count || 0, next: !!j.next, results: (j.results || []).map(rawgItem)};
}
async function rawgSearch(key, q) {
  const j = await getJson(`${RAWG}/games?key=${encodeURIComponent(key)}&search=${encodeURIComponent(q)}&page_size=8&search_precise=true`);
  return (j.results || []).map(rawgItem);
}
async function rawgById(key, id) { return rawgItem(await getJson(`${RAWG}/games/${id}?key=${encodeURIComponent(key)}`)); }
async function rawgGame(key, id) {
  const [g, s] = await Promise.all([
    getJson(`${RAWG}/games/${id}?key=${encodeURIComponent(key)}`),
    getJson(`${RAWG}/games/${id}/screenshots?key=${encodeURIComponent(key)}`).catch(() => ({results: []}))
  ]);
  return {
    ...rawgItem(g), desc: (g.description_raw || '').slice(0, 1500), developers: (g.developers || []).map(x => x.name), publishers: (g.publishers || []).map(x => x.name),
    image: g.background_image, website: g.website, esrb: g.esrb_rating?.name || '', ratingsCount: g.ratings_count || 0, achievements: g.achievements_count || 0,
    screenshots: (s.results || []).slice(0, 12).map(x => ({path_full: x.image, path_thumbnail: x.image}))
  };
}
async function rawgCover(key, name) { const r = await rawgSearch(key, name); return r[0]?.img || null; }

module.exports = {steamSearch, steamPortrait, steamOwned, sgdb, rawgList, rawgSearch, rawgById, rawgGame, rawgCover, exists, CDN};

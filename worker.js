const MAX_ATTEMPTS = 3;
const FETCH_TIMEOUT_MS = 4500;
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_USER_AGENT = 'RealAddressGeneratorSafe/1.0 (+https://example.com/contact)';
const DEFAULT_REFERER = 'https://example.com/real-address-generator-safe';

const COMMON_FIRST_NAMES = ['Alex', 'Casey', 'Jordan', 'Morgan', 'Riley', 'Taylor'];
const COMMON_LAST_NAMES = ['Avery', 'Bennett', 'Ellis', 'Hayes', 'Morgan', 'Parker'];

function country(label, centers, dialingCode, localDigits = 9, names = null) {
  return { label, centers, dialingCode, localDigits, names };
}

// This is the single country allowlist and the source for UI options, sampling,
// address validation, local fictional names, and test-only phone formatting.
export const COUNTRIES = Object.freeze({
  US: country('United States 美国', [[40.7306, -73.9866, .018], [34.0522, -118.2437, .018]], '+1', 10),
  UK: country('United Kingdom 英国', [[51.5074, -.1278, .014], [53.4808, -2.2426, .014]], '+44', 10),
  FR: country('France 法国', [[48.8566, 2.3522, .014], [45.764, 4.8357, .014]], '+33', 9),
  DE: country('Germany 德国', [[52.52, 13.405, .014], [48.1351, 11.582, .014]], '+49', 10),
  CN: country('China 中国', [[39.9042, 116.4074, .012], [31.2304, 121.4737, .012]], '+86', 11),
  TW: country('Taiwan 中国台湾', [[25.033, 121.5654, .012], [22.6273, 120.3014, .012]], '+886', 9),
  HK: country('Hong Kong 中国香港', [[22.3193, 114.1694, .009], [22.2855, 114.1577, .007]], '+852', 8),
  JP: country('Japan 日本', [[35.6895, 139.6917, .012], [34.6937, 135.5023, .012]], '+81', 10),
  IN: country('India 印度', [[28.6139, 77.209, .014], [19.076, 72.8777, .014]], '+91', 10),
  AU: country('Australia 澳大利亚', [[-33.8688, 151.2093, .014], [-37.8136, 144.9631, .014]], '+61', 9),
  BR: country('Brazil 巴西', [[-23.5505, -46.6333, .014], [-22.9068, -43.1729, .014]], '+55', 11),
  CA: country('Canada 加拿大', [[43.6532, -79.3832, .014], [45.5017, -73.5673, .014]], '+1', 10),
  RU: country('Russia 俄罗斯', [[55.7558, 37.6173, .014], [59.9343, 30.3351, .014]], '+7', 10),
  ZA: country('South Africa 南非', [[-33.9249, 18.4241, .014], [-26.2041, 28.0473, .014]], '+27', 9),
  MX: country('Mexico 墨西哥', [[19.4326, -99.1332, .014], [20.6597, -103.3496, .014]], '+52', 10),
  KR: country('South Korea 韩国', [[37.5665, 126.978, .012], [35.1796, 129.0756, .012]], '+82', 10),
  IT: country('Italy 意大利', [[41.9028, 12.4964, .014], [45.4642, 9.19, .014]], '+39', 10),
  ES: country('Spain 西班牙', [[40.4168, -3.7038, .014], [41.3851, 2.1734, .014]], '+34', 9),
  TR: country('Türkiye 土耳其', [[41.0082, 28.9784, .014], [39.9334, 32.8597, .014]], '+90', 10),
  SA: country('Saudi Arabia 沙特阿拉伯', [[24.7136, 46.6753, .014], [21.3891, 39.8579, .014]], '+966', 9),
  AR: country('Argentina 阿根廷', [[-34.6037, -58.3816, .014], [-31.4201, -64.1888, .014]], '+54', 10),
  EG: country('Egypt 埃及', [[30.0444, 31.2357, .014], [31.2156, 29.9553, .014]], '+20', 10),
  NG: country('Nigeria 尼利亚', [[6.5244, 3.3792, .014], [9.0579, 7.4951, .014]], '+234', 10),
  ID: country('Indonesia 印度尼西亚', [[-6.2088, 106.8456, .014], [-7.7956, 110.3695, .014]], '+62', 10),
  NL: country('Netherlands 荷兰', [
    [52.3676, 4.9041, .010], // Amsterdam
    [51.9244, 4.4777, .010], // Rotterdam
    [52.0907, 5.1214, .009], // Utrecht
    [51.4416, 5.4697, .009], // Eindhoven
    [52.0705, 4.3007, .009]  // The Hague
  ], '+31', 9, [
    ['Noah', 'De Vries'], ['Emma', 'Van Dijk'], ['Daan', 'Bakker'],
    ['Sophie', 'Visser'], ['Milan', 'Smit'], ['Lotte', 'Meijer']
  ]),
  SG: country('Singapore 新加坡', [
    [1.3009, 103.8395, .006], // River Valley / Orchard
    [1.3329, 103.7436, .006], // Jurong East
    [1.3528, 103.9446, .006], // Tampines
    [1.4360, 103.7865, .006], // Woodlands
    [1.3691, 103.8485, .006], // Ang Mo Kio
    [1.3496, 103.8737, .006]  // Serangoon
  ], '+65', 8, [
    ['Mei Lin', 'Tan'], ['Wei Jun', 'Lim'], ['Aisyah', 'Rahman'],
    ['Farid', 'Hassan'], ['Ananya', 'Nair'], ['Arjun', 'Pillai']
  ])
});

const COUNTRY_CODES = Object.freeze(Object.keys(COUNTRIES));

const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
});

const HTML = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>安全地址样本生成器</title><link rel="stylesheet" href="/style.css"></head>
<body><main>
<header><h1>地址样本生成器</h1><p class="lead">安全重构版 · Safe derivative</p></header>
<section class="warning" aria-label="重要说明"><strong>仅限测试：</strong>地址来自 OpenStreetMap，可能对应真实住户；姓名和电话为本地生成的虚构测试数据，电话勿拨打。不得用于欺诈、KYC、骚扰或冒充真实身份。</section>
<section class="card controls"><label for="country">国家 / Country</label><select id="country"></select><button id="generate" type="button">生成 / Generate</button><span id="status" role="status" aria-live="polite"></span></section>
<section class="card" id="result" hidden>
<dl><div><dt>虚构姓名</dt><dd><button class="copy-value" data-field="name"></button></dd></div><div><dt>测试电话（勿拨）</dt><dd><button class="copy-value" data-field="phone"></button></dd></div><div><dt>OSM 地址</dt><dd><button class="copy-value" data-field="address"></button></dd></div></dl>
<div class="actions"><button id="map" type="button">在 OpenStreetMap 打开（将连接第三方）</button><button id="save" type="button">保存并添加备注</button></div></section>
<section class="card"><h2>本机保存项</h2><p>保存项和备注仅存于此站点的浏览器 localStorage，不会由本应用上传；同源脚本可读取，且不会自动过期。</p><button id="clear" class="danger" type="button">清空全部本地数据</button><ul id="saved"></ul></section>
<section class="card small"><h2>数据与第三方</h2><p>服务器为生成地址向 Nominatim 发送随机坐标；地图仅在点击按钮后以新窗口打开。核心页面不加载第三方图片、脚本或 iframe。</p><p>地址数据 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>，ODbL；地理编码由 <a href="https://nominatim.org/" target="_blank" rel="noopener noreferrer">Nominatim</a> 提供。</p></section>
</main><footer>Original version from chatgpt.org.uk, modified by Adonis142857. This safety refactor is a derivative work.</footer><script src="/app.js" defer></script></body></html>`;

const CSS = `:root{font:16px/1.5 system-ui,sans-serif;color:#17202a;background:#f3f6f9}*{box-sizing:border-box}body{margin:0}main{max-width:850px;margin:auto;padding:24px}header{text-align:center}.lead{color:#52606d}.card,.warning{background:#fff;border:1px solid #d9e2ec;border-radius:12px;padding:18px;margin:16px 0;box-shadow:0 3px 12px #0001}.warning{border-left:5px solid #d97706;background:#fffbeb}.controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap}select,button{font:inherit;padding:9px 12px;border:1px solid #9fb3c8;border-radius:7px;background:#fff}button{cursor:pointer}#generate{background:#1769aa;color:#fff;border-color:#1769aa}.danger{color:#a61b1b}dl div{margin:12px 0}dt{font-weight:700}.copy-value{width:100%;text-align:left;overflow-wrap:anywhere;background:#f8fafc}.actions{display:flex;gap:10px;flex-wrap:wrap}.small{font-size:.92rem}a{color:#075985}#saved{padding-left:22px}#saved li{margin:9px 0;overflow-wrap:anywhere}footer{text-align:center;padding:24px;color:#52606d}@media(max-width:600px){main{padding:12px}.controls>*{width:100%}}`;

const APP_JS = `(() => {
'use strict';
const $ = id => document.getElementById(id);
const storageKey = 'safe-address-samples-v1';
let current = null;
function loadSaved(){try{const v=JSON.parse(localStorage.getItem(storageKey)||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
function renderSaved(){const list=$('saved');list.replaceChildren();loadSaved().forEach((entry,index)=>{const li=document.createElement('li');const text=document.createElement('span');text.textContent=(entry.note?'['+entry.note+'] ':'')+entry.name+' · '+entry.phone+' · '+entry.address+' ';const del=document.createElement('button');del.type='button';del.textContent='删除';del.addEventListener('click',()=>{const items=loadSaved();items.splice(index,1);localStorage.setItem(storageKey,JSON.stringify(items));renderSaved()});li.append(text,del);list.append(li)})}
async function init(){try{const r=await fetch('/api/countries');if(!r.ok)throw new Error('countries');const data=await r.json();const selected=new URL(location.href).searchParams.get('country');data.countries.forEach(item=>{const o=document.createElement('option');o.value=item.code;o.textContent=item.label;o.selected=item.code===selected;$('country').append(o)});await generate()}catch{$('status').textContent='初始化失败，请稍后重试'}renderSaved()}
async function generate(){const country=$('country').value;$('status').textContent='生成中…';$('generate').disabled=true;try{const r=await fetch('/api/generate?country='+encodeURIComponent(country));const data=await r.json();if(!r.ok)throw new Error(data.error?.message||'生成失败');current=data.data;document.querySelectorAll('[data-field]').forEach(el=>{el.textContent=current[el.dataset.field]});$('result').hidden=false;$('status').textContent='已生成'}catch(e){current=null;$('result').hidden=true;$('status').textContent=e.message}finally{$('generate').disabled=false}}
document.addEventListener('click',e=>{const field=e.target.dataset?.field;if(field&&current){navigator.clipboard.writeText(current[field]).then(()=>{$('status').textContent='已复制'}).catch(()=>{$('status').textContent='复制失败'})}});
$('generate').addEventListener('click',generate);$('country').addEventListener('change',()=>{history.replaceState(null,'','?country='+encodeURIComponent($('country').value));generate()});
$('map').addEventListener('click',()=>{if(current){const u=new URL('https://www.openstreetmap.org/');u.searchParams.set('mlat',String(current.latitude));u.searchParams.set('mlon',String(current.longitude));u.hash='map=18/'+current.latitude+'/'+current.longitude;window.open(u.toString(),'_blank','noopener,noreferrer')}});
$('save').addEventListener('click',()=>{if(!current)return;const note=prompt('备注（可留空）')||'';const items=loadSaved();items.push({note:note.slice(0,200),name:current.name,phone:current.phone,address:current.address});localStorage.setItem(storageKey,JSON.stringify(items.slice(-50)));renderSaved()});
$('clear').addEventListener('click',()=>{if(confirm('确定清空全部本地保存项？')){localStorage.removeItem(storageKey);renderSaved()}});init();
})();`;

function withSecurityHeaders(headers = {}) {
  return { ...SECURITY_HEADERS, ...headers };
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: withSecurityHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders
    })
  });
}

function errorResponse(status, code, message) {
  return jsonResponse({ error: { code, message } }, status);
}

function staticResponse(body, type) {
  return new Response(body, {
    headers: withSecurityHeaders({
      'Content-Type': type,
      'Cache-Control': 'public, max-age=300'
    })
  });
}

function randomInt(max, random = Math.random) {
  return Math.floor(random() * max);
}

export function sampleLocation(code, random = Math.random) {
  const cfg = COUNTRIES[code];
  const center = cfg.centers[randomInt(cfg.centers.length, random)];
  const [baseLat, baseLon, radius] = center;
  return {
    lat: baseLat + (random() * 2 - 1) * radius,
    lon: baseLon + (random() * 2 - 1) * radius
  };
}

function snapCoordinate(value) {
  return Math.round(value * 2000) / 2000; // ~55 m latitude grid
}

function makeReverseUrl(baseUrl, lat, lon) {
  const url = new URL(baseUrl);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');
  return url;
}

function normalizeCountryCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function validAddress(data, code) {
  const a = data?.address;
  if (!a || normalizeCountryCode(a.country_code) !== code) return false;
  if (!a.house_number || !a.road) return false;
  if (code === 'SG') return /^\d{6}$/.test(String(a.postcode || ''));
  if (code === 'NL') {
    return /^\d{4}\s?[A-Z]{2}$/i.test(String(a.postcode || '')) &&
      Boolean(a.city || a.town || a.village || a.municipality || a.city_district || a.suburb);
  }
  return Boolean(a.city || a.town || a.village || a.municipality || a.city_district || a.suburb);
}

export function formatAddress(address, code) {
  const clean = value => String(value || '').trim();
  const houseRoad = `${clean(address.house_number)} ${clean(address.road)}`.trim();
  if (code === 'SG') return `${houseRoad}, Singapore ${clean(address.postcode)}, Singapore`;
  const locality = clean(address.city || address.town || address.village || address.municipality || address.city_district || address.suburb);
  if (code === 'NL') {
    const postcode = clean(address.postcode).toUpperCase().replace(/^(\d{4})\s?([A-Z]{2})$/, '$1 $2');
    return `${houseRoad}, ${postcode} ${locality}, Netherlands`;
  }
  return [houseRoad, locality, clean(address.postcode), clean(address.country)].filter(Boolean).join(', ');
}

function fictionalPerson(code, random = Math.random) {
  const names = COUNTRIES[code].names;
  if (names) {
    const [first, last] = names[randomInt(names.length, random)];
    return `${first} ${last}`;
  }
  return `${COMMON_FIRST_NAMES[randomInt(COMMON_FIRST_NAMES.length, random)]} ${COMMON_LAST_NAMES[randomInt(COMMON_LAST_NAMES.length, random)]}`;
}

function testPhone(code, random = Math.random) {
  const cfg = COUNTRIES[code];
  let digits = '';
  for (let i = 0; i < cfg.localDigits; i++) digits += randomInt(10, random);
  if (code === 'SG') digits = (random() < .5 ? '8' : '9') + digits.slice(1);
  if (code === 'NL') {
    digits = '6' + digits.slice(1);
    return `${cfg.dialingCode} ${digits.slice(0, 1)} ${digits.slice(1, 5)} ${digits.slice(5)}`;
  }
  return `${cfg.dialingCode} ${digits.replace(/(.{4})/g, '$1 ').trim()}`;
}

function cacheFor(deps) {
  return deps.cache || globalThis.caches?.default || null;
}

async function fetchJsonWithTimeout(url, options, deps) {
  const controller = new AbortController();
  const timeout = (deps.setTimeout || setTimeout)(() => controller.abort(), deps.timeoutMs ?? FETCH_TIMEOUT_MS);
  try {
    const response = await deps.fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`upstream_http_${response.status}`);
    try { return await response.json(); }
    catch { throw new Error('upstream_invalid_json'); }
  } finally {
    (deps.clearTimeout || clearTimeout)(timeout);
  }
}

export async function reverseGeocode(code, location, env, deps) {
  const lat = snapCoordinate(location.lat);
  const lon = snapCoordinate(location.lon);
  const baseUrl = env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org/reverse';
  const upstreamUrl = makeReverseUrl(baseUrl, lat, lon);
  const cacheKeyUrl = new URL('https://cache.invalid/reverse');
  cacheKeyUrl.searchParams.set('country', code);
  cacheKeyUrl.searchParams.set('lat', lat.toFixed(4));
  cacheKeyUrl.searchParams.set('lon', lon.toFixed(4));
  const cacheKey = new Request(cacheKeyUrl.toString());
  const cache = cacheFor(deps);
  const hit = cache ? await cache.match(cacheKey) : null;
  if (hit) return { data: await hit.json(), lat, lon, cached: true };

  const headers = {
    'Accept': 'application/json',
    'User-Agent': env.NOMINATIM_USER_AGENT || DEFAULT_USER_AGENT
  };
  const referer = env.NOMINATIM_REFERER === undefined ? DEFAULT_REFERER : env.NOMINATIM_REFERER;
  if (referer) headers.Referer = referer;
  const data = await fetchJsonWithTimeout(upstreamUrl, { headers }, deps);
  // Cache only a semantically usable result. HTTP/JSON failures and misses are
  // deliberately excluded. Cache writes are best-effort and never break output.
  if (cache && validAddress(data, code)) {
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}` }
    });
    try { await cache.put(cacheKey, response); } catch { /* cache unavailable */ }
  }
  return { data, lat, lon, cached: false };
}

export async function generateAddress(code, env = {}, deps = {}) {
  const normalized = normalizeCountryCode(code);
  if (!COUNTRIES[normalized]) return { error: errorResponse(400, 'invalid_country', 'country must be one of the advertised country codes') };
  const runtime = { fetch: deps.fetch || globalThis.fetch, random: deps.random || Math.random, ...deps };
  let lastFailure = 'no_matching_address';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await reverseGeocode(normalized, sampleLocation(normalized, runtime.random), env, runtime);
      if (!validAddress(result.data, normalized)) { lastFailure = 'no_matching_address'; continue; }
      return {
        data: {
          country: normalized,
          name: fictionalPerson(normalized, runtime.random),
          phone: testPhone(normalized, runtime.random),
          address: formatAddress(result.data.address, normalized),
          latitude: result.lat,
          longitude: result.lon,
          attempts: attempt,
          addressSource: 'OpenStreetMap contributors / Nominatim',
          identityNotice: 'Fictional test name and phone; do not call or use for identity verification.'
        }
      };
    } catch (error) {
      lastFailure = error?.name === 'AbortError' ? 'upstream_timeout' : 'upstream_failure';
    }
  }
  return { error: errorResponse(502, lastFailure, 'Address provider did not return a suitable address within the bounded attempt limit') };
}

export async function handleRequest(request, env = {}, deps = {}) {
  const method = request.method.toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    const response = errorResponse(405, 'method_not_allowed', 'Only GET and HEAD are allowed');
    response.headers.set('Allow', 'GET, HEAD');
    return response;
  }
  const url = new URL(request.url);
  let response;
  if (url.pathname === '/') response = staticResponse(HTML, 'text/html; charset=utf-8');
  else if (url.pathname === '/app.js') response = staticResponse(APP_JS, 'text/javascript; charset=utf-8');
  else if (url.pathname === '/style.css') response = staticResponse(CSS, 'text/css; charset=utf-8');
  else if (url.pathname === '/api/countries') response = jsonResponse({ countries: COUNTRY_CODES.map(code => ({ code, label: COUNTRIES[code].label })) });
  else if (url.pathname === '/api/generate') {
    const generated = await generateAddress(url.searchParams.get('country'), env, deps);
    response = generated.error || jsonResponse({ data: generated.data });
  } else response = errorResponse(404, 'not_found', 'Resource not found');
  if (method === 'HEAD') return new Response(null, { status: response.status, headers: response.headers });
  return response;
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  }
};

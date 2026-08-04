// Fetches personalized astrology content for both partners from
// astrology-api.io and writes it to public/api-extras.json, which the site
// reads defensively (missing/failed pieces are simply hidden — see
// src/main.js loadApiExtras).
//
// Runs in GitHub Actions (.github/workflows/weekly-extras.yml) with the token
// provided via the ASTROLOGY_API_KEY repository secret. Never commit the key.
// The workflow itself commits public/api-extras.json after each scheduled
// run; don't commit a locally generated (or --mock) copy by hand.
//
// Local development: `node scripts/fetchApiExtras.mjs --mock` skips the
// network entirely and writes a realistic mock public/api-extras.json (same
// v2 schema, plausible PT/EN copy) so the site can be built/previewed without
// API access or a key. Delete the file again before committing.

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';

const MOCK = process.argv.includes('--mock');
// Every raw response is written to RAW_DIR. Extraction is written against a
// published spec rather than observed payloads, so if a shape differs the fix
// must never cost a second API call: re-run with --from-raw to re-extract
// everything offline from the saved bodies.
const RAW_DIR = process.env.RAW_DIR || '.api-raw';
const SAVE_RAW = !process.argv.includes('--no-raw');
const FROM_RAW = process.argv.includes('--from-raw');

const API_BASE = process.env.ASTROLOGY_API_URL || 'https://api.astrology-api.io';
const KEY = process.env.ASTROLOGY_API_KEY;
if (!MOCK && !FROM_RAW && !KEY) {
  console.error('ASTROLOGY_API_KEY is not set');
  process.exit(1);
}

const SUBJECTS = {
  dailton: {
    name: 'Dailton',
    birth_data: {
      year: 1994, month: 4, day: 29, hour: 7, minute: 20,
      latitude: -15.8433, longitude: -50.8867, timezone: 'America/Sao_Paulo',
    },
  },
  felipe: {
    name: 'Felipe',
    birth_data: {
      year: 1995, month: 9, day: 13, hour: 10, minute: 54,
      latitude: -16.6869, longitude: -49.2648, timezone: 'America/Sao_Paulo',
    },
  },
};

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rawPathFor(path, body) {
  const tag = JSON.stringify({ path, body });
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (Math.imul(31, h) + tag.charCodeAt(i)) | 0;
  const slug = path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  return `${RAW_DIR}/${slug}.${(h >>> 0).toString(36)}.json`;
}

async function post(path, body) {
  const rawFile = rawPathFor(path, body);
  if (FROM_RAW) {
    if (!existsSync(rawFile)) throw new Error(`no saved response for ${path}`);
    return JSON.parse(readFileSync(rawFile, 'utf8'));
  }
  const res = await fetch(`${API_BASE}/api/v3${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    // A spent quota fails every remaining call the same way, so treat it as
    // terminal rather than grinding through the rest of the plan.
    if (res.status === 429 && /RATE_LIMIT_EXCEEDED|Quota exceeded/i.test(body)) {
      const err = new Error(`${path} -> quota exhausted`);
      err.quotaExhausted = true;
      throw err;
    }
    throw new Error(`${path} -> HTTP ${res.status}: ${body}`);
  }
  const json = await res.json();
  if (SAVE_RAW) {
    try {
      mkdirSync(RAW_DIR, { recursive: true });
      writeFileSync(rawFile, JSON.stringify(json, null, 2));
    } catch (e) { console.error('  (could not save raw response:', e.message + ')'); }
  }
  return json;
}

function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Truncate long copy at ~2400 chars on a word boundary so the combined file
// stays well under the ~300KB budget even with every section populated.
function truncate(str, max = 2400) {
  if (typeof str !== 'string' || str.length <= max) return str;
  const cut = str.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  const clipped = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return clipped.trim() + '…';
}

function normalizeKey(k) {
  return String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// The exact response shape isn't pinned down by the docs for several of
// these endpoints, so rather than assume field names we walk the payload
// breadth-first looking for the first key that matches any of the given
// aliases (case/underscore/camelCase-insensitive). Shallower matches win.
function deepFind(payload, keyNames) {
  const wanted = new Set(keyNames.map(normalizeKey));
  const queue = [payload];
  const seen = new Set();
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== 'object' || seen.has(node)) continue;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) if (item && typeof item === 'object') queue.push(item);
      continue;
    }
    for (const [k, v] of Object.entries(node)) {
      if (wanted.has(normalizeKey(k))) return v;
    }
    for (const v of Object.values(node)) {
      if (v && typeof v === 'object') queue.push(v);
    }
  }
  return undefined;
}

// Generalized version of the original weekly-only text digger: find the
// first substantial string field, preferring well-known keys.
function extractText(payload) {
  if (typeof payload === 'string') return truncate(payload.trim());
  const preferred = ['text', 'horoscope', 'content', 'reading', 'summary', 'interpretation', 'analysis', 'description'];
  const queue = [payload];
  const texts = [];
  const seen = new Set();
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== 'object' || seen.has(node)) continue;
    seen.add(node);
    for (const k of preferred) {
      if (typeof node[k] === 'string' && node[k].trim().length > 80) return truncate(node[k].trim());
    }
    for (const v of Object.values(node)) {
      if (typeof v === 'string' && v.trim().length > 120) texts.push(v.trim());
      else if (v && typeof v === 'object') queue.push(v);
    }
  }
  const best = texts.sort((a, b) => b.length - a.length)[0];
  return best ? truncate(best) : null;
}

function extractScore(payload) {
  const value = toNum(deepFind(payload, ['value', 'score', 'compatibility_score', 'compatibilityScore']));
  const normalized = toNum(deepFind(payload, ['normalized', 'normalized_score', 'normalizedScore', 'percentage', 'ratio']));
  const descriptionRaw = deepFind(payload, ['description', 'summary', 'interpretation', 'text']);
  const overallRaw = deepFind(payload, ['overall_type', 'overallType', 'overall', 'category', 'level', 'rating', 'tier']);
  const description = typeof descriptionRaw === 'string' ? truncate(descriptionRaw.trim()) : null;
  const overall = typeof overallRaw === 'string' ? overallRaw : null;
  if (value === null && normalized === null && !description && !overall) return null;
  const out = {};
  if (value !== null) out.value = value;
  if (normalized !== null) out.normalized = normalized;
  if (description) out.description = description;
  if (overall) out.overall = overall;
  return out;
}

function toNameList(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const name = item.name || item.aspect || item.title || item.label || item.description;
        return typeof name === 'string' ? name : null;
      }
      return null;
    })
    .filter(Boolean)
    .map((s) => truncate(s, 160))
    .slice(0, 6);
}

function extractSynastry(payload) {
  const harmonyPct = toNum(deepFind(payload, [
    'harmony_percentage', 'harmonyPercentage', 'harmony_pct', 'harmonyPct', 'harmony_score', 'harmonyScore', 'harmony',
  ]));
  const tensionPct = toNum(deepFind(payload, [
    'tension_percentage', 'tensionPercentage', 'tension_pct', 'tensionPct', 'tension_score', 'tensionScore', 'tension', 'friction',
  ]));
  const dynamicTypeRaw = deepFind(payload, ['dynamic_type', 'dynamicType', 'relationship_dynamic', 'relationshipType', 'dynamic', 'pattern']);
  const dynamicType = typeof dynamicTypeRaw === 'string' ? dynamicTypeRaw : null;
  const topStrengths = toNameList(deepFind(payload, ['top_strengths', 'topStrengths', 'strengths', 'positive_aspects', 'positiveAspects']));
  const topChallenges = toNameList(deepFind(payload, ['top_challenges', 'topChallenges', 'challenges', 'negative_aspects', 'negativeAspects', 'tensions']));
  if (harmonyPct === null && tensionPct === null && !dynamicType && !topStrengths.length && !topChallenges.length) return null;
  const out = {};
  if (harmonyPct !== null) out.harmonyPct = harmonyPct;
  if (tensionPct !== null) out.tensionPct = tensionPct;
  if (dynamicType) out.dynamicType = dynamicType;
  if (topStrengths.length) out.topStrengths = topStrengths;
  if (topChallenges.length) out.topChallenges = topChallenges;
  return out;
}

function pickPeriodNode(value) {
  if (Array.isArray(value)) {
    const current = value.find((v) => v && typeof v === 'object' && (v.is_current || v.isCurrent || v.current || v.active));
    return current || value[0] || null;
  }
  return value || null;
}

// Zodiacal releasing "current period" isn't in the endpoint reference under
// this exact name; the call below follows the API's own naming conventions
// (mirrors /traditional/analysis/annual-profection's request shape) as a
// best-effort guess. If the real path or schema differs, the request simply
// fails and this section is omitted (per the resilience contract) — it does
// not affect any other part of the pipeline.
function extractChapters(payload) {
  const levelDefs = [
    { level: 'L1', keys: ['l1', 'level_1', 'level1', 'major_period', 'majorPeriod', 'first_level', 'firstLevel'] },
    { level: 'L2', keys: ['l2', 'level_2', 'level2', 'minor_period', 'minorPeriod', 'second_level', 'secondLevel', 'sub_period', 'subPeriod'] },
  ];
  const chapters = [];
  for (const { level, keys } of levelDefs) {
    const node = pickPeriodNode(deepFind(payload, keys));
    if (!node || typeof node !== 'object') continue;
    const sign = deepFind(node, ['sign', 'zodiac_sign', 'zodiacSign']);
    const ruler = deepFind(node, ['ruler', 'ruling_planet', 'rulingPlanet', 'lord']);
    const start = deepFind(node, ['start', 'start_date', 'startDate', 'begin', 'from']);
    const end = deepFind(node, ['end', 'end_date', 'endDate', 'to', 'until']);
    const entry = { level };
    if (typeof sign === 'string') entry.sign = sign;
    if (typeof ruler === 'string') entry.ruler = ruler;
    if (start !== undefined && start !== null) entry.start = String(start);
    if (end !== undefined && end !== null) entry.end = String(end);
    if (entry.sign || entry.ruler || entry.start || entry.end) chapters.push(entry);
  }
  return chapters;
}

// Shapes below were confirmed by scripts/probeApi.mjs against the live API
// (v3.2.0) rather than inferred from the docs.

// Kept for the case where a saved Davison payload is replayed.
function extractDavison(payload) {
  const out = {};
  const dateRaw = deepFind(payload, ['datetime', 'date_time', 'date', 'davison_date', 'birth_date', 'utc_datetime']);
  if (typeof dateRaw === 'string' && dateRaw.length >= 8) out.date = dateRaw;
  const lat = toNum(deepFind(payload, ['latitude', 'lat', 'davison_latitude']));
  const lon = toNum(deepFind(payload, ['longitude', 'lon', 'lng', 'davison_longitude']));
  if (lat !== null) out.lat = lat;
  if (lon !== null) out.lon = lon;
  const sun = deepFind(payload, ['sun']);
  const moon = deepFind(payload, ['moon']);
  const signOfBody = (b) => {
    if (typeof b === 'string') return b;
    if (b && typeof b === 'object') {
      const sg = b.sign || b.sign_name || b.zodiac_sign;
      if (typeof sg === 'string') return sg;
    }
    return null;
  };
  if (signOfBody(sun)) out.sunSign = signOfBody(sun);
  if (signOfBody(moon)) out.moonSign = signOfBody(moon);
  const text = extractText(payload);
  if (text) out.text = text;
  return Object.keys(out).length ? out : null;
}

// /traditional/analysis returns 28 Arabic Parts under data.traditional_points
// as { Part_of_Eros: {...}, ... }. Only the ones that mean something on a love
// site are kept.
const WANTED_LOTS = ['fortune', 'spirit', 'eros', 'love', 'marriage', 'necessity', 'courage', 'victory'];
const SIGN_ABBR = {
  ari: 'aries', tau: 'taurus', gem: 'gemini', can: 'cancer', leo: 'leo', vir: 'virgo',
  lib: 'libra', sco: 'scorpio', sag: 'sagittarius', cap: 'capricorn', aqu: 'aquarius', pis: 'pisces',
};
function fullSign(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  const k = raw.trim().toLowerCase();
  return SIGN_ABBR[k.slice(0, 3)] || (Object.values(SIGN_ABBR).includes(k) ? k : null);
}

function extractTraditional(payload) {
  const out = {};
  const points = deepFind(payload, ['traditional_points']);
  if (points && typeof points === 'object' && !Array.isArray(points)) {
    const lots = [];
    for (const [rawName, val] of Object.entries(points)) {
      const key = normalizeKey(rawName).replace(/^partof/, '');
      if (!WANTED_LOTS.includes(key)) continue;
      if (!val || typeof val !== 'object') continue;
      const sign = fullSign(val.sign ?? deepFind(val, ['sign', 'sign_name']));
      const abs = toNum(val.abs_pos ?? deepFind(val, ['abs_pos', 'absolute_longitude', 'longitude']));
      const pos = toNum(val.position ?? deepFind(val, ['position', 'degree']));
      const house = toNum(val.house ?? deepFind(val, ['house']));
      const entry = { key };
      if (sign) entry.sign = sign;
      if (pos !== null) entry.degree = Math.round(pos * 100) / 100;
      else if (abs !== null) entry.degree = Math.round((abs % 30) * 100) / 100;
      if (house !== null) entry.house = house;
      if (entry.sign) lots.push(entry);
    }
    // Keep them in the order that reads best, not the API's order.
    lots.sort((a, b) => WANTED_LOTS.indexOf(a.key) - WANTED_LOTS.indexOf(b.key));
    if (lots.length) out.lots = lots.slice(0, 6);
  }
  const sect = deepFind(payload, ['chart_sect', 'sect']);
  if (typeof sect === 'string') out.sect = sect.toLowerCase();
  const strongest = deepFind(payload, ['strongest_planet']);
  if (typeof strongest === 'string' && strongest) out.strongest = strongest.toLowerCase();
  const afflicted = deepFind(payload, ['most_afflicted']);
  if (typeof afflicted === 'string' && afflicted) out.afflicted = afflicted.toLowerCase();
  return Object.keys(out).length ? out : null;
}

// /traditional/analysis/profection-timeline hands back the current year ready
// to use, alongside the requested span.
function extractProfection(payload) {
  const cur = deepFind(payload, ['current_profection']);
  const src = (cur && typeof cur === 'object') ? cur : payload;
  const house = toNum(deepFind(src, ['profected_house']));
  const rulerRaw = deepFind(src, ['traditional_ruler', 'ruler']);
  if (house === null && typeof rulerRaw !== 'string') return null;
  const out = {};
  if (house !== null) out.house = house;
  if (typeof rulerRaw === 'string' && rulerRaw) out.ruler = rulerRaw.toLowerCase();
  const sign = fullSign(deepFind(src, ['profected_sign']));
  if (sign) out.sign = sign;
  const age = toNum(deepFind(src, ['current_age', 'age']));
  if (age !== null) out.age = age;
  const from = deepFind(src, ['year_starts']);
  const to = deepFind(src, ['year_ends']);
  if (typeof from === 'string') out.from = from;
  if (typeof to === 'string') out.to = to;
  const themes = deepFind(src, ['house_themes']);
  if (Array.isArray(themes) && themes.length) {
    out.themes = themes.filter((t) => typeof t === 'string').slice(0, 6);
  }
  return Object.keys(out).length ? out : null;
}

// data.life_area_compatibility: real per-area scores, which is strictly better
// than the heuristic the site was computing for its chemistry meters.
function extractLifeAreas(payload) {
  const list = deepFind(payload, ['life_area_compatibility']);
  if (!Array.isArray(list)) return null;
  const areas = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const area = item.area ?? deepFind(item, ['area', 'name']);
    const score = toNum(item.compatibility_score ?? deepFind(item, ['compatibility_score', 'score']));
    if (typeof area !== 'string' || score === null) continue;
    const entry = { area: truncate(area, 60), score: Math.round(score * 1000) / 1000 };
    const desc = item.description;
    if (typeof desc === 'string' && desc.trim()) entry.description = truncate(desc.trim(), 240);
    areas.push(entry);
    if (areas.length >= 12) break;
  }
  return areas.length ? areas : null;
}

// data.interpretations: [{ title, text }]. Capped so api-extras.json stays small.
function extractInterpretations(payload, limit = 10) {
  const list = deepFind(payload, ['interpretations']);
  if (!Array.isArray(list)) return null;
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const title = item.title;
    const text = item.text;
    if (typeof title !== 'string' || typeof text !== 'string') continue;
    if (text.trim().length < 40) continue;
    out.push({ title: truncate(title.trim(), 80), text: truncate(text.trim(), 460) });
    if (out.length >= limit) break;
  }
  return out.length ? out : null;
}

function extractNodalAxis(payload) {
  const n = deepFind(payload, ['nodal_axis']);
  if (!n || typeof n !== 'object') return null;
  const out = {};
  const north = fullSign(n.north_sign);
  const south = fullSign(n.south_sign);
  if (north) out.northSign = north;
  if (south) out.southSign = south;
  const nh = toNum(n.north_house), sh = toNum(n.south_house);
  if (nh !== null) out.northHouse = nh;
  if (sh !== null) out.southHouse = sh;
  if (typeof n.interpretation === 'string' && n.interpretation.trim()) {
    out.text = truncate(n.interpretation.trim(), 520);
  }
  return Object.keys(out).length ? out : null;
}

function extractPlaces(payload) {
  // The astrocartography payload carries both nameless power *zones* and a
  // named *cities* list. Only named entries are renderable, so gather
  // candidates from every plausible list, keep the named ones, and rank by
  // strength.
  const candidates = [];
  for (const listKey of [
    'top_cities', 'topCities', 'cities', 'top_locations', 'topLocations', 'locations',
    'power_zones', 'powerZones', 'zones', 'results',
  ]) {
    const listRaw = deepFind(payload, [listKey]);
    if (!Array.isArray(listRaw)) continue;
    for (const item of listRaw) {
      if (!item || typeof item !== 'object') continue;
      const name = deepFind(item, ['city', 'city_name', 'cityName', 'nearest_city', 'nearestCity', 'name', 'location', 'place', 'title']);
      if (typeof name !== 'string' || !name.trim()) continue;
      const label = deepFind(item, ['label', 'theme', 'category', 'planets', 'planet_pair', 'planetPair', 'line', 'lines', 'line_type', 'lineType', 'summary', 'description']);
      const strength = toNum(deepFind(item, ['strength', 'score', 'power', 'rating']));
      const entry = { name: truncate(name.trim(), 80) };
      if (typeof label === 'string' && label.trim()) entry.label = truncate(label.trim(), 200);
      else if (Array.isArray(label)) entry.label = truncate(label.filter(x => typeof x === 'string').join(' + '), 200);
      if (strength !== null) entry.strength = strength;
      candidates.push(entry);
    }
    if (candidates.length >= 5) break;
  }
  const seen = new Set();
  const places = [];
  candidates.sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));
  for (const c of candidates) {
    const key = c.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    places.push(c);
    if (places.length >= 5) break;
  }
  return places;
}

// ---------------------------------------------------------------------------
// Mock mode — no network, deterministic realistic output for local dev.
// ---------------------------------------------------------------------------

function writeMock() {
  const out = {
    generatedAt: new Date().toISOString(),
    source: 'astrology-api.io',
    version: 2,
    weekly: {
      dailton: {
        pt: 'Esta semana o Sol ilumina sua casa da comunicacao, Dailton: conversas dificeis adiadas ha tempos encontram uma abertura natural para acontecer. Marte favorece iniciativas praticas, mas evite decisoes financeiras impulsivas na quinta-feira, quando a Lua faz tensao com Urano.',
        en: 'This week the Sun lights up your house of communication, Dailton: overdue difficult conversations find a natural opening. Mars favors practical initiatives, but avoid impulsive financial decisions on Thursday, when the Moon squares Uranus.',
      },
      felipe: {
        pt: 'Felipe, Venus transita seu signo trazendo mais leveza aos relacionamentos nesta semana. E um bom momento para retomar planos adiados com Dailton. Cuidado com o excesso de trabalho na terca-feira, quando Saturno pede mais estrutura na rotina.',
        en: 'Felipe, Venus transits your sign bringing more ease to relationships this week. It is a good moment to pick back up plans postponed with Dailton. Watch for overwork on Tuesday, when Saturn asks for more structure in the routine.',
      },
    },
    monthly: {
      dailton: {
        pt: 'Julho traz um ciclo de consolidacao para Dailton: Jupiter transita a casa 10 favorecendo reconhecimento profissional, enquanto a lua nova no dia 14 pede foco em metas de longo prazo com Felipe. A segunda metade do mes favorece viagens curtas e decisoes conjuntas sobre moradia.',
        en: 'July brings a consolidation cycle for Dailton: Jupiter transits the 10th house favoring professional recognition, while the new moon on the 14th calls for focus on long-term goals with Felipe. The second half of the month favors short trips and joint decisions about housing.',
      },
      felipe: {
        pt: 'Para Felipe, julho comeca com Mercurio retrogrado revisando conversas antigas com a familia. A partir do dia 20, o Sol ativa a casa das parcerias, otimo para aprofundar compromissos com Dailton. Evite assinar contratos importantes antes do dia 18.',
        en: 'For Felipe, July begins with Mercury retrograde revisiting old conversations with family. From the 20th, the Sun activates the house of partnerships, great for deepening commitments with Dailton. Avoid signing important contracts before the 18th.',
      },
    },
    couple: {
      davison: {
        date: '1995-01-05T09:07:00Z',
        lat: -16.27,
        lon: -50.08,
        sunSign: 'capricorn',
        moonSign: 'libra',
      },
      compositeReadings: {
        pt: [
          { title: 'Sol — Cancer (Composto)', text: 'O relacionamento e profundamente nutritivo, emocionalmente solidario e voltado para a familia escolhida.' },
          { title: 'Lua — Peixes (Composto)', text: 'O clima emocional pede ternura e imaginacao, com honestidade gentil para nao escorregar na idealizacao.' },
        ],
        en: [
          { title: 'Sun — Cancer (Composite)', text: 'The relationship is deeply nurturing, emotionally supportive, and oriented toward chosen family.' },
          { title: 'Moon — Pisces (Composite)', text: 'The emotional weather asks for tenderness and imagination, with gentle honesty to avoid idealisation.' },
        ],
      },
      lifeAreas: {
        pt: [
          { area: 'Comunicacao e Compreensao', score: 0.684, description: 'O quao bem voces se comunicam e entendem as perspectivas um do outro.' },
          { area: 'Afeto e Romance', score: 0.815, description: 'Calor, carinho e expressao romantica.' },
          { area: 'Rotina e Vida Diaria', score: 0.742, description: 'Como o cotidiano funciona a dois.' },
        ],
        en: [
          { area: 'Communication and Understanding', score: 0.684, description: 'How well you communicate and grasp each other perspectives.' },
          { area: 'Affection and Romance', score: 0.815, description: 'Warmth, care, and romantic expression.' },
          { area: 'Routine and Daily Life', score: 0.742, description: 'How the everyday works for two.' },
        ],
      },
      nodalAxis: { northSign: 'scorpio', southSign: 'taurus', northHouse: 9, southHouse: 3, text: 'Juntos sao atraidos a expandir a visao de mundo partilhada.' },
      score: {
        value: 16,
        normalized: 0.625,
        description: 'Uma sinergia rara: os temas de vida dos dois se cruzam em pontos estruturais do mapa, sugerindo um vinculo que amadurece com o tempo em vez de se desgastar.',
        overall: 'destiny-level',
      },
      synastry: {
        harmonyPct: 71.4,
        tensionPct: 28.6,
        dynamicType: 'growth-through-friction',
        topStrengths: [
          'Sol de Dailton trigono Lua de Felipe',
          'Venus de Felipe sextil Marte de Dailton',
          'Jupiter de Dailton conjuncao Sol de Felipe',
          'Lua de Dailton trigono Venus de Felipe',
        ],
        topChallenges: [
          'Saturno de Felipe quadratura Lua de Dailton',
          'Marte de Dailton oposicao Marte de Felipe',
          'Mercurio de Felipe quadratura Urano de Dailton',
        ],
      },
    },
    person: {
      dailton: {
        lots: [
          { key: 'fortune', sign: 'sagittarius', degree: 14.2, house: 8 },
          { key: 'spirit', sign: 'aquarius', degree: 3.51, house: 10 },
          { key: 'eros', sign: 'pisces', degree: 27.4, house: 11 },
        ],
        sect: 'day',
        profection: { house: 9, ruler: 'saturn', sign: 'capricorn', age: 32, from: '2026-04-29', to: '2027-04-28', themes: ['viagem','estudo','fe','filosofia'] },
        readings: {
          pt: [{ title: 'Sol — Touro', text: 'Procura estabilidade e encontra proposito na criacao de algo tangivel e duradouro.' }],
          en: [{ title: 'Sun — Taurus', text: 'Seeks stability and finds purpose in building something tangible and lasting.' }],
        },
        loveLanguages: {
          pt: 'A linguagem do amor predominante de Dailton e atos de servico, com Venus em signo de terra reforcando o cuidado pratico. Palavras de afirmacao aparecem em segundo lugar, especialmente quando reconhecem esforco e consistencia.',
          en: 'Dailton\'s predominant love language is acts of service, with Venus in an earth sign reinforcing practical care. Words of affirmation come second, especially when they acknowledge effort and consistency.',
        },
        flags: {
          pt: 'Sinal verde: lealdade e constancia nos compromissos assumidos. Sinal de atencao: tendencia a evitar conflitos ao inves de resolve-los, com Lua em aspecto tenso a Plutao.',
          en: 'Green flag: loyalty and consistency in commitments made. Yellow flag: a tendency to avoid conflict instead of resolving it, with the Moon in a tense aspect to Pluto.',
        },
        chapters: [
          { level: 'L1', sign: 'Scorpio', ruler: 'Mars', start: '2022-03-11', end: '2037-03-11' },
          { level: 'L2', sign: 'Capricorn', ruler: 'Saturn', start: '2024-07-02', end: '2026-11-19' },
        ],
        places: [
          { name: 'Anchorage', label: 'Sun line - vitality and visibility', strength: 8.7 },
          { name: 'Fairbanks', label: 'Jupiter line - expansion and luck', strength: 8.2 },
          { name: 'Ponta Delgada', label: 'Venus line - romance and ease', strength: 7.9 },
          { name: 'Reykjavik', label: 'Mercury line - ideas and networking', strength: 7.1 },
          { name: 'Lisboa', label: 'Moon line - roots and emotional comfort', strength: 6.8 },
        ],
      },
      felipe: {
        lots: [
          { key: 'fortune', sign: 'aries', degree: 8.9, house: 5 },
          { key: 'spirit', sign: 'leo', degree: 21.7, house: 9 },
          { key: 'eros', sign: 'virgo', degree: 5.2, house: 10 },
        ],
        sect: 'day',
        profection: { house: 7, ruler: 'mercury', sign: 'gemini', age: 30, from: '2025-09-13', to: '2026-09-12', themes: ['parcerias','contratos'] },
        readings: {
          pt: [{ title: 'Sol — Virgem', text: 'Amor em forma de gesto util: reparar, melhorar, resolver.' }],
          en: [{ title: 'Sun — Virgo', text: 'Love as useful gesture: repairing, improving, solving.' }],
        },
        loveLanguages: {
          pt: 'Felipe expressa e recebe afeto principalmente por tempo de qualidade, com a Lua em signo de ar valorizando trocas de ideias. Toque fisico aparece como segunda linguagem, reforcado por Marte em aspecto harmonico a Venus.',
          en: 'Felipe expresses and receives affection mainly through quality time, with the Moon in an air sign valuing the exchange of ideas. Physical touch shows up as a second language, reinforced by Mars in a harmonious aspect to Venus.',
        },
        flags: {
          pt: 'Sinal verde: comunicacao aberta e disposicao genuina para negociar diferencas. Sinal de atencao: impulsividade em decisoes financeiras conjuntas quando Urano tensiona seu Sol natal.',
          en: 'Green flag: open communication and genuine willingness to negotiate differences. Yellow flag: impulsiveness in joint financial decisions when Uranus stresses his natal Sun.',
        },
        chapters: [
          { level: 'L1', sign: 'Gemini', ruler: 'Mercury', start: '2018-09-24', end: '2038-09-24' },
          { level: 'L2', sign: 'Virgo', ruler: 'Mercury', start: '2023-01-15', end: '2025-04-02' },
        ],
        places: [
          { name: 'Ponta Delgada', label: 'Sun line - vitality and visibility', strength: 8.4 },
          { name: 'Anchorage', label: 'Venus line - romance and ease', strength: 7.6 },
          { name: 'Fairbanks', label: 'Mercury line - ideas and networking', strength: 7.3 },
          { name: 'Bergen', label: 'Jupiter line - expansion and luck', strength: 7.0 },
          { name: 'Salvador', label: 'Moon line - roots and emotional comfort', strength: 6.5 },
        ],
      },
    },
  };
  mkdirSync('public', { recursive: true });
  const json = JSON.stringify(out, null, 2) + '\n';
  writeFileSync('public/api-extras.json', json);
  console.log(`wrote public/api-extras.json (mock, ${(Buffer.byteLength(json) / 1024).toFixed(1)}KB)`);
}

if (MOCK) {
  writeMock();
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Real fetch flow
// ---------------------------------------------------------------------------

let successes = 0;
let failures = 0;

let quotaExhausted = false;
let skipped = 0;

async function attempt(label, fn) {
  if (quotaExhausted) { skipped++; return null; }
  try {
    const result = await fn();
    if (result === null || result === undefined) throw new Error('no usable data in response');
    successes++;
    console.log(`ok: ${label}`);
    return result;
  } catch (err) {
    failures++;
    if (err.quotaExhausted) {
      quotaExhausted = true;
      console.error(`FAIL: ${label}: quota exhausted — skipping every remaining call`);
    } else {
      console.error(`FAIL: ${label}:`, err.message);
    }
    return null;
  } finally {
    // No point pacing requests we are no longer going to make.
    if (!quotaExhausted) await sleep(300);
  }
}

// Previous run's data is the baseline: a failed call must never erase a
// section that an earlier run fetched successfully (quota 429s were doing
// exactly that). Evergreen sections younger than EVERGREEN_MAX_AGE_DAYS are
// not refetched at all, to spare the monthly API quota.
const EVERGREEN_MAX_AGE_DAYS = 30;
// Evergreen data (score, synastry, insights, places) is derived from the birth
// details, so a change to SUBJECTS must invalidate the cache no matter how
// fresh it is — otherwise the site would keep serving readings computed for
// the old chart.
const SUBJECTS_FINGERPRINT = JSON.stringify(
  Object.entries(SUBJECTS).sort().map(([k, v]) => [k, v.birth_data])
);
let previous = {};
try {
  if (existsSync('public/api-extras.json')) {
    previous = JSON.parse(readFileSync('public/api-extras.json', 'utf8'));
  }
} catch { /* corrupt or absent — start clean */ }
const prevAgeDays = previous.generatedAt
  ? (Date.now() - new Date(previous.generatedAt)) / 86400000
  : Infinity;
const evergreenFresh = (
  prevAgeDays < EVERGREEN_MAX_AGE_DAYS &&
  previous.subjectsFingerprint === SUBJECTS_FINGERPRINT &&
  previous.couple && previous.person &&
  Object.keys(previous.person).length === 2
);
if (previous.generatedAt && previous.subjectsFingerprint !== SUBJECTS_FINGERPRINT) {
  console.log('birth data changed since the last run — refetching everything');
}

// Two cheaper tiers on top of the 30-day evergreen one.
//
//   once   — derived purely from the birth details, so it is fetched a single
//            time and then never again unless those details change.
//   yearly — tied to the current year (profections, returns), so refetched
//            when the stored copy is from a previous year.
//
// Both are the reason the extra sections below cost almost nothing per run.
const birthDataUnchanged = previous.subjectsFingerprint === SUBJECTS_FINGERPRINT;
function haveOnce(path) {
  if (!birthDataUnchanged) return false;
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), previous) != null;
}
function haveThisYear(path) {
  if (!haveOnce(path)) return false;
  return new Date(previous.generatedAt).getUTCFullYear() === new Date().getUTCFullYear();
}

const out = {
  generatedAt: new Date().toISOString(),
  source: 'astrology-api.io',
  version: 2,
  subjectsFingerprint: SUBJECTS_FINGERPRINT,
  weekly: {},
  monthly: {},
  couple: {},
  person: {},
};

// -- Personalized weekly + monthly text, both partners, both languages -----
// Portuguese is the site's default language, so every PT call is made before
// any EN one: a partial quota then buys a complete Portuguese site rather
// than half of each language.
for (const who of Object.keys(SUBJECTS)) {
  out.weekly[who] = {};
  out.monthly[who] = {};
}
for (const language of ['pt', 'en']) {
  for (const [who, subject] of Object.entries(SUBJECTS)) {
    const weeklyText = await attempt(`weekly ${who} ${language}`, async () => {
      const payload = await post('/horoscope/personal/weekly/text', {
        subject, horoscope_type: 'weekly', language, format: 'paragraph', emoji: false,
      });
      return extractText(payload);
    });
    if (weeklyText) out.weekly[who][language] = weeklyText;

    const monthlyText = await attempt(`monthly ${who} ${language}`, async () => {
      const payload = await post('/horoscope/personal/monthly/text', {
        subject, horoscope_type: 'monthly', language, format: 'paragraph', emoji: false,
      });
      return extractText(payload);
    });
    if (monthlyText) out.monthly[who][language] = monthlyText;
  }
}
for (const who of Object.keys(SUBJECTS)) {
  if (Object.keys(out.weekly[who]).length === 0) delete out.weekly[who];
  if (Object.keys(out.monthly[who]).length === 0) delete out.monthly[who];
}

// -- Couple: compatibility score + synastry report --------------------------
// Skipped entirely when the previous data is complete and fresh — these
// numbers don't change; refetching them just burns quota.
const score = evergreenFresh ? null : await attempt('couple compatibility-score', async () => {
  const payload = await post('/analysis/compatibility-score', {
    subject1: SUBJECTS.dailton, subject2: SUBJECTS.felipe,
  });
  return extractScore(payload);
});

const synastry = evergreenFresh ? null : await attempt('couple synastry-report', async () => {
  const payload = await post('/analysis/synastry-report', {
    subject1: SUBJECTS.dailton, subject2: SUBJECTS.felipe,
    report_options: { language: 'pt' },
    include_house_overlays: true,
  });
  return extractSynastry(payload);
});

// -- Davison chart: one call, kept forever ---------------------------------
// Unlike the composite (an abstract midpoint of two charts), the Davison is a
// real chart for the midpoint in time AND space between two births — it has an
// actual date and an actual place on the map. That never changes, so it is
// fetched once.
// (Davison is computed in src/chartData.js — verified identical to this
// endpoint's output, so the call was removed.)
const davison = null;

// -- Composite interpretation: prose, both languages, kept forever ---------
// One composite-report call carries 52 interpretations, 12 scored life areas,
// the nodal axis and the chart ruler — so it is the best value per credit of
// anything on offer here.
const compositeReadings = {};
const lifeAreas = {};
let nodalAxis = null;
for (const language of ['pt', 'en']) {
  if (haveOnce(`couple.compositeReadings.${language}`)) continue;
  await attempt(`couple composite-report ${language}`, async () => {
    const payload = await post('/analysis/composite-report', {
      subject1: SUBJECTS.dailton, subject2: SUBJECTS.felipe,
      report_options: { language },
    });
    const readings = extractInterpretations(payload, 8);
    const areas = extractLifeAreas(payload);
    if (readings) compositeReadings[language] = readings;
    if (areas) lifeAreas[language] = areas;
    if (!nodalAxis) nodalAxis = extractNodalAxis(payload);
    return readings || areas || nodalAxis;
  });
}

out.couple = {};
if (score) out.couple.score = score;
if (synastry) out.couple.synastry = synastry;
if (davison) out.couple.davison = davison;
if (Object.keys(compositeReadings).length) out.couple.compositeReadings = compositeReadings;
if (Object.keys(lifeAreas).length) out.couple.lifeAreas = lifeAreas;
if (nodalAxis) out.couple.nodalAxis = nodalAxis;

// -- Per-person insights: love languages, timing, places -------------------
// The /insights/relationship/red-flags endpoint used to be called here too,
// four times a run (two people x two languages). It never once returned
// usable content, so it was costing ~18% of the quota for nothing. The
// renderer still displays a `flags` section if the data ever reappears.
for (const [who, subject] of Object.entries(SUBJECTS)) {
  const personOut = {};
  const skipEvergreen = evergreenFresh;
  if (skipEvergreen) console.log(`skip: evergreen person data fresh for ${who}`);

  const loveLanguages = {};
  for (const language of ['pt', 'en']) {
    if (skipEvergreen) continue;
    const ll = await attempt(`love-languages ${who} ${language}`, async () => {
      const payload = await post('/insights/relationship/love-languages', {
        subject, options: { language },
      });
      return extractText(payload);
    });
    if (ll) loveLanguages[language] = ll;

  }
  if (Object.keys(loveLanguages).length) personOut.loveLanguages = loveLanguages;

  const chapters = skipEvergreen ? null : await attempt(`zodiacal-releasing ${who}`, async () => {
    const payload = await post('/timing/zodiacal-releasing/current', { subject });
    const result = extractChapters(payload);
    return result.length ? result : null;
  });
  if (chapters) personOut.chapters = chapters;

  // One call for the whole traditional layer: 28 Arabic Parts, dignities,
  // sect. Birth-derived, so fetched once and then never again.
  const traditional = haveOnce(`person.${who}.lots`) ? null : await attempt(`traditional ${who}`, async () => {
    const payload = await post('/traditional/analysis', { subject, options: { language: 'pt' } });
    return extractTraditional(payload);
  });
  if (traditional) {
    if (traditional.lots) personOut.lots = traditional.lots;
    if (traditional.sect) personOut.sect = traditional.sect;
    if (traditional.strongest) personOut.strongest = traditional.strongest;
    if (traditional.afflicted) personOut.afflicted = traditional.afflicted;
  }

  // Profection timeline returns the live year ready to use; refreshed yearly.
  const profection = haveThisYear(`person.${who}.profection`) ? null : await attempt(`profection ${who}`, async () => {
    const payload = await post('/traditional/analysis/profection-timeline', {
      subject, start_age: 20, end_age: 60,
    });
    return extractProfection(payload);
  });
  if (profection) personOut.profection = profection;

  // 60 natal interpretations per person per language; capped on the way in.
  const readings = {};
  for (const language of ['pt', 'en']) {
    if (haveOnce(`person.${who}.readings.${language}`)) continue;
    const r = await attempt(`natal-report ${who} ${language}`, async () => {
      const payload = await post('/analysis/natal-report', {
        subject, report_options: { language },
      });
      return extractInterpretations(payload, 8);
    });
    if (r) readings[language] = r;
  }
  if (Object.keys(readings).length) personOut.readings = readings;

  const places = skipEvergreen ? null : await attempt(`astrocartography ${who}`, async () => {
    const payload = await post('/astrocartography/power-zones', { subject, language: 'pt' });
    const result = extractPlaces(payload);
    return result.length ? result : null;
  });
  if (places) personOut.places = places;

  if (Object.keys(personOut).length) out.person[who] = personOut;
}

// Merge: anything this run failed to fetch keeps the previous run's value.
function mergeSection(section) {
  const prev = previous[section] || {};
  const fresh = out[section] || {};
  const merged = {};
  for (const key of new Set([...Object.keys(prev), ...Object.keys(fresh)])) {
    if (prev[key] && typeof prev[key] === 'object' && !Array.isArray(prev[key])) {
      merged[key] = { ...prev[key], ...(fresh[key] || {}) };
    } else {
      merged[key] = fresh[key] ?? prev[key];
    }
  }
  return merged;
}
for (const section of ['weekly', 'monthly', 'couple', 'person']) {
  out[section] = mergeSection(section);
  if (Object.keys(out[section]).length === 0) delete out[section];
}

if (successes === 0) {
  console.error('All API calls failed; keeping previous api-extras.json untouched');
  process.exit(1);
}

mkdirSync('public', { recursive: true });
const json = JSON.stringify(out, null, 2) + '\n';
const sizeKB = Buffer.byteLength(json) / 1024;
if (sizeKB > 300) {
  console.warn(`api-extras.json is ${sizeKB.toFixed(1)}KB, exceeding the ~300KB budget`);
}
writeFileSync('public/api-extras.json', json);
console.log(`wrote public/api-extras.json (${sizeKB.toFixed(1)}KB, ${successes} ok, ${failures} failures)`);

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

const API_BASE = process.env.ASTROLOGY_API_URL || 'https://api.astrology-api.io';
const KEY = process.env.ASTROLOGY_API_KEY;
if (!MOCK && !KEY) {
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

async function post(path, body) {
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
  return res.json();
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

// The Davison chart is a real chart for the midpoint in time and space
// between two births, so the prize here is its date and coordinates.
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

// Arabic Parts. Only the handful that mean something on a love site are kept.
const WANTED_LOTS = ['fortune', 'spirit', 'eros', 'love', 'necessity', 'courage', 'victory', 'marriage'];
function extractLots(payload) {
  const listRaw = deepFind(payload, ['lots', 'parts', 'arabic_parts', 'results']);
  const items = Array.isArray(listRaw)
    ? listRaw
    : (listRaw && typeof listRaw === 'object' ? Object.entries(listRaw).map(([k, v]) => ({ name: k, ...(v && typeof v === 'object' ? v : { value: v }) })) : []);
  const lots = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const nameRaw = item.name || item.lot || item.title || item.key;
    if (typeof nameRaw !== 'string') continue;
    const key = normalizeKey(nameRaw).replace(/^lotof|^partof/, '');
    if (!WANTED_LOTS.some((w) => key.includes(w))) continue;
    const sign = item.sign || item.sign_name || item.zodiac_sign || deepFind(item, ['sign']);
    const degree = toNum(item.degree ?? item.position ?? deepFind(item, ['degree', 'longitude']));
    const entry = { key };
    if (typeof sign === 'string') entry.sign = sign;
    if (degree !== null) entry.degree = Math.round(degree * 100) / 100;
    if (entry.sign || entry.degree !== undefined) lots.push(entry);
    if (lots.length >= 6) break;
  }
  return lots.length ? lots : null;
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
      compositeText: {
        pt: 'A relacao em si tem carater de lar: um Sol composto em Cancer descreve um vinculo cuja razao de existir e criar um lugar seguro. A Lua em Peixes pede ternura e imaginacao; Venus em Leao quer que esse amor seja visto, celebrado, dito em voz alta.',
        en: 'The relationship itself has the character of a home: a composite Sun in Cancer describes a bond whose reason for existing is to make a safe place. The Moon in Pisces asks for tenderness and imagination; Venus in Leo wants this love seen, celebrated, said out loud.',
      },
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
          { key: 'fortune', sign: 'sagittarius', degree: 14.2 },
          { key: 'spirit', sign: 'aquarius', degree: 3.51 },
          { key: 'eros', sign: 'pisces', degree: 27.4 },
        ],
        profection: { house: 7, ruler: 'venus', age: 32 },
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
          { key: 'fortune', sign: 'aries', degree: 8.9 },
          { key: 'spirit', sign: 'leo', degree: 21.7 },
          { key: 'eros', sign: 'virgo', degree: 5.2 },
        ],
        profection: { house: 12, ruler: 'mars', age: 30 },
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
const davison = haveOnce('couple.davison') ? null : await attempt('couple davison', async () => {
  const payload = await post('/insights/relationship/davison', {
    subjects: [SUBJECTS.dailton, SUBJECTS.felipe],
    options: { language: 'pt' },
  });
  return extractDavison(payload);
});

// -- Composite interpretation: prose, both languages, kept forever ---------
const compositeText = {};
for (const language of ['pt', 'en']) {
  if (haveOnce(`couple.compositeText.${language}`)) continue;
  const t = await attempt(`couple composite-report ${language}`, async () => {
    const payload = await post('/analysis/composite-report', {
      subject1: SUBJECTS.dailton, subject2: SUBJECTS.felipe,
      report_options: { language },
    });
    return extractText(payload);
  });
  if (t) compositeText[language] = t;
}

if (score || synastry || davison || Object.keys(compositeText).length) {
  out.couple = {};
  if (score) out.couple.score = score;
  if (synastry) out.couple.synastry = synastry;
  if (davison) out.couple.davison = davison;
  if (Object.keys(compositeText).length) out.couple.compositeText = compositeText;
}

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

  // Arabic Parts — classical calculated points, including the Lot of Eros.
  // Birth-derived, so fetched once and then never again.
  const lots = haveOnce(`person.${who}.lots`) ? null : await attempt(`lots ${who}`, async () => {
    const payload = await post('/traditional/lots', { subject, options: { language: 'pt' } });
    return extractLots(payload);
  });
  if (lots) personOut.lots = lots;

  // Annual profection — which house rules this year of life. Changes on the
  // birthday, so a yearly refresh is enough.
  const profection = haveThisYear(`person.${who}.profection`) ? null : await attempt(`annual-profection ${who}`, async () => {
    const payload = await post('/traditional/analysis/annual-profection', {
      subject,
      current_date: new Date().toISOString().slice(0, 10),
    });
    const house = toNum(deepFind(payload, ['profected_house', 'profectedHouse', 'house', 'house_number']));
    const rulerRaw = deepFind(payload, ['time_lord', 'timeLord', 'lord_of_year', 'ruler', 'year_ruler']);
    const ruler = typeof rulerRaw === 'string' ? rulerRaw : (rulerRaw && typeof rulerRaw === 'object' ? (rulerRaw.name || rulerRaw.planet || null) : null);
    const age = toNum(deepFind(payload, ['age', 'current_age']));
    if (house === null && !ruler) return null;
    const o = {};
    if (house !== null) o.house = house;
    if (ruler) o.ruler = String(ruler).toLowerCase();
    if (age !== null) o.age = age;
    const txt = extractText(payload);
    if (txt) o.text = txt;
    return o;
  });
  if (profection) personOut.profection = profection;

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

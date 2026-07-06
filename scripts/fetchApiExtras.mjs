// Fetches personalized astrology content for both partners from
// astrology-api.io and writes it to public/api-extras.json, which the site
// reads defensively (missing/failed pieces are simply hidden — see
// src/main.js loadApiExtras).
//
// Runs in GitHub Actions (.github/workflows/weekly-extras.yml) with the token
// provided via the ASTROLOGY_API_KEY repository secret. Never commit the key,
// and never commit public/api-extras.json itself (it is regenerated on every
// scheduled run and is git-ignored).
//
// Local development: `node scripts/fetchApiExtras.mjs --mock` skips the
// network entirely and writes a realistic mock public/api-extras.json (same
// v2 schema, plausible PT/EN copy) so the site can be built/previewed without
// API access or a key. Delete the file again before committing.

import { writeFileSync, mkdirSync } from 'node:fs';

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
      year: 1995, month: 9, day: 13, hour: 9, minute: 54,
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
    throw new Error(`${path} -> HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
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

function extractPlaces(payload) {
  const listRaw = deepFind(payload, [
    'power_zones', 'powerZones', 'zones', 'locations', 'cities', 'results', 'top_locations', 'topLocations',
  ]);
  const list = Array.isArray(listRaw) ? listRaw : [];
  const places = [];
  for (const item of list) {
    if (places.length >= 5) break;
    if (!item || typeof item !== 'object') continue;
    const name = deepFind(item, ['city', 'name', 'location']);
    const label = deepFind(item, ['label', 'theme', 'line_type', 'lineType', 'summary', 'description']);
    const strength = toNum(deepFind(item, ['strength', 'score', 'power', 'rating']));
    const entry = {};
    if (typeof name === 'string') entry.name = name;
    if (typeof label === 'string') entry.label = truncate(label, 200);
    if (strength !== null) entry.strength = strength;
    if (Object.keys(entry).length) places.push(entry);
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

async function attempt(label, fn) {
  try {
    const result = await fn();
    if (result === null || result === undefined) throw new Error('no usable data in response');
    successes++;
    console.log(`ok: ${label}`);
    return result;
  } catch (err) {
    failures++;
    console.error(`FAIL: ${label}:`, err.message);
    return null;
  } finally {
    await sleep(300);
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  source: 'astrology-api.io',
  version: 2,
  weekly: {},
  monthly: {},
  couple: {},
  person: {},
};

// -- Personalized weekly + monthly text, both partners, both languages -----
for (const [who, subject] of Object.entries(SUBJECTS)) {
  out.weekly[who] = {};
  out.monthly[who] = {};
  for (const language of ['pt', 'en']) {
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
  if (Object.keys(out.weekly[who]).length === 0) delete out.weekly[who];
  if (Object.keys(out.monthly[who]).length === 0) delete out.monthly[who];
}

// -- Couple: compatibility score + synastry report --------------------------
const score = await attempt('couple compatibility-score', async () => {
  const payload = await post('/analysis/compatibility-score', {
    subject1: SUBJECTS.dailton, subject2: SUBJECTS.felipe,
  });
  return extractScore(payload);
});

const synastry = await attempt('couple synastry-report', async () => {
  const payload = await post('/analysis/synastry-report', {
    subject1: SUBJECTS.dailton, subject2: SUBJECTS.felipe,
    report_options: { language: 'pt' },
    include_house_overlays: true,
  });
  return extractSynastry(payload);
});

if (score || synastry) {
  out.couple = {};
  if (score) out.couple.score = score;
  if (synastry) out.couple.synastry = synastry;
}

// -- Per-person insights: love languages, red flags, timing, places --------
for (const [who, subject] of Object.entries(SUBJECTS)) {
  const personOut = {};

  const loveLanguages = {};
  const flags = {};
  for (const language of ['pt', 'en']) {
    const ll = await attempt(`love-languages ${who} ${language}`, async () => {
      const payload = await post('/insights/relationship/love-languages', {
        subject, options: { language },
      });
      return extractText(payload);
    });
    if (ll) loveLanguages[language] = ll;

    const rf = await attempt(`red-flags ${who} ${language}`, async () => {
      const payload = await post('/insights/relationship/red-flags', {
        subject, options: { language },
      });
      return extractText(payload);
    });
    if (rf) flags[language] = rf;
  }
  if (Object.keys(loveLanguages).length) personOut.loveLanguages = loveLanguages;
  if (Object.keys(flags).length) personOut.flags = flags;

  const chapters = await attempt(`zodiacal-releasing ${who}`, async () => {
    const payload = await post('/timing/zodiacal-releasing/current', { subject });
    const result = extractChapters(payload);
    return result.length ? result : null;
  });
  if (chapters) personOut.chapters = chapters;

  const places = await attempt(`astrocartography ${who}`, async () => {
    const payload = await post('/astrocartography/power-zones', { subject, language: 'pt' });
    const result = extractPlaces(payload);
    return result.length ? result : null;
  });
  if (places) personOut.places = places;

  if (Object.keys(personOut).length) out.person[who] = personOut;
}

if (Object.keys(out.weekly).length === 0) delete out.weekly;
if (Object.keys(out.monthly).length === 0) delete out.monthly;
if (Object.keys(out.couple).length === 0) delete out.couple;
if (Object.keys(out.person).length === 0) delete out.person;

if (successes === 0) {
  console.error('All API calls failed; not writing api-extras.json');
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

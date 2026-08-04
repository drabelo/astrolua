import './styles.css';
import { signOf, planetLongitudes, aspectBetween, moonPhaseInfo, nextMoonPhaseSign, wholeSignHouse, retrogradesAt, upcomingTransits } from './astro.js';
import { PEOPLE, DAVISON } from './chartData.js';
import { I18N } from './i18n.js';
import { initStarfield } from './starfield.js';

// U+FE0E forces monochrome text glyphs — otherwise many platforms render
// these as colored emoji, which wrecks the wheel's look.
const T_ = '\ufe0e';
const PLANET_GLYPHS = {
  sun: '☉' + T_, moon: '☽' + T_, mercury: '☿' + T_, venus: '♀' + T_, mars: '♂' + T_,
  jupiter: '♃' + T_, saturn: '♄' + T_, uranus: '♅' + T_, neptune: '♆' + T_, pluto: '♇' + T_,
  ascendant: 'AC', midheaven: 'MC',
};
const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'].map(g => g + T_);
const MOON_EMOJI = {
  'new': '🌑', 'waxing-crescent': '🌒', 'first-quarter': '🌓', 'waxing-gibbous': '🌔',
  'full': '🌕', 'waning-gibbous': '🌖', 'last-quarter': '🌗', 'waning-crescent': '🌘',
};

// Daily transits: fast bodies only, tight orbs so a line only shows when
// something is genuinely happening.
const TRANSIT_BODIES = ['moon', 'sun', 'mercury', 'venus', 'mars'];
const NATAL_POINTS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'ascendant', 'midheaven'];
const DAILY_ORBS = [
  { name: 'conjunction', angle: 0, orb: 4 },
  { name: 'sextile', angle: 60, orb: 2.5 },
  { name: 'square', angle: 90, orb: 3 },
  { name: 'trine', angle: 120, orb: 3 },
  { name: 'opposition', angle: 180, orb: 4 },
];
// element = index % 4, modality = index % 3, modern rulers
const SIGN_INFO = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces']
  .map((key, i) => ({
    key,
    element: ['fire','earth','air','water'][i % 4],
    modality: ['cardinal','fixed','mutable'][i % 3],
    ruler: ['mars','venus','mercury','moon','sun','mercury','venus','pluto','jupiter','saturn','uranus','neptune'][i],
  }));

const TONE_OF = {
  trine: 'harmonious', sextile: 'harmonious',
  square: 'tense', opposition: 'tense',
  conjunction: 'blend',
};

let lang = localStorage.getItem('astrolua-lang') || 'pt';

// Which page this is: 'us' (relationship home), 'dailton', or 'felipe'.
// Set via <body data-view="..."> in each entry HTML.
const VIEW = document.body.dataset.view || 'us';
const ROOT = VIEW === 'us' ? './' : '../';
const PAGE_HREFS = {
  us: VIEW === 'us' ? './' : '../',
  dailton: VIEW === 'us' ? './dailton/' : '../dailton/',
  felipe: VIEW === 'us' ? './felipe/' : '../felipe/',
};

// Weekly horoscopes fetched by the scheduled workflow into api-extras.json.
// The section stays hidden until the file exists and is reasonably fresh.
let apiExtras = null;
async function loadApiExtras() {
  try {
    const res = await fetch(ROOT + 'api-extras.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const data = await res.json();
    // Staleness only matters for the time-sensitive sections; evergreen data
    // (score, places, chapters, insights) stays useful indefinitely.
    const ageDays = (Date.now() - new Date(data.generatedAt)) / 86400000;
    // Stale content is labelled, not deleted: a section silently disappearing
    // is worse than one that says how old it is.
    data.staleWeekly = ageDays >= 12;
    data.staleMonthly = ageDays >= 45;
    apiExtras = data;
    fillApiSlots();
  } catch { /* no extras — section stays hidden */ }
}

function tightestTransit(transits, natalPoints) {
  let best = null;
  for (const body of TRANSIT_BODIES) {
    for (const point of NATAL_POINTS) {
      const asp = aspectBetween(transits[body], natalPoints[point], DAILY_ORBS);
      if (asp && (!best || asp.orb < best.orb)) {
        best = { body, point, aspect: asp.name, orb: asp.orb };
      }
    }
  }
  return best;
}

function todaySky() {
  const now = new Date();
  const transits = planetLongitudes(now);
  const moon = moonPhaseInfo(now);
  const moonSign = signOf(transits.moon);
  return {
    now,
    moonSign,
    moonPhase: moon,
    dailton: tightestTransit(transits, PEOPLE.dailton.points),
    felipe: tightestTransit(transits, PEOPLE.felipe.points),
  };
}

function transitBlock(t, person) {
  if (!t) return `<p>${t9().noMajorTransit}</p>`;
  const T = t9();
  const label = T.transitTemplate(T.planets[t.body], T.aspectNames[t.aspect], T.points[t.point]);
  const tone = TONE_OF[t.aspect];
  const text = T.transitTones[tone][t.body];
  return `<div class="transit-label">${label}</div><p>${text}</p>`;
}

function t9() {
  return I18N[lang];
}

// API responses are English-only. Map known values into the active language;
// if we have no translation, prefer showing nothing over showing English on
// the Portuguese page.
function apiText(raw, { allowUntranslated = false } = {}) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const T = t9();
  const s = raw.trim();
  const table = T.apiTerms || {};
  if (table[s]) return table[s];
  const lower = s.toLowerCase();
  if (table[lower]) return table[lower];
  if (lang === 'en' || allowUntranslated) return s;
  return null;
}

// --- elemental chemistry ---
// 10 planets + ascendant (midheaven excluded on purpose — it's about
// placement/career, not temperament).
const ELEMENT_KEYS = ['fire', 'earth', 'air', 'water'];
const ELEMENT_POINTS = [
  'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn',
  'uranus', 'neptune', 'pluto', 'ascendant',
];

function elementCounts(points) {
  const counts = { fire: 0, earth: 0, air: 0, water: 0 };
  for (const key of ELEMENT_POINTS) {
    const el = ELEMENT_KEYS[signOf(points[key]).index % 4];
    counts[el]++;
  }
  return counts;
}

function elementBarsHTML(counts, T) {
  return ELEMENT_KEYS.map(el => {
    const count = counts[el];
    const pct = ((count / ELEMENT_POINTS.length) * 100).toFixed(1);
    return `<div class="element-bar">
      <span class="element-label">${T.elements.labels[el]}</span>
      <div class="element-track"><div class="element-fill ${el}" style="--fill-w:${pct}%"></div></div>
      <span class="element-count" data-countup="${count}">${count}</span>
    </div>`;
  }).join('');
}

function elementCardHTML(personKey, counts, T) {
  const name = personKey === 'dailton' ? T.forDailton : T.forFelipe;
  return `<div class="card reveal">
    <h3>${name}</h3>
    ${elementBarsHTML(counts, T)}
  </div>`;
}

function elementsSectionHTML(T) {
  const dailtonCounts = elementCounts(PEOPLE.dailton.points);
  const felipeCounts = elementCounts(PEOPLE.felipe.points);
  return `
      <section class="elements">
        <h2 class="reveal">${T.elements.title}</h2>
        <div class="sec-divider reveal" aria-hidden="true">🜃</div>
        <p class="intro reveal">${T.elements.intro}</p>
        <div class="elements-grid">
          ${elementCardHTML('dailton', dailtonCounts, T)}
          ${elementCardHTML('felipe', felipeCounts, T)}
        </div>
        <div class="today-sky reveal elements-combined">
          <p>${T.elements.combined}</p>
        </div>
      </section>`;
}

// --- numerology ---
// Life path number: sum every digit of the birth date (YYYYMMDD), then keep
// reducing by digit-sum until a single digit — except master numbers 11, 22,
// 33 are left alone wherever they land, including as a final result.
function digitSum(n) {
  return String(n).split('').reduce((sum, ch) => sum + Number(ch), 0);
}
const MASTER_NUMBERS = [11, 22, 33];
function reduceNumerology(n) {
  while (n > 9 && !MASTER_NUMBERS.includes(n)) {
    n = digitSum(n);
  }
  return n;
}
function lifePathNumber(isoDate) {
  // isoDate: 'YYYY-MM-DD...' — only the date part matters.
  const digits = isoDate.slice(0, 10).replace(/-/g, '');
  return reduceNumerology(digitSum(digits));
}
function numberCardHTML(T, number, name) {
  const meaning = T.numerology.meanings[String(number)];
  return `<div class="card reveal number-card">
    <div class="number-big">${number}</div>
    <h3>${meaning.title}</h3>
    ${name ? `<div class="number-name">${name}</div>` : ''}
    <p>${meaning.text}</p>
  </div>`;
}
function numerologySectionHTML(T) {
  const dNum = lifePathNumber(PEOPLE.dailton.birth.iso);
  const fNum = lifePathNumber(PEOPLE.felipe.birth.iso);
  const coupleNum = reduceNumerology(dNum + fNum);
  const coupleMeaning = T.numerology.meanings[String(coupleNum)];
  return `
      <section class="numerology">
        <h2 class="reveal">${T.numerology.title}</h2>
        <div class="sec-divider reveal" aria-hidden="true">✧</div>
        <p class="intro reveal">${T.numerology.intro}</p>
        <div class="numerology-grid">
          ${numberCardHTML(T, dNum, T.forDailton)}
          <div class="card reveal number-card couple-number">
            <div class="number-big">${coupleNum}</div>
            <h3>${T.numerology.coupleTitle}</h3>
            <p>${coupleMeaning.coupleText || coupleMeaning.text}</p>
          </div>
          ${numberCardHTML(T, fNum, T.forFelipe)}
        </div>
      </section>`;
}
function personNumerologySectionHTML(T, who) {
  const num = lifePathNumber(PEOPLE[who].birth.iso);
  const meaning = T.numerology.meanings[String(num)];
  return `
      <section class="numerology person-numerology">
        <h2 class="reveal">${T.numerology.personTitle}</h2>
        <div class="sec-divider reveal" aria-hidden="true">✧</div>
        <p class="intro reveal">${T.numerology.personIntro}</p>
        <div class="card reveal number-card">
          <div class="number-big">${num}</div>
          <h3>${meaning.title}</h3>
          <p>${meaning.text}</p>
        </div>
      </section>`;
}

// --- composite chart ---
// Circular midpoint (shorter arc) of a placement between the two charts —
// the standard way to build a composite chart's points.
function circularMidpoint(a, b) {
  const d = ((b - a + 540) % 360) - 180;
  return ((a + d / 2) + 360) % 360;
}
function degreeLabel(degree) {
  const deg = Math.floor(degree);
  const min = Math.round((degree - deg) * 60);
  return `${deg}°${String(min).padStart(2, '0')}'`;
}
function compositeCardHTML(T, key) {
  const c = T.composite[key];
  const lon = circularMidpoint(PEOPLE.dailton.points[key], PEOPLE.felipe.points[key]);
  const sign = signOf(lon);
  const badge = `${T.signs[sign.key]} · ${degreeLabel(sign.degree)}`;
  return `<div class="aspect-card reveal">
    <h3>${c.title}</h3>
    <span class="badge">${badge}</span>
    <p>${c.text}</p>
  </div>`;
}
function compositeSectionHTML(T) {
  return `
      <section class="composite">
        <h2 class="reveal">${T.composite.title}</h2>
        <div class="sec-divider reveal" aria-hidden="true">◐</div>
        <p class="intro reveal">${T.composite.intro}</p>
        ${['sun', 'moon', 'venus'].map(key => compositeCardHTML(T, key)).join('')}
      </section>`;
}

// --- house overlays (whole-sign) ---
// Drops one person's planet into the other's whole-sign houses: the house
// number is (planet's sign index - host's Ascendant sign index), wrapped to
// 1-12. Copy strings live in i18n; only the house number is computed here.
function overlayRowHTML(T, rowKey, planetLon, ascLon) {
  const row = T.overlays.rows[rowKey];
  const house = wholeSignHouse(planetLon, ascLon);
  return `<div class="overlay-row">
    <span class="overlay-chip">${T.overlays.houseChip(house)}</span>
    <div class="overlay-body">
      <h4>${row.label}</h4>
      <p>${row.text}</p>
    </div>
  </div>`;
}

function overlayCardHTML(T, title, rows) {
  return `<div class="card reveal overlay-card">
    <h3>${title}</h3>
    ${rows.map(([rowKey, planetLon, ascLon]) => overlayRowHTML(T, rowKey, planetLon, ascLon)).join('')}
  </div>`;
}

function overlaysSectionHTML(T) {
  const d = PEOPLE.dailton.points, f = PEOPLE.felipe.points;
  return `
      <section class="overlays">
        <h2 class="reveal">${T.overlays.title}</h2>
        <div class="sec-divider reveal" aria-hidden="true">⌂</div>
        <p class="intro reveal">${T.overlays.intro}</p>
        <div class="overlays-grid">
          ${overlayCardHTML(T, T.overlays.inChartOf.dailton, [
            ['felipeSunInDailton', f.sun, d.ascendant],
            ['felipeMoonInDailton', f.moon, d.ascendant],
            ['felipeVenusInDailton', f.venus, d.ascendant],
          ])}
          ${overlayCardHTML(T, T.overlays.inChartOf.felipe, [
            ['dailtonSunInFelipe', d.sun, f.ascendant],
            ['dailtonMoonInFelipe', d.moon, f.ascendant],
            ['dailtonVenusInFelipe', d.venus, f.ascendant],
          ])}
        </div>
      </section>`;
}

// --- synastry wheel SVG ---
function polar(cx, cy, r, lonDeg) {
  const th = ((180 - lonDeg) * Math.PI) / 180; // 0° Aries at left, counterclockwise
  return [cx + r * Math.cos(th), cy + r * Math.sin(th)];
}

function wheelSVG(persons = ['dailton', 'felipe'], ariaLabel = 'Synastry wheel') {
  const size = 580, cx = size / 2, cy = size / 2;
  const rOuter = 276, rZodiacIn = 240, rFelipe = 212, rDailton = 162, rInner = 118;
  let s = `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="${ariaLabel}">`;
  s += `<defs>
    <radialGradient id="wheelBg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(120,90,220,0.14)"/>
      <stop offset="70%" stop-color="rgba(120,90,220,0.04)"/>
      <stop offset="100%" stop-color="rgba(232,196,118,0.05)"/>
    </radialGradient>
  </defs>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="url(#wheelBg)" stroke="rgba(232,196,118,0.5)" stroke-width="1.5"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${rZodiacIn}" fill="none" stroke="rgba(232,196,118,0.35)" stroke-width="1"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${rInner}" fill="none" stroke="rgba(232,196,118,0.28)" stroke-width="1"/>`;
  // degree ticks every 10°, longer every 30°
  for (let d = 0; d < 360; d += 10) {
    const isCusp = d % 30 === 0;
    const [x1, y1] = polar(cx, cy, rZodiacIn, d);
    const [x2, y2] = polar(cx, cy, rZodiacIn + (isCusp ? 0 : 6), d);
    if (!isCusp) {
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(232,196,118,0.3)" stroke-width="1"/>`;
    }
  }
  for (let i = 0; i < 12; i++) {
    const [x1, y1] = polar(cx, cy, rInner, i * 30);
    const [x2, y2] = polar(cx, cy, rOuter, i * 30);
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(232,196,118,0.2)" stroke-width="1"/>`;
    const [gx, gy] = polar(cx, cy, (rOuter + rZodiacIn) / 2, i * 30 + 15);
    s += `<g class="zodiac-glyph" data-sign="${i}" tabindex="0" role="button" data-x="${gx.toFixed(1)}" data-y="${gy.toFixed(1)}">
      <circle cx="${gx}" cy="${gy}" r="16" fill="transparent"/>
      <text x="${gx}" y="${gy}" text-anchor="middle" dominant-baseline="central" font-size="17" fill="rgba(232,196,118,0.85)" style="font-family:serif">${SIGN_GLYPHS[i]}</text>
    </g>`;
  }
  // whole-sign house numbers, counted from the base person's Ascendant
  const basePerson = persons.includes('dailton') ? 'dailton' : persons[0];
  const ascSignIdx = Math.floor(((PEOPLE[basePerson].points.ascendant % 360) + 360) % 360 / 30);
  for (let h = 1; h <= 12; h++) {
    const lonMid = ((ascSignIdx + h - 1) % 12) * 30 + 15;
    const [hx, hy] = polar(cx, cy, rInner - 14, lonMid);
    s += `<text class="house-num" x="${hx}" y="${hy}" text-anchor="middle" dominant-baseline="central" font-size="10.5" fill="rgba(183,171,221,0.55)" font-weight="600">${h}</text>`;
  }
  // featured aspect lines: gold = flowing, rose dashed = frictional
  const pairs = [
    ['dailton', 'sun', 'felipe', 'moon', 'soft'],
    ['dailton', 'ascendant', 'felipe', 'sun', 'soft'],
    ['dailton', 'uranus', 'felipe', 'venus', 'soft'],
    ['dailton', 'venus', 'felipe', 'jupiter', 'soft'],
    ['dailton', 'jupiter', 'felipe', 'moon', 'hard'],
    ['dailton', 'moon', 'felipe', 'venus', 'hard'],
    ['dailton', 'saturn', 'felipe', 'jupiter', 'hard'],
    ['dailton', 'mercury', 'felipe', 'mars', 'hard'],
    ['dailton', 'saturn', 'felipe', 'ascendant', 'hard'],
    ['dailton', 'moon', 'felipe', 'midheaven', 'soft'],
  ];
  // Solo wheels get that person's own tightest natal aspects, so the
  // tap-to-highlight interaction has something to reveal on every page.
  const soloPairs = [];
  if (persons.length === 1) {
    const who = persons[0];
    const pts = PEOPLE[who].points;
    const keys = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'ascendant', 'midheaven'];
    const found = [];
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const asp = aspectBetween(pts[keys[i]], pts[keys[j]], NATAL_ASPECT_ORBS);
        if (asp) found.push({ a: keys[i], b: keys[j], ...asp });
      }
    }
    found.sort((x, y) => x.orb - y.orb);
    for (const f of found.slice(0, 8)) {
      soloPairs.push([who, f.a, who, f.b, TONE_OF[f.name] === 'tense' ? 'hard' : 'soft']);
    }
  }
  for (const [pa, ka, pb, kb, kind] of persons.length === 2 ? pairs : soloPairs) {
    const [x1, y1] = polar(cx, cy, rInner, PEOPLE[pa].points[ka]);
    const [x2, y2] = polar(cx, cy, rInner, PEOPLE[pb].points[kb]);
    const style = kind === 'soft'
      ? 'stroke="rgba(232,196,118,0.5)" stroke-width="1.1"'
      : 'stroke="rgba(242,166,200,0.45)" stroke-width="1" stroke-dasharray="4 4"';
    s += `<line class="wheel-line" data-a="${pa}.${ka}" data-b="${pb}.${kb}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${style}/>`;
  }
  // plot points with a marker tick on the inner circle + glyph on the ring;
  // nudge stacked glyphs apart when they share a ring and sit close together
  let ptIndex = 0;
  const plot = (person, radius, color) => {
    const entries = Object.entries(PEOPLE[person].points).sort((a, b) => a[1] - b[1]);
    let prevLon = -999, stack = 0;
    for (const [key, lon] of entries) {
      stack = lon - prevLon < 9 ? stack + 1 : 0;
      prevLon = lon;
      const r = radius + stack * 18;
      const [x, y] = polar(cx, cy, r, lon);
      const [tx1, ty1] = polar(cx, cy, rInner, lon);
      const [tx2, ty2] = polar(cx, cy, rInner + 7, lon);
      s += `<line x1="${tx1}" y1="${ty1}" x2="${tx2}" y2="${ty2}" stroke="${color}" stroke-width="1.4" opacity="0.8"/>`;
      s += `<g class="wheel-pt" data-person="${person}" data-key="${key}" data-x="${x.toFixed(1)}" data-y="${y.toFixed(1)}" tabindex="0" role="button" style="--d:${(ptIndex++ * 45)}ms">
        <circle cx="${x}" cy="${y}" r="19" fill="transparent"/>
        <circle cx="${x}" cy="${y}" r="13.5" fill="rgba(11,10,30,0.72)"/>
        <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${key.length > 2 ? 11 : 19}" font-weight="700" fill="${color}">${PLANET_GLYPHS[key]}</text>
      </g>`;
    }
  };
  if (persons.includes('felipe')) plot('felipe', persons.length === 1 ? rDailton : rFelipe, '#f2a6c8');
  if (persons.includes('dailton')) plot('dailton', rDailton, '#e8c476');
  const centerLabel = persons.length === 2 ? 'D ♥ F' : (persons[0] === 'dailton' ? 'D' : 'F');
  s += `<text x="${cx}" y="${cy - 7}" text-anchor="middle" font-size="15" fill="rgba(243,239,255,0.7)" font-style="italic" style="font-family:Georgia,serif">${centerLabel}</text>`;
  s += `<text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="9.5" letter-spacing="2" fill="rgba(243,239,255,0.4)">ASTROLUA</text>`;
  s += '</svg>';
  return s;
}

function natalCardHTML(card) {
  return `<div class="card reveal">
    <h3>${card.title}</h3>
    ${card.lines.map(l => `<div class="natal-line"><span class="label">${l.label}</span><span class="text">${l.text}</span></div>`).join('')}
  </div>`;
}

function aspectCardHTML(a) {
  return `<div class="aspect-card reveal">
    <h3>${a.title}</h3>
    <span class="badge">${a.badge}</span>
    <p>${a.text}</p>
  </div>`;
}

// --- destiny score (couple compatibility-score + synastry-report) ---
function destinyScoreDialHTML(T, score) {
  const value = typeof score.value === 'number' ? score.value : null;
  const normalized = typeof score.normalized === 'number' ? score.normalized : null;
  const overall = apiText(typeof score.overall === 'string' ? score.overall.replace(/-/g, ' ') : null);
  const description = apiText(typeof score.description === 'string' ? score.description : null);
  if (value === null && normalized === null && !overall && !description) return '';

  const size = 160, cx = size / 2, cy = size / 2, r = 64, strokeW = 13;
  const circumference = 2 * Math.PI * r;
  let ringSVG = '';
  if (normalized !== null) {
    const pct = Math.max(0, Math.min(1, normalized));
    const offset = circumference * (1 - pct);
    ringSVG = `<circle class="ring-fill" cx="${cx}" cy="${cy}" r="${r}" stroke-width="${strokeW}"
        style="stroke-dasharray:${circumference.toFixed(2)}px; --circumference:${circumference.toFixed(2)}px; --offset:${offset.toFixed(2)}px;"/>`;
  }

  return `<div class="destiny-dial-wrap">
    <div class="destiny-dial">
      <svg class="score-ring" viewBox="0 0 ${size} ${size}" role="img" aria-label="${T.destiny.title}">
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="var(--gold)"/>
            <stop offset="100%" stop-color="var(--rose)"/>
          </linearGradient>
        </defs>
        <circle class="ring-track" cx="${cx}" cy="${cy}" r="${r}" stroke-width="${strokeW}"/>
        ${ringSVG}
      </svg>
      <div class="score-center">
        ${value !== null ? `<div class="score-value" data-countup="${value}">${value}</div>` : ''}
        ${overall ? `<div class="score-overall">${overall}</div>` : ''}
      </div>
    </div>
    <p class="score-caption-static">${T.destiny.scoreCaption}</p>
    ${description ? `<p class="score-caption">${description}</p>` : ''}
  </div>`;
}

function destinyHarmonyHTML(T, synastry) {
  const harmonyPct = typeof synastry.harmonyPct === 'number' ? synastry.harmonyPct : null;
  const tensionPct = typeof synastry.tensionPct === 'number' ? synastry.tensionPct : null;
  const dynamicType = apiText(typeof synastry.dynamicType === 'string' ? synastry.dynamicType.replace(/-/g, ' ') : null);
  const hasBar = harmonyPct !== null && tensionPct !== null;
  if (!hasBar && !dynamicType) return '';
  return `<div class="harmony-block">
    ${hasBar ? `
    <div class="harmony-bar">
      <div class="harmony-seg harmony-gold" style="--w:${harmonyPct}%"></div>
      <div class="harmony-seg harmony-rose" style="--w:${tensionPct}%"></div>
    </div>
    <div class="harmony-legend">
      <span><span class="dot gold"></span>${T.destiny.harmonyLabel} · <span data-countup="${harmonyPct}" data-suffix="%">${harmonyPct}%</span></span>
      <span><span class="dot rose"></span>${T.destiny.tensionLabel} · <span data-countup="${tensionPct}" data-suffix="%">${tensionPct}%</span></span>
    </div>` : ''}
    ${dynamicType ? `<p class="destiny-dynamic">${dynamicType}</p>` : ''}
  </div>`;
}

function destinyColsHTML(T, synastry) {
  const strengths = Array.isArray(synastry.topStrengths) ? synastry.topStrengths.slice(0, 6) : [];
  const challenges = Array.isArray(synastry.topChallenges) ? synastry.topChallenges.slice(0, 6) : [];
  if (!strengths.length && !challenges.length) return '';
  const strengthsCol = strengths.length ? `<div class="today-col destiny-col">
    <h4>${T.destiny.strengthsLabel}</h4>
    ${strengths.map(s => `<div class="destiny-row destiny-row-strength"><span class="destiny-marker">✦</span><span>${s}</span></div>`).join('')}
  </div>` : '';
  const challengesCol = challenges.length ? `<div class="today-col destiny-col">
    <h4>${T.destiny.challengesLabel}</h4>
    ${challenges.map(c => `<div class="destiny-row destiny-row-challenge"><span class="destiny-marker">☽</span><span>${c}</span></div>`).join('')}
  </div>` : '';
  return `<div class="today-cols destiny-cols">${strengthsCol}${challengesCol}</div>`;
}

function destinySectionHTML(T) {
  const couple = apiExtras?.couple;
  if (!couple) return '';
  const score = couple.score;
  const synastry = couple.synastry;
  if (!score && !synastry) return '';

  const dialHTML = score ? destinyScoreDialHTML(T, score) : '';
  const harmonyHTML = synastry ? destinyHarmonyHTML(T, synastry) : '';
  const colsHTML = synastry ? destinyColsHTML(T, synastry) : '';
  if (!dialHTML && !harmonyHTML && !colsHTML) return '';

  const updated = new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', { dateStyle: 'long' })
    .format(new Date(apiExtras.generatedAt));

  return `
      <section class="destiny">
        <h2 class="reveal">${T.destiny.title}</h2>
        <div class="sec-divider reveal" aria-hidden="true">✦</div>
        <p class="intro reveal">${T.destiny.intro}</p>
        <div class="today-sky reveal destiny-sky">
          ${dialHTML}
          ${harmonyHTML}
          ${colsHTML}
          <div class="updated-at">${T.weeklyUpdated} ${updated} · astrology-api.io</div>
        </div>
      </section>`;
}

// --- person-page API insights: love languages, flags, monthly, chapters, places ---
// Every field on apiExtras.person[who] may be absent — each helper below
// hides itself (returns '') the moment its own data isn't there.
function textFor(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const t = obj[lang] || obj.pt || obj.en;
  return typeof t === 'string' && t ? t : null;
}

// Same language fallback, but for values that are not strings (the newer
// endpoints return arrays of readings and scored areas).
function pickLang(obj) {
  if (!obj || typeof obj !== 'object') return null;
  return obj[lang] ?? obj.pt ?? obj.en ?? null;
}

function splitParagraphs(text) {
  return text
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(p => `<p>${p}</p>`)
    .join('');
}

function insightsSectionHTML(T, who) {
  const person = apiExtras?.person?.[who];
  if (!person) return '';
  const loveText = textFor(person.loveLanguages);
  const flagsText = textFor(person.flags);
  if (!loveText && !flagsText) return '';
  const loveCard = loveText ? `<div class="aspect-card reveal">
    <h3>${T.personApi.loveTitle}</h3>
    ${splitParagraphs(loveText)}
  </div>` : '';
  const flagsCard = flagsText ? `<div class="aspect-card reveal insight-flags">
    <h3>${T.personApi.flagsTitle}</h3>
    ${splitParagraphs(flagsText)}
  </div>` : '';
  return `
      <section class="insights">
        <h2 class="reveal">${T.personApi.sectionTitle}</h2>
        <div class="sec-divider reveal" aria-hidden="true">❋</div>
        <p class="intro reveal">${T.personApi.sectionIntro}</p>
        ${loveCard}
        ${flagsCard}
      </section>`;
}

function monthlySectionHTML(T, who) {
  if (!apiExtras) return '';
  const text = textFor(apiExtras.monthly?.[who]);
  if (!text) return '';
  const updated = new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', { dateStyle: 'long' })
    .format(new Date(apiExtras.generatedAt));
  return `
      <section class="monthly">
        <h2 class="reveal">${T.personApi.monthlyTitle}</h2>
        <div class="sec-divider reveal" aria-hidden="true">☉</div>
        <div class="today-sky reveal">
          <div class="today-cols"><div class="today-col"><p>${text}</p></div></div>
          <div class="updated-at">${T.weeklyUpdated} ${updated} · astrology-api.io</div>
        </div>
      </section>`;
}

// Formats a 'YYYY-MM-DD...' string to a localized date without crossing a
// timezone boundary; anything else is parsed as a best effort, and whatever
// can't be parsed at all is shown as-is.
function formatChapterDate(str) {
  if (typeof str !== 'string' || !str) return '';
  const dateFmt = new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', { dateStyle: 'medium' });
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? str : dateFmt.format(d);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? str : dateFmt.format(d);
}

function chapterRangeHTML(start, end) {
  const s = formatChapterDate(start);
  const e = formatChapterDate(end);
  if (s && e) return `<div class="chapter-range">${s} – ${e}</div>`;
  if (s || e) return `<div class="chapter-range">${s || e}</div>`;
  return '';
}

function chapterRowHTML(T, ch) {
  if (!ch || typeof ch !== 'object') return '';
  const level = typeof ch.level === 'string' && ch.level ? ch.level : '';
  const signKey = typeof ch.sign === 'string' ? ch.sign.toLowerCase() : '';
  const signLabel = signKey && T.signs[signKey] ? T.signs[signKey] : (typeof ch.sign === 'string' ? ch.sign : '');
  const rulerHTML = typeof ch.ruler === 'string' && ch.ruler ? ` <span class="chapter-ruler">(${ch.ruler})</span>` : '';
  const signLine = signLabel || rulerHTML ? `<div class="chapter-sign">${signLabel}${rulerHTML}</div>` : '';
  const rangeHTML = chapterRangeHTML(ch.start, ch.end);
  if (!signLine && !rangeHTML) return '';
  return `<div class="chapter-row">
    ${level ? `<span class="chapter-chip">${level}</span>` : ''}
    <div class="chapter-body">
      ${signLine}
      ${rangeHTML}
    </div>
  </div>`;
}

function chaptersSectionHTML(T, who) {
  const chapters = apiExtras?.person?.[who]?.chapters;
  if (!Array.isArray(chapters) || !chapters.length) return '';
  const rows = chapters.map(ch => chapterRowHTML(T, ch)).filter(Boolean).join('');
  if (!rows) return '';
  return `
      <section class="chapters">
        <h2 class="reveal">${T.personApi.chaptersTitle}</h2>
        <div class="sec-divider reveal" aria-hidden="true">⏳</div>
        <p class="intro reveal">${T.personApi.chaptersIntro}</p>
        <div class="chapters-list reveal">${rows}</div>
      </section>`;
}

// Strength values in the API response are arbitrary/unnormalized, so dots
// are computed relative to the strongest place in this person's own list.
function placeDotsHTML(strength, maxStrength) {
  if (typeof strength !== 'number' || !isFinite(strength) || !maxStrength) return '';
  const ratio = Math.max(0, strength / maxStrength);
  const dots = Math.min(5, Math.max(1, Math.round(ratio * 5)));
  return `<div class="place-dots" aria-hidden="true">${'●'.repeat(dots)}${'○'.repeat(5 - dots)}</div>`;
}

function placeChipHTML(p, maxStrength) {
  if (!p || typeof p !== 'object' || typeof p.name !== 'string' || !p.name) return '';
  const labelHTML = typeof p.label === 'string' && p.label ? `<div class="place-label">${p.label}</div>` : '';
  const dotsHTML = placeDotsHTML(p.strength, maxStrength);
  return `<div class="place-chip">
    <div class="place-name">${p.name}</div>
    ${labelHTML}
    ${dotsHTML}
  </div>`;
}

function placesSectionHTML(T, who) {
  const places = apiExtras?.person?.[who]?.places;
  if (!Array.isArray(places) || !places.length) return '';
  const strengths = places
    .map(p => (p && typeof p.strength === 'number' && isFinite(p.strength)) ? p.strength : null)
    .filter(v => v !== null);
  const maxStrength = strengths.length ? Math.max(...strengths) : 0;
  const chips = places.map(p => placeChipHTML(p, maxStrength)).filter(Boolean).join('');
  if (!chips) return '';
  return `
      <section class="places">
        <h2 class="reveal">${T.personApi.placesTitle}</h2>
        <div class="sec-divider reveal" aria-hidden="true">🧭</div>
        <p class="intro reveal">${T.personApi.placesIntro}</p>
        <div class="places-row reveal">${chips}</div>
      </section>`;
}

function staleNoteHTML(T, isStale) {
  if (!isStale || !apiExtras?.generatedAt) return '';
  const d = new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', { dateStyle: 'long' })
    .format(new Date(apiExtras.generatedAt));
  return `<div class="stale-note">${T.staleNote(d)}</div>`;
}

function weeklySectionHTML(T) {
  if (!apiExtras) return '';
  const cols = ['dailton', 'felipe'].map(who => {
    const text = apiExtras.weekly?.[who]?.[lang] || apiExtras.weekly?.[who]?.pt;
    if (!text) return '';
    return `<div class="today-col"><h4>${T.weeklyFor[who]}</h4><p>${text}</p></div>`;
  }).join('');
  if (!cols) return '';
  const updated = new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', { dateStyle: 'long' })
    .format(new Date(apiExtras.generatedAt));
  return `
      <section class="weekly">
        <h2 class="reveal">${T.weeklyTitle}</h2>
        <div class="sec-divider reveal" aria-hidden="true">☄</div>
        <p class="intro reveal">${T.weeklyIntro}</p>
        <div class="today-sky reveal">
          <div class="today-cols">${cols}</div>
          <div class="updated-at">${T.weeklyUpdated} ${updated} · astrology-api.io</div>
          ${staleNoteHTML(T, apiExtras.staleWeekly)}
        </div>
      </section>`;
}

// --- coming moons ---
function comingMoonsSectionHTML(T) {
  const now = new Date();
  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });

  const strip = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12, 0, 0);
    const phase = moonPhaseInfo(d);
    const today = i === 0;
    return `<div class="moon-day-cell${today ? ' today' : ''}" aria-hidden="true">
      <span class="mdc-weekday">${weekdayFmt.format(d)}</span>
      <span class="mdc-emoji">${MOON_EMOJI[phase.phase]}</span>
      <span class="mdc-num">${d.getDate()}</span>
    </div>`;
  }).join('');

  const nextNew = nextMoonPhaseSign(0, now);
  const nextFull = nextMoonPhaseSign(180, now);
  const fullDateFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'full' });

  const highlightCard = (emoji, label, when, line) => `
    <div class="card reveal moon-highlight">
      <div class="mh-emoji">${emoji}</div>
      <h4>${label}</h4>
      <div class="mh-date">${fullDateFmt.format(when.date)}</div>
      <div class="mh-sign">${T.signs[when.sign.key]}</div>
      <p>${line}</p>
    </div>`;

  return `
      <section class="moons">
        <h2 class="reveal">${T.moons.title}</h2>
        <div class="sec-divider reveal" aria-hidden="true">☽</div>
        <p class="intro reveal">${T.moons.intro}</p>
        <div class="today-sky reveal">
          <div class="moon-strip" aria-label="${T.moons.stripAria}">${strip}</div>
        </div>
        <div class="moon-highlights">
          ${highlightCard(MOON_EMOJI['new'], T.moons.nextNew, nextNew, T.moons.newLine)}
          ${highlightCard(MOON_EMOJI['full'], T.moons.nextFull, nextFull, T.moons.fullLine)}
        </div>
      </section>`;
}

function navHTML(T) {
  const link = key => `<a href="${PAGE_HREFS[key]}" class="${VIEW === key ? 'active' : ''}" ${VIEW === key ? 'aria-current="page"' : ''}>${T.nav[key]}</a>`;
  return `<nav class="site-nav" aria-label="Profiles">${link('us')}${link('dailton')}${link('felipe')}</nav>`;
}

// --- skip link ---
function skipLinkHTML(T) {
  return `<a class="skip-link" href="#content">${T.skipLink}</a>`;
}

// --- share button ---
const SHARE_ICON = `<svg class="icon-share" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.6" y1="10.6" x2="15.4" y2="6.4"></line><line x1="8.6" y1="13.4" x2="15.4" y2="17.6"></line></svg>`;
const SHARE_CHECK_ICON = `<svg class="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

function shareButtonHTML(T) {
  return `
    <button type="button" class="share-btn" id="share-btn" aria-label="${T.share.aria}">
      ${SHARE_ICON}${SHARE_CHECK_ICON}
    </button>
    <div class="share-toast" id="share-toast" role="status" aria-live="polite">${T.share.copied}</div>`;
}

// Icon swap is driven purely by the `.copied` class (see .share-btn .icon-*
// rules in styles.css) rather than the `hidden` attribute — SVGElement
// doesn't reliably reflect the `.hidden` IDL property in every engine.
let shareToastTimer = null;
function showShareCopied(btn) {
  const toast = document.getElementById('share-toast');
  btn.classList.add('copied');
  if (toast) toast.classList.add('visible');
  clearTimeout(shareToastTimer);
  shareToastTimer = setTimeout(() => {
    btn.classList.remove('copied');
    if (toast) toast.classList.remove('visible');
  }, 2200);
}

function personWeeklySectionHTML(T, who) {
  const weeklyText = apiExtras?.weekly?.[who]?.[lang] || apiExtras?.weekly?.[who]?.pt;
  if (!weeklyText) return '';
  const updated = new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', { dateStyle: 'long' })
    .format(new Date(apiExtras.generatedAt));
  return `
      <section class="weekly">
        <h2 class="reveal">${T.weeklyTitle}</h2>
        <div class="sec-divider reveal" aria-hidden="true">☄</div>
        <div class="today-sky reveal"><div class="today-cols"><div class="today-col"><p>${weeklyText}</p></div></div>
        <div class="updated-at">${T.weeklyUpdated} ${updated} · astrology-api.io</div>
        ${staleNoteHTML(T, apiExtras.staleWeekly)}</div>
      </section>`;
}

// API-driven sections render inside slots so late-arriving data fills them
// in place instead of re-rendering the whole page (which replayed every
// entrance animation and looked like a second page load).
const API_SLOTS = {
  destiny: T => destinySectionHTML(T),
  davison: T => davisonSectionHTML(T),
  compositeReadings: T => compositeReadingsSectionHTML(T),
  lifeAreas: T => lifeAreasSectionHTML(T),
  personReadings: T => personReadingsSectionHTML(T, VIEW),
  lots: T => lotsSectionHTML(T, VIEW),
  profection: T => profectionSectionHTML(T, VIEW),
  weekly: T => weeklySectionHTML(T),
  pweekly: T => personWeeklySectionHTML(T, VIEW),
  insights: T => insightsSectionHTML(T, VIEW),
  monthly: T => monthlySectionHTML(T, VIEW),
  chapters: T => chaptersSectionHTML(T, VIEW),
  places: T => placesSectionHTML(T, VIEW),
};

function fillApiSlots() {
  const T = t9();
  document.querySelectorAll('.api-slot').forEach(slot => {
    const fn = API_SLOTS[slot.dataset.slot];
    if (!fn) return;
    const html = fn(T) || '';
    if (slot.innerHTML.trim() !== html.trim()) {
      slot.innerHTML = html;
      numberSections();
      wireAnchors(slot);
      observeReveals(slot);
      wireWheels();
      wireSpotlights(slot);
      wireTableScroll(slot);
      buildJumpRail();
    }
  });
}

function personPageHTML(T, sky) {
  const who = VIEW; // 'dailton' | 'felipe'
  const card = who === 'dailton' ? T.dailtonCard : T.felipeCard;
  const birthLine = who === 'dailton' ? T.heroBirthDailton : T.heroBirthFelipe;
  const page = T.pages[who];
  const counts = elementCounts(PEOPLE[who].points);
  const dateFmt = new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', {
    dateStyle: 'full', timeStyle: 'short',
  }).format(sky.now);
  return `
    <main id="content" tabindex="-1">
      <header class="hero person-hero">
        <div class="hero-orbits" aria-hidden="true"><div class="ring"></div><div class="ring"></div><div class="ring"></div></div>
        <div class="kicker">${T.heroKicker}</div>
        <h1>${PEOPLE[who].name}</h1>
        <p class="tagline">${page.tagline}</p>
        <div class="births"><div>${who === 'dailton' ? '☀️' : '🌙'} <span>${birthLine}</span></div></div>
        ${birthdayChipHTML(T, who)}
        <div class="scroll-hint">${T.scrollHint}</div>
      </header>

      ${indexHTML(T, [
        { id: 'ch-1', ch: T.personChapters.one, items: [page.chartTitle, T.dominants.title, T.placements.title, T.natalAspects.title] },
        { id: 'ch-2', ch: T.personChapters.two, items: [T.numerology.personTitle, T.personApi.sectionTitle] },
        { id: 'ch-3', ch: T.personChapters.three, items: [T.todayTitleSolo, T.forecast.title, T.weeklyTitle] },
      ])}
      ${chapterHTML(T.personChapters.one, 'ch-1')}
      <section class="charts">
        <h2 class="reveal">${page.chartTitle}</h2>
        <div class="sec-divider reveal" aria-hidden="true">✦</div>
        <div class="charts-grid single">
          ${natalCardHTML(card)}
          <div class="card reveal">
            <h3>${T.elements.title}</h3>
            ${elementBarsHTML(counts, T)}
          </div>
        </div>
        <div class="wheel-wrap reveal">
          <div class="wheel-frame">${wheelSVG([who], T.pages[who].wheelAria)}</div>
        </div>
      </section>
${dominantsSectionHTML(T, who)}
${placementsSectionHTML(T, [who])}
${natalAspectsSectionHTML(T, who)}
<div class="api-slot" data-slot="lots">${lotsSectionHTML(T, who)}</div>
      ${chapterHTML(T.personChapters.two, 'ch-2')}
${personNumerologySectionHTML(T, who)}
<div class="api-slot" data-slot="insights">${insightsSectionHTML(T, who)}</div>
<div class="api-slot" data-slot="personReadings">${personReadingsSectionHTML(T, who)}</div>
      ${chapterHTML(T.personChapters.three, 'ch-3')}
<div class="api-slot" data-slot="profection">${profectionSectionHTML(T, who)}</div>
      <section class="today">
        <h2 class="reveal">${T.todayTitleSolo}</h2>
        <div class="sec-divider reveal" aria-hidden="true">✧</div>
        <p class="intro reveal">${T.todayIntroSolo}</p>
        <div class="today-sky reveal">
          <div class="today-head">
            <span class="moon-emoji">${MOON_EMOJI[sky.moonPhase.phase]}</span>
            <div class="today-moon-text">
              <div class="big">${T.todayMoonIn} ${T.signs[sky.moonSign.key]} · ${sky.moonSign.degree.toFixed(0)}°</div>
              <div class="small">${T.phases[sky.moonPhase.phase]} · ${(sky.moonPhase.illumination * 100).toFixed(0)}%</div>
            </div>
          </div>
          <div class="today-cols">
            <div class="today-col">
              <h4>${who === 'dailton' ? T.forDailton : T.forFelipe}</h4>
              ${transitBlock(sky[who])}
            </div>
          </div>
          ${skyNowHTML(T)}
          <div class="updated-at">${T.updatedAt} ${dateFmt}</div>
        </div>
      </section>
${forecastSectionHTML(T, [who])}
<div class="api-slot" data-slot="pweekly">${personWeeklySectionHTML(T, who)}</div>
<div class="api-slot" data-slot="monthly">${monthlySectionHTML(T, who)}</div>
<div class="api-slot" data-slot="chapters">${chaptersSectionHTML(T, who)}</div>
<div class="api-slot" data-slot="places">${placesSectionHTML(T, who)}</div>
      <p class="disclaimer">${T.disclaimer}</p>
      <footer>${T.footer} <span class="heart" role="button" tabindex="0" aria-label="${T.heartAria}">♥</span><div class="footer-moon">${MOON_EMOJI[sky.moonPhase.phase]} ${T.footerMoon(T.signs[sky.moonSign.key], T.phases[sky.moonPhase.phase])}</div></footer>
    </main>
  `;
}

function render() {
  const T = t9();
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
  document.title = VIEW === 'us' ? T.title : T.pages[VIEW].title;
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', VIEW === 'us' ? T.metaDescription : T.pages[VIEW].metaDescription);
  }
  const sky = todaySky();
  const dayOfYear = Math.floor((sky.now - new Date(sky.now.getFullYear(), 0, 0)) / 86400000);
  const note = T.loveNotes[dayOfYear % T.loveNotes.length];
  const mission = T.mission.items[dayOfYear % T.mission.items.length];
  const dateFmt = new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', {
    dateStyle: 'full', timeStyle: 'short',
  }).format(sky.now);

  const chrome = `
    <div class="lang-toggle" role="group" aria-label="Language">
      <button data-lang="pt" class="${lang === 'pt' ? 'active' : ''}" aria-pressed="${lang === 'pt'}">PT</button>
      <button data-lang="en" class="${lang === 'en' ? 'active' : ''}" aria-pressed="${lang === 'en'}">EN</button>
    </div>
    ${navHTML(T)}
    ${shareButtonHTML(T)}
    <div class="shooting-star" aria-hidden="true"></div>
    <div class="shooting-star s2" aria-hidden="true"></div>`;

  if (VIEW !== 'us') {
    document.getElementById('app').innerHTML = skipLinkHTML(T) + chrome + personPageHTML(T, sky);
    wireUp();
    return;
  }

  document.getElementById('app').innerHTML = skipLinkHTML(T) + chrome + `
    <main id="content" tabindex="-1">
      <header class="hero">
        <div class="hero-orbits" aria-hidden="true"><div class="ring"></div><div class="ring"></div><div class="ring"></div></div>
        <div class="kicker">${T.heroKicker}</div>
        <h1>${T.heroNames}</h1>
        <p class="tagline">${T.heroTagline}</p>
        <div class="births">
          <div>☀️ <span>${T.heroBirthDailton}</span></div>
          <div>🌙 <span>${T.heroBirthFelipe}</span></div>
        </div>
        <div class="scroll-hint">${T.scrollHint}</div>
      </header>

      ${indexHTML(T, [
        { id: 'ch-1', ch: T.chapters.one, items: [T.chartsTitle, T.elements.title, T.placements.title, T.numerology.title] },
        { id: 'ch-2', ch: T.chapters.two, items: [T.synastryTitle, T.destiny.title, T.meters.title, T.realTalkTitle] },
        { id: 'ch-3', ch: T.chapters.three, items: [T.composite.title, T.overlays.title] },
        { id: 'ch-4', ch: T.chapters.four, items: [T.todayTitle, T.moons.title, T.forecast.title, T.weeklyTitle] },
      ])}
      ${chapterHTML(T.chapters.one, 'ch-1')}
      <section class="charts">
        <h2 class="reveal">${T.chartsTitle}</h2>
        <div class="sec-divider reveal" aria-hidden="true">✦</div>
        <p class="intro reveal">${T.chartsIntro}</p>
        <div class="charts-grid">
          ${natalCardHTML(T.dailtonCard)}
          ${natalCardHTML(T.felipeCard)}
        </div>
        <div class="wheel-wrap reveal">
          <div class="wheel-frame">${wheelSVG(undefined, T.wheelAria)}</div>
          <div class="wheel-legend">
            <span><span class="dot" style="background:#e8c476"></span>Dailton</span>
            <span><span class="dot" style="background:#f2a6c8"></span>Felipe</span>
          </div>
        </div>
      </section>
${elementsSectionHTML(T)}
${placementsSectionHTML(T, ['dailton', 'felipe'])}
${numerologySectionHTML(T)}
      ${chapterHTML(T.chapters.two, 'ch-2')}
      <section class="synastry">
        <h2 class="reveal">${T.synastryTitle}</h2>
        <div class="sec-divider reveal" aria-hidden="true">❦</div>
        <p class="intro reveal">${T.synastryIntro}</p>
        ${Object.values(T.aspects).map(aspectCardHTML).join('')}
      </section>
<div class="api-slot" data-slot="destiny">${destinySectionHTML(T)}</div>
${metersSectionHTML(T)}
<div class="api-slot" data-slot="lifeAreas">${lifeAreasSectionHTML(T)}</div>
      <section class="real">
        <h2 class="reveal">${T.realTalkTitle}</h2>
        <div class="sec-divider reveal" aria-hidden="true">☾</div>
        <p class="intro reveal">${T.realTalkIntro}</p>
        ${Object.values(T.realAspects).map(aspectCardHTML).join('')}
      </section>
      ${chapterHTML(T.chapters.three, 'ch-3')}
${compositeSectionHTML(T)}
<div class="api-slot" data-slot="compositeReadings">${compositeReadingsSectionHTML(T)}</div>
${davisonSectionHTML(T)}
${overlaysSectionHTML(T)}
      ${chapterHTML(T.chapters.four, 'ch-4')}
      <section class="today">
        <h2 class="reveal">${T.todayTitle}</h2>
        <div class="sec-divider reveal" aria-hidden="true">✧</div>
        <p class="intro reveal">${T.todayIntro}</p>
        <div class="today-sky reveal">
          <div class="today-head">
            <span class="moon-emoji">${MOON_EMOJI[sky.moonPhase.phase]}</span>
            <div class="today-moon-text">
              <div class="big">${T.todayMoonIn} ${T.signs[sky.moonSign.key]} · ${sky.moonSign.degree.toFixed(0)}°</div>
              <div class="small">${T.phases[sky.moonPhase.phase]} · ${(sky.moonPhase.illumination * 100).toFixed(0)}%</div>
            </div>
          </div>
          <div class="today-cols">
            <div class="today-col">
              <h4>${T.forDailton}</h4>
              ${transitBlock(sky.dailton)}
            </div>
            <div class="today-col">
              <h4>${T.forFelipe}</h4>
              ${transitBlock(sky.felipe)}
            </div>
          </div>
          <div class="love-note">
            <div class="ln-label">${T.loveNoteLabel}</div>
            <blockquote>“${note}”</blockquote>
          </div>
          <div class="mission-block">
            <div class="mission-label">${T.mission.label}</div>
            <p class="mission-line">${mission}</p>
          </div>
          ${skyNowHTML(T)}
          <div class="updated-at">${T.updatedAt} ${dateFmt}</div>
        </div>
      </section>
${comingMoonsSectionHTML(T)}
${forecastSectionHTML(T, ['dailton', 'felipe'])}
<div class="api-slot" data-slot="weekly">${weeklySectionHTML(T)}</div>
      <p class="disclaimer">${T.disclaimer}</p>
      <footer>${T.footer} <span class="heart" role="button" tabindex="0" aria-label="${T.heartAria}">♥</span><div class="footer-moon">${MOON_EMOJI[sky.moonPhase.phase]} ${T.footerMoon(T.signs[sky.moonSign.key], T.phases[sky.moonPhase.phase])}</div></footer>
    </main>
  `;

  wireUp();
}

const ASPECT_SYMBOLS = { conjunction: '☌', sextile: '✶', square: '□', trine: '△', opposition: '☍' };
const ELEMENT_DOT = { fire: '#ff9e7d', earth: '#e8c476', air: '#a8c6f0', water: '#8fd0d9' };
const POINT_ORDER = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'ascendant', 'midheaven'];
const natalRetroCache = {};
function natalRetro(who) {
  if (!natalRetroCache[who]) natalRetroCache[who] = retrogradesAt(new Date(PEOPLE[who].birth.iso));
  return natalRetroCache[who];
}
function degMin(degree) {
  const d = Math.floor(degree);
  const m = Math.round((degree - d) * 60);
  return `${d}°${String(m).padStart(2, '0')}'`;
}
function stripArticle(name) {
  const n = name.replace(/^(o|a|the)\s/i, '');
  return n.charAt(0).toUpperCase() + n.slice(1);
}

// --- complete placements table ---
function placementsTableHTML(T, who) {
  const points = PEOPLE[who].points;
  const retro = natalRetro(who);
  const rows = POINT_ORDER.map(key => {
    const s = signOf(points[key]);
    const info = SIGN_INFO[s.index];
    const isAngle = key === 'ascendant' || key === 'midheaven';
    const house = key === 'ascendant' ? 1 : wholeSignHouse(points[key], points.ascendant);
    return `<tr>
      <td><span class="pl-glyph">${PLANET_GLYPHS[key]}</span> ${stripArticle(T.points[key])}${!isAngle && retro[key] ? ` <span class="retro-badge" title="${T.placements.retro}">℞</span>` : ''}</td>
      <td>${SIGN_GLYPHS[s.index]} ${T.signs[s.key]}</td>
      <td class="pl-deg">${degMin(s.degree)}</td>
      <td><span class="el-dot" style="background:${ELEMENT_DOT[info.element]}"></span>${T.elements.labels[info.element]}</td>
      <td class="pl-house">${house}</td>
    </tr>`;
  }).join('');
  return `<div class="placements-card reveal">
    <h3>${who === 'dailton' ? 'Dailton' : 'Felipe'}</h3>
    <div class="table-wrap"><div class="table-scroll"><table class="placements">
      <thead><tr><th>${T.placements.colPoint}</th><th>${T.placements.colSign}</th><th>${T.placements.colPos}</th><th>${T.placements.colElement}</th><th>${T.placements.colHouse}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div></div>
    <div class="scroll-hint-inline">${T.placements.scrollHint}</div>
  </div>`;
}
function placementsSectionHTML(T, persons) {
  return `
      <section class="placements-sec">
        <h2 class="reveal">${T.placements.title}</h2>
        <div class="sec-divider reveal" aria-hidden="true">✴</div>
        <p class="intro reveal">${T.placements.intro}</p>
        <div class="${persons.length === 2 ? 'placements-grid' : ''}">
          ${persons.map(w => placementsTableHTML(T, w)).join('')}
        </div>
      </section>`;
}

// --- chart dominants ---
function dominantsSectionHTML(T, who) {
  const points = PEOPLE[who].points;
  const signCounts = {};
  const modCounts = { cardinal: 0, fixed: 0, mutable: 0 };
  for (const key of ELEMENT_POINTS) {
    const s = signOf(points[key]);
    signCounts[s.index] = (signCounts[s.index] || 0) + 1;
    modCounts[SIGN_INFO[s.index].modality]++;
  }
  const domIdx = Number(Object.entries(signCounts).sort((a, b) => b[1] - a[1])[0][0]);
  const ascInfo = SIGN_INFO[signOf(points.ascendant).index];
  const rulerKey = ascInfo.ruler;
  const rulerSign = signOf(points[rulerKey]);
  const rulerHouse = wholeSignHouse(points[rulerKey], points.ascendant);
  const modBars = ['cardinal', 'fixed', 'mutable'].map(m => `
    <div class="element-bar">
      <span class="element-label">${T.dominants.modalities[m]} <em class="mod-hint">· ${T.dominants.modalityHint[m]}</em></span>
      <div class="element-track"><div class="element-fill earth" style="--fill-w:${(modCounts[m] / ELEMENT_POINTS.length * 100).toFixed(1)}%"></div></div>
      <span class="element-count" data-countup="${modCounts[m]}">${modCounts[m]}</span>
    </div>`).join('');
  return `
      <section class="dominants">
        <h2 class="reveal">${T.dominants.title}</h2>
        <div class="sec-divider reveal" aria-hidden="true">♛</div>
        <p class="intro reveal">${T.dominants.intro}</p>
        <div class="today-sky reveal">
          <div class="dominant-chips">
            <div class="dom-chip"><span class="dom-label">${T.dominants.signLabel}</span><span class="dom-value">${SIGN_GLYPHS[domIdx]} ${T.signs[SIGN_INFO[domIdx].key]}</span></div>
            <div class="dom-chip"><span class="dom-label">${T.dominants.rulerLabel}</span><span class="dom-value">${PLANET_GLYPHS[rulerKey]} ${stripArticle(T.points[rulerKey])} ${T.dominants.rulerIn} ${T.signs[rulerSign.key]} · ${T.placements.colHouse.toLowerCase()} ${rulerHouse}</span></div>
          </div>
          <div class="mod-bars">${modBars}</div>
        </div>
      </section>`;
}

// --- personal natal aspects ---
const NATAL_ASPECT_ORBS = [
  { name: 'conjunction', angle: 0, orb: 6 },
  { name: 'sextile', angle: 60, orb: 3 },
  { name: 'square', angle: 90, orb: 5 },
  { name: 'trine', angle: 120, orb: 5 },
  { name: 'opposition', angle: 180, orb: 6 },
];
function natalAspectsSectionHTML(T, who) {
  const points = PEOPLE[who].points;
  const keys = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  const found = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const asp = aspectBetween(points[keys[i]], points[keys[j]], NATAL_ASPECT_ORBS);
      if (asp) found.push({ a: keys[i], b: keys[j], ...asp });
    }
  }
  found.sort((x, y) => x.orb - y.orb);
  const top = found.slice(0, 6);
  if (!top.length) return '';
  const rows = top.map(f => {
    const tone = TONE_OF[f.name];
    return `<div class="naspect reveal">
      <span class="naspect-formula">${PLANET_GLYPHS[f.a]} ${ASPECT_SYMBOLS[f.name]} ${PLANET_GLYPHS[f.b]}</span>
      <span class="naspect-text"><strong>${stripArticle(T.points[f.a])} ${ASPECT_SYMBOLS[f.name]} ${stripArticle(T.points[f.b])}</strong> · ${degMin(f.orb)} — ${T.planetVibes[f.a]} ${lang === 'pt' ? 'e' : 'and'} ${T.planetVibes[f.b]} ${T.aspectTones[tone]}.</span>
    </div>`;
  }).join('');
  return `
      <section class="natal-aspects">
        <h2 class="reveal">${T.natalAspects.title}</h2>
        <div class="sec-divider reveal" aria-hidden="true">☍</div>
        <p class="intro reveal">${T.natalAspects.intro}</p>
        <div class="today-sky reveal">${rows}</div>
      </section>`;
}

// --- the sky right now (live strip) ---
function skyNowHTML(T) {
  const now = new Date();
  const lons = planetLongitudes(now);
  const retro = retrogradesAt(now);
  const chips = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].map(key => {
    const s = signOf(lons[key]);
    return `<div class="skynow-chip" title="${stripArticle(T.points[key])}">
      <span class="skynow-glyph">${PLANET_GLYPHS[key]}</span>
      <span class="skynow-sign">${SIGN_GLYPHS[s.index]} ${Math.floor(s.degree)}°${retro[key] ? '<span class="retro-badge">℞</span>' : ''}</span>
    </div>`;
  }).join('');
  return `<div class="skynow"><h4>${T.skyNow.title}</h4><div class="skynow-row">${chips}</div></div>`;
}

// --- upcoming exact transits ---
// --- Davison: the relationship's own birth moment and place ---
// Computed in chartData.js, so this section is always present.
function davisonSectionHTML(T) {
  const d = DAVISON;
  const when = new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
  }).format(new Date(d.iso));
  const ns = d.lat >= 0 ? 'N' : 'S', ew = d.lon >= 0 ? 'E' : 'W';
  const where = `${Math.abs(d.lat).toFixed(2)}°${ns}, ${Math.abs(d.lon).toFixed(2)}°${ew}`;
  const chips = [
    { label: T.davison.whenLabel, value: when },
    { label: T.davison.whereLabel, value: where },
  ].map(b => `<div class="dom-chip"><span class="dom-label">${b.label}</span><span class="dom-value">${b.value}</span></div>`).join('');

  const rows = ['sun', 'moon', 'venus', 'mars', 'ascendant'].map(k => {
    const sg = signOf(d.points[k]);
    return `<div class="naspect reveal">
      <span class="naspect-formula">${PLANET_GLYPHS[k]}</span>
      <span class="naspect-text"><strong>${stripArticle(T.points[k])}</strong> · ${T.signs[sg.key]} ${degMin(sg.degree)}</span>
    </div>`;
  }).join('');

  return `
      <section class="davison">
        <h2 class="reveal">${T.davison.title}</h2>
        <div class="sec-divider reveal" aria-hidden="true">◈</div>
        <p class="intro reveal">${T.davison.intro}</p>
        <div class="today-sky reveal">
          <div class="dominant-chips">${chips}</div>
          <p class="davison-poetic">${T.davison.poetic}</p>
          ${rows}
        </div>
      </section>`;
}

// --- Real per-area compatibility scores from the composite report ---
function lifeAreasSectionHTML(T) {
  const areas = pickLang(apiExtras?.couple?.lifeAreas);
  if (!Array.isArray(areas) || !areas.length) return '';
  const rows = areas.map(a => {
    const pct = Math.round(a.score * 100);
    return `<div class="meter-row">
      <span class="meter-label" ${a.description ? `title="${a.description.replace(/"/g, '&quot;')}"` : ''}>${a.area}</span>
      <div class="meter-track"><div class="meter-fill" style="--fill-w:${pct}%"></div></div>
      <span class="meter-pct"><span data-countup="${pct}" data-suffix="%">${pct}%</span></span>
    </div>`;
  }).join('');
  return `
      <section class="life-areas">
        <h2 class="reveal">${T.lifeAreas.title}</h2>
        <div class="sec-divider reveal" aria-hidden="true">⚖</div>
        <p class="intro reveal">${T.lifeAreas.intro}</p>
        <div class="today-sky reveal">${rows}</div>
      </section>`;
}

// --- Interpretation lists (composite + per person) ---
function readingsHTML(list) {
  return list.map(r => `<div class="aspect-card reveal">
    <h3>${r.title}</h3>
    <p>${r.text}</p>
  </div>`).join('');
}
function compositeReadingsSectionHTML(T) {
  const list = pickLang(apiExtras?.couple?.compositeReadings);
  if (!Array.isArray(list) || !list.length) return '';
  return `
      <section class="composite-readings">
        <h2 class="reveal">${T.compositeReport.title}</h2>
        <div class="sec-divider reveal" aria-hidden="true">☍</div>
        ${readingsHTML(list)}
      </section>`;
}
function personReadingsSectionHTML(T, who) {
  const list = pickLang(apiExtras?.person?.[who]?.readings);
  if (!Array.isArray(list) || !list.length) return '';
  return `
      <section class="person-readings">
        <h2 class="reveal">${T.personReadings.title}</h2>
        <div class="sec-divider reveal" aria-hidden="true">✵</div>
        <p class="intro reveal">${T.personReadings.intro}</p>
        ${readingsHTML(list)}
      </section>`;
}

// --- Composite interpretation supplied by the API ---
// --- Arabic Parts ---
function lotsSectionHTML(T, who) {
  const lots = apiExtras?.person?.[who]?.lots;
  if (!Array.isArray(lots) || !lots.length) return '';
  const rows = lots.map(l => {
    if (!l || typeof l.key !== 'string') return '';
    const name = T.lots.names[l.key] || l.key;
    const meaning = T.lots.meanings[l.key] || '';
    const sign = typeof l.sign === 'string' ? (T.signs[l.sign.toLowerCase()] || l.sign) : null;
    const deg = typeof l.degree === 'number' ? ` · ${Math.floor(l.degree)}°${String(Math.round((l.degree % 1) * 60)).padStart(2, '0')}'` : '';
    const house = typeof l.house === 'number' ? ` · ${T.placements.colHouse.toLowerCase()} ${l.house}` : '';
    return `<div class="naspect reveal">
      <span class="naspect-formula">⊗︎</span>
      <span class="naspect-text"><strong>${name}</strong>${sign ? ` · ${sign}${deg}${house}` : ''} — ${meaning}.</span>
    </div>`;
  }).filter(Boolean).join('');
  if (!rows) return '';
  return `
      <section class="lots">
        <h2 class="reveal">${T.lots.title}</h2>
        <div class="sec-divider reveal" aria-hidden="true">⊗</div>
        <p class="intro reveal">${T.lots.intro}</p>
        <div class="today-sky reveal">${rows}</div>
      </section>`;
}

// --- Annual profection ---
function profectionSectionHTML(T, who) {
  const p = apiExtras?.person?.[who]?.profection;
  if (!p || (typeof p.house !== 'number' && !p.ruler)) return '';
  const chips = [];
  if (typeof p.house === 'number') {
    const theme = T.profection.houseThemes[p.house];
    chips.push({ label: T.profection.houseLabel, value: `${p.house}${theme ? ` · ${theme}` : ''}` });
  }
  if (p.ruler && T.points[p.ruler]) {
    chips.push({ label: T.profection.rulerLabel, value: `${PLANET_GLYPHS[p.ruler] || ''} ${stripArticle(T.points[p.ruler])}` });
  }
  if (p.sign && T.signs[p.sign]) chips.push({ label: T.profection.signLabel, value: T.signs[p.sign] });
  if (typeof p.age === 'number') chips.push({ label: T.profection.ageLabel, value: String(p.age) });
  const themes = Array.isArray(p.themes) && p.themes.length
    ? `<p class="profection-themes">${p.themes.join(' · ')}</p>` : '';
  return `
      <section class="profection">
        <h2 class="reveal">${T.profection.title}</h2>
        <div class="sec-divider reveal" aria-hidden="true">⟳</div>
        <p class="intro reveal">${T.profection.intro}</p>
        <div class="today-sky reveal">
          <div class="dominant-chips">${chips.map(c => `<div class="dom-chip"><span class="dom-label">${c.label}</span><span class="dom-value">${c.value}</span></div>`).join('')}</div>
          ${themes}
          ${p.text ? `<p>${p.text}</p>` : ''}
        </div>
      </section>`;
}

function forecastListHTML(T, who, limit) {
  const p = PEOPLE[who].points;
  const events = upcomingTransits({ sun: p.sun, moon: p.moon, venus: p.venus, ascendant: p.ascendant }, new Date(), 16)
    .slice(0, limit);
  if (!events.length) return `<p>${T.forecast.empty}</p>`;
  const fmt = new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', { day: 'numeric', month: 'long' });
  return `<div class="forecast-list">` + events.map(e => `
    <div class="forecast-row">
      <span class="forecast-date">${fmt.format(e.date)}</span>
      <span class="forecast-what">${PLANET_GLYPHS[e.body]} ${stripArticle(T.points[e.body])} ${ASPECT_SYMBOLS[e.aspect]} ${T.points[e.point]}</span>
    </div>`).join('') + `</div>`;
}
function forecastSectionHTML(T, persons) {
  const cols = persons.map(w => `<div class="today-col"><h4>${w === 'dailton' ? T.forDailton : T.forFelipe}</h4>${forecastListHTML(T, w, persons.length === 2 ? 4 : 6)}</div>`).join('');
  return `
      <section class="forecast">
        <h2 class="reveal">${T.forecast.title}</h2>
        <div class="sec-divider reveal" aria-hidden="true">☄</div>
        <p class="intro reveal">${T.forecast.intro}</p>
        <div class="today-sky reveal"><div class="today-cols">${cols}</div></div>
      </section>`;
}

// --- chemistry meters by life area ---
function metersSectionHTML(T) {
  const keys = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  const cats = {
    love: k => k === 'venus' || k === 'moon',
    mind: k => k === 'mercury',
    spark: k => k === 'sun' || k === 'mars',
    growth: k => k === 'jupiter' || k === 'saturn',
  };
  const tallies = { love: { h: 0, t: 0 }, mind: { h: 0, t: 0 }, spark: { h: 0, t: 0 }, growth: { h: 0, t: 0 } };
  for (const ka of keys) {
    for (const kb of keys) {
      const asp = aspectBetween(PEOPLE.dailton.points[ka], PEOPLE.felipe.points[kb]);
      if (!asp) continue;
      const tone = TONE_OF[asp.name];
      const w = tone === 'harmonious' ? { h: 1, t: 0 } : tone === 'tense' ? { h: 0, t: 1 } : { h: 0.5, t: 0.5 };
      for (const [cat, test] of Object.entries(cats)) {
        if (test(ka) || test(kb)) { tallies[cat].h += w.h; tallies[cat].t += w.t; }
      }
    }
  }
  const rows = Object.entries(tallies).map(([cat, v]) => {
    const total = v.h + v.t;
    const pct = total ? Math.round((v.h / total) * 100) : 50;
    return `<div class="meter-row">
      <span class="meter-label">${T.meters.cats[cat]}</span>
      <div class="meter-track"><div class="meter-fill" style="--fill-w:${pct}%"></div></div>
      <span class="meter-pct"><span data-countup="${pct}" data-suffix="%">${pct}%</span></span>
    </div>`;
  }).join('');
  return `
      <section class="meters">
        <h2 class="reveal">${T.meters.title}</h2>
        <div class="sec-divider reveal" aria-hidden="true">⚗</div>
        <p class="intro reveal">${T.meters.intro}</p>
        <div class="today-sky reveal">
          ${rows}
          <div class="meter-legend"><span>← ${T.meters.works}</span><span>${T.meters.flows} →</span></div>
        </div>
      </section>`;
}

// --- birthday countdown chip ---
function birthdayChipHTML(T, who) {
  const birth = new Date(PEOPLE[who].birth.iso);
  const now = new Date();
  let next = new Date(now.getFullYear(), birth.getUTCMonth(), birth.getUTCDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (next < today) next = new Date(now.getFullYear() + 1, birth.getUTCMonth(), birth.getUTCDate());
  const days = Math.round((next - today) / 86400000);
  return `<div class="birthday-chip">${T.birthdayChip(who === 'dailton' ? 'Dailton' : 'Felipe', days)}</div>`;
}

function pointLabel(person, key) {
  const T = t9();
  const lon = PEOPLE[person].points[key];
  const s = signOf(lon);
  const deg = Math.floor(s.degree);
  const min = Math.round((s.degree - deg) * 60);
  const name = T.points[key].replace(/^(o|a)\s/i, '');
  const personName = person === 'dailton' ? 'Dailton' : 'Felipe';
  return `${personName} · ${name.charAt(0).toUpperCase() + name.slice(1)} · ${T.signs[s.key]} ${deg}°${String(min).padStart(2, '0')}'`;
}

function wireWheels() {
  document.querySelectorAll('.wheel-frame').forEach(frame => {
    if (frame.querySelector('.wheel-tip')) return;
    const tip = document.createElement('div');
    tip.className = 'wheel-tip';
    frame.appendChild(tip);
    const svg = frame.querySelector('svg');
    if (!svg) return;
    const lines = [...frame.querySelectorAll('.wheel-line')];
    const pts = [...frame.querySelectorAll('.wheel-pt')];
    let active = null;
    const clear = () => {
      active = null;
      frame.classList.remove('focus');
      tip.classList.remove('show');
      lines.forEach(l => l.classList.remove('lit'));
      pts.forEach(p => p.classList.remove('lit'));
    };
    const activate = (pt) => {
      const id = pt.dataset.person + '.' + pt.dataset.key;
      if (active === id) { clear(); return; }
      active = id;
      frame.classList.add('focus');
      pts.forEach(p => p.classList.toggle('lit', p === pt));
      lines.forEach(l => {
        const lit = l.dataset.a === id || l.dataset.b === id;
        l.classList.toggle('lit', lit);
        if (lit) {
          const other = l.dataset.a === id ? l.dataset.b : l.dataset.a;
          const [op, ok] = other.split('.');
          document.querySelectorAll(`.wheel-pt[data-person="${op}"][data-key="${ok}"]`).forEach(p => {
            if (frame.contains(p)) p.classList.add('lit');
          });
        }
      });
      tip.textContent = pointLabel(pt.dataset.person, pt.dataset.key);
      const vb = svg.viewBox.baseVal;
      const rect = svg.getBoundingClientRect();
      const px = (Number(pt.dataset.x) / vb.width) * rect.width;
      const py = (Number(pt.dataset.y) / vb.height) * rect.height;
      tip.style.left = `${px}px`;
      tip.style.top = `${py - 30}px`;
      tip.classList.add('show');
    };
    // On touch screens the browser fires pointerenter and then click for the
    // same tap; without the timestamp guard the click would immediately toggle
    // the highlight back off.
    let lastActivate = 0;
    const guardedActivate = (el, toggle) => {
      const id = el.dataset.sign !== undefined ? 'sign.' + el.dataset.sign : el.dataset.person + '.' + el.dataset.key;
      if (toggle && active === id && performance.now() - lastActivate < 400) return;
      lastActivate = performance.now();
      if (el.dataset.sign !== undefined) activateSign(el); else activate(el);
    };
    const activateSign = (g) => {
      const idx = Number(g.dataset.sign);
      const id = 'sign.' + idx;
      if (active === id) { clear(); return; }
      clear();
      active = id;
      const T = t9();
      const info = SIGN_INFO[idx];
      tip.textContent = `${T.signs[info.key]} · ${T.elements.labels[info.element]} · ${T.signMeta.modalities[info.modality]} · ${T.signMeta.rulerPrefix} ${stripArticle(T.points[info.ruler])}`;
      const vb = svg.viewBox.baseVal;
      const rect = svg.getBoundingClientRect();
      tip.style.left = `${(Number(g.dataset.x) / vb.width) * rect.width}px`;
      tip.style.top = `${(Number(g.dataset.y) / vb.height) * rect.height - 30}px`;
      tip.classList.add('show');
    };
    pts.forEach(pt => {
      pt.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') guardedActivate(pt, false); });
      pt.addEventListener('focus', () => guardedActivate(pt, false));
      pt.addEventListener('click', (e) => { e.stopPropagation(); guardedActivate(pt, true); });
      pt.addEventListener('blur', clear);
    });
    frame.querySelectorAll('.zodiac-glyph').forEach(g => {
      g.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') guardedActivate(g, false); });
      g.addEventListener('focus', () => guardedActivate(g, false));
      g.addEventListener('click', (e) => { e.stopPropagation(); guardedActivate(g, true); });
      g.addEventListener('blur', clear);
    });
    svg.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') clear(); });
    document.addEventListener('click', (e) => { if (!frame.contains(e.target)) clear(); });
  });
}

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function runCountUps(root) {
  root.querySelectorAll('[data-countup]').forEach(el => {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const target = Number(el.dataset.countup);
    const suffix = el.dataset.suffix || '';
    const decimals = (el.dataset.countup.split('.')[1] || '').length;
    // The true value is already in the DOM (server-truth first). Only animate
    // when motion is welcome; otherwise leave the correct text untouched.
    if (!isFinite(target) || REDUCED_MOTION) return;
    const dur = 1100;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = el.dataset.countup + suffix;
    };
    requestAnimationFrame(tick);
  });
}

// ---- section jump rail: dots that map to each section, with live position ----
// Number sections 01, 02… restarting at each chapter opener. Done here
// rather than with CSS counters, whose sibling-scope rules proved
// unreliable once chapter dividers sat between the sections.
function numberSections() {
  const main = document.querySelector('main');
  if (!main) return;
  let n = 0;
  const number = section => {
    const h2 = section.querySelector(':scope > h2');
    if (!h2) return;
    n += 1;
    h2.setAttribute('data-num', String(n).padStart(2, '0'));
  };
  // API-driven sections sit inside .api-slot wrappers, so walk children and
  // reach one level in rather than matching only direct <section> kids.
  for (const el of main.children) {
    if (el.classList.contains('chapter-open')) { n = 0; continue; }
    if (el.tagName === 'SECTION') { number(el); continue; }
    if (el.classList.contains('api-slot')) {
      el.querySelectorAll(':scope > section').forEach(number);
    }
  }
}

// Jumping to a target while later sections are still un-rendered lands short,
// because their heights are only estimates until they paint. Scroll, let the
// layout settle, then correct.
const SCROLL_MARGIN = 72; // clears the fixed top nav
function scrollToTarget(el) {
  if (!el) return;
  const behavior = REDUCED_MOTION ? 'auto' : 'smooth';
  el.scrollIntoView({ behavior, block: 'start' });

  // Correcting while the smooth scroll is still running just fights it, so
  // wait for the scroll to go idle, then snap to the settled position.
  let idleTimer = null;
  let tries = 0;
  const finish = () => {
    removeEventListener('scroll', onScroll);
    const correct = () => {
      const top = el.getBoundingClientRect().top - SCROLL_MARGIN;
      if (Math.abs(top) > 4 && tries++ < 8) {
        scrollBy({ top, behavior: 'auto' });
        requestAnimationFrame(correct);
      }
    };
    requestAnimationFrame(correct);
  };
  const onScroll = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(finish, 120);
  };
  addEventListener('scroll', onScroll, { passive: true });
  idleTimer = setTimeout(finish, 700); // in case no scroll event ever fires
}

function wireAnchors(root) {
  root.querySelectorAll('a[href^="#"]').forEach(a => {
    if (a.dataset.anchored) return;
    a.dataset.anchored = '1';
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      history.replaceState(null, '', id);
      scrollToTarget(target);
    });
  });
}

function buildJumpRail() {
  document.querySelector('.jump-rail')?.remove();
  const sections = [...document.querySelectorAll('main section')].filter(s => s.querySelector('h2'));
  if (sections.length < 4) return;
  const rail = document.createElement('nav');
  rail.className = 'jump-rail';
  rail.setAttribute('aria-label', t9().jumpRailAria);
  sections.forEach((sec, i) => {
    if (!sec.id) sec.id = 'sec-' + (i + 1);
    const b = document.createElement('button');
    b.type = 'button';
    const label = sec.querySelector('h2').textContent.trim();
    b.dataset.label = label;
    b.setAttribute('aria-label', label);
    b.addEventListener('click', () => scrollToTarget(sec));
    rail.appendChild(b);
  });
  document.body.appendChild(rail);
  const dots = [...rail.children];
  const spy = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const idx = sections.indexOf(e.target);
      dots.forEach((d, i) => d.classList.toggle('current', i === idx));
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => spy.observe(s));
}

// ---- fade the table's right edge away once it's scrolled to the end ----
function wireTableScroll(root) {
  root.querySelectorAll('.table-wrap').forEach(wrap => {
    const scroller = wrap.querySelector('.table-scroll');
    if (!scroller || scroller.dataset.wired) return;
    scroller.dataset.wired = '1';
    const update = () => {
      const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2;
      const noOverflow = scroller.scrollWidth <= scroller.clientWidth + 1;
      wrap.classList.toggle('scrolled-end', atEnd || noOverflow);
    };
    scroller.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update, { passive: true });
    update();
  });
}

// content-visibility means section heights firm up only as they render, so a
// fast scroll can move elements out from under the observer before it fires.
// This sweep is the safety net: anything at or above the fold that is still
// hidden gets revealed. It only ever walks the shrinking set of stragglers.
let pendingReveals = new Set();
let sweepQueued = false;
function sweepReveals() {
  sweepQueued = false;
  if (!pendingReveals.size) return;
  const limit = window.innerHeight * 1.15;
  for (const el of [...pendingReveals]) {
    if (!el.isConnected) { pendingReveals.delete(el); continue; }
    if (el.getBoundingClientRect().top < limit) {
      el.classList.add('visible');
      runCountUps(el);
      pendingReveals.delete(el);
    }
  }
}
addEventListener('scroll', () => {
  if (sweepQueued || !pendingReveals.size) return;
  sweepQueued = true;
  requestAnimationFrame(sweepReveals);
}, { passive: true });

function observeReveals(root) {
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        runCountUps(e.target);
        pendingReveals.delete(e.target);
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.08 });
  root.querySelectorAll('.reveal').forEach(el => {
    if (!el.classList.contains('visible')) pendingReveals.add(el);
    io.observe(el);
  });
  sweepReveals();
}

// Wrap each headline word so it can rise, unblur and settle on its own beat.
// A chapter opener: numeral, title, epigraph. Purely editorial furniture —
// it carries no data, so it is aria-hidden from the section outline and the
// real <h2>s inside each chapter remain the document structure.
function chapterHTML(ch, id) {
  return `
      <div class="chapter-open reveal" id="${id}">
        <div class="chapter-rule" aria-hidden="true"></div>
        <div class="chapter-numeral" aria-hidden="true">${ch.numeral}</div>
        <h2 class="chapter-title">${ch.title}</h2>
        <p class="chapter-epigraph">${ch.epigraph}</p>
      </div>`;
}

// The opening index: every chapter with the sections it holds, each a link.
function indexHTML(T, chapters) {
  const rows = chapters.map(c => `
    <li class="index-row">
      <a href="#${c.id}">
        <span class="index-numeral">${c.ch.numeral}</span>
        <span class="index-body">
          <span class="index-title">${c.ch.title}</span>
          <span class="index-items">${c.items.join(' · ')}</span>
        </span>
      </a>
    </li>`).join('');
  return `
      <nav class="index-card reveal" aria-label="${T.indexLabel}">
        <div class="index-label">${T.indexLabel}</div>
        <p class="index-intro">${T.indexIntro}</p>
        <ol class="index-list">${rows}</ol>
      </nav>`;
}

function splitHeadline() {
  const h1 = document.querySelector('.hero h1');
  if (!h1 || h1.dataset.split) return;
  const words = h1.textContent.trim().split(/\s+/);
  h1.dataset.split = '1';
  h1.innerHTML = words
    .map((w, i) => `<span class="w" style="--i:${i}">${w}</span>`)
    .join(' ');
}

// A soft light that tracks the pointer across each card.
const HAS_HOVER = window.matchMedia('(hover: hover)').matches;
function wireSpotlights(root) {
  if (!HAS_HOVER) return; // no pointer to follow — skip the listeners entirely
  const cards = root.querySelectorAll('.card, .aspect-card, .placements-card, .today-sky');
  cards.forEach(card => {
    if (card.dataset.spot) return;
    card.dataset.spot = '1';
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
  });
}

function wireUp() {
  document.querySelectorAll('.lang-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      lang = btn.dataset.lang;
      localStorage.setItem('astrolua-lang', lang);
      render();
    });
  });

  splitHeadline();
  numberSections();
  wireAnchors(document);
  observeReveals(document);
  wireWheels();
  wireSpotlights(document);
  wireTableScroll(document);
  buildJumpRail();

  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const url = window.location.href;
      const shareData = { title: document.title, url };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return; // user cancelled — no toast
          // otherwise fall through to the clipboard fallback below
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        showShareCopied(shareBtn);
      } catch { /* clipboard blocked — silently ignore */ }
    });
  }

  document.querySelectorAll('footer .heart').forEach(heart => {
    heart.addEventListener('click', (e) => heartBurst(e.clientX, e.clientY));
    heart.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        const rect = heart.getBoundingClientRect();
        heartBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    });
  });
}

// --- heart burst ---
const BURST_COUNT = 14;
const BURST_COLORS = ['var(--rose)', 'var(--gold)', '#ffffff'];
const BURST_MAX_NODES = 60;

function heartBurst(x, y) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return; // the footer heart already carries a subtle static/pulse look — no extra motion
  }
  // Guard against rapid re-clicks piling up nodes: trim the oldest before adding more.
  const existing = document.querySelectorAll('.burst-heart');
  const overflow = existing.length + BURST_COUNT - BURST_MAX_NODES;
  for (let i = 0; i < overflow; i++) {
    if (existing[i]) existing[i].remove();
  }

  for (let i = 0; i < BURST_COUNT; i++) {
    const span = document.createElement('span');
    span.className = 'burst-heart';
    span.textContent = '♥';
    span.setAttribute('aria-hidden', 'true');

    const dx = (Math.random() - 0.5) * 140;
    const dy = -(70 + Math.random() * 110);
    const size = 10 + Math.random() * 16;
    const color = BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)];
    const duration = 0.8 + Math.random() * 0.7;
    const delay = Math.random() * 0.12;

    span.style.left = `${x}px`;
    span.style.top = `${y}px`;
    span.style.setProperty('--dx', `${dx}px`);
    span.style.setProperty('--dy', `${dy}px`);
    span.style.fontSize = `${size}px`;
    span.style.color = color;
    span.style.opacity = (0.55 + Math.random() * 0.45).toFixed(2);
    span.style.animationDuration = `${duration}s`;
    span.style.animationDelay = `${delay}s`;

    document.body.appendChild(span);
    const cleanup = () => span.remove();
    span.addEventListener('animationend', cleanup);
    // Safety net in case animationend doesn't fire (e.g. tab backgrounded).
    setTimeout(cleanup, (duration + delay) * 1000 + 400);
  }
}

// Prefetch the sibling pages so tab switches feel instant.
for (const [key, href] of Object.entries(PAGE_HREFS)) {
  if (key === VIEW) continue;
  const l = document.createElement('link');
  l.rel = 'prefetch';
  l.as = 'document';
  l.href = href;
  document.head.appendChild(l);
}

// Atmosphere: drifting aurora field + film grain. Purely decorative, so it
// lives outside #app and is never touched by render().
(function mountAtmosphere() {
  const atmo = document.createElement('div');
  atmo.className = 'atmosphere';
  atmo.setAttribute('aria-hidden', 'true');
  atmo.innerHTML = '<div class="aurora aurora-1"></div><div class="aurora aurora-2"></div><div class="aurora aurora-3"></div>';
  document.body.appendChild(atmo);
  const grain = document.createElement('div');
  grain.className = 'grain';
  grain.setAttribute('aria-hidden', 'true');
  document.body.appendChild(grain);
})();

// Subtle sky tint by local time of day.
const hour = new Date().getHours();
document.documentElement.dataset.daypart =
  hour >= 5 && hour < 10 ? 'dawn' : hour >= 10 && hour < 17 ? 'day' : hour >= 17 && hour < 20 ? 'dusk' : 'night';

// Reading-progress bar.
const progress = document.createElement('div');
progress.id = 'progress';
progress.setAttribute('aria-hidden', 'true');
document.body.appendChild(progress);
let progressTick = false;
addEventListener('scroll', () => {
  if (progressTick) return;
  progressTick = true;
  requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    progressTick = false;
  });
}, { passive: true });

initStarfield();
render();
loadApiExtras();
// Re-render at local midnight so an open tab rolls over to the new day's sky.
(function scheduleMidnight() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  setTimeout(() => { render(); scheduleMidnight(); }, midnight - now);
})();

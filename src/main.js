import './styles.css';
import { signOf, planetLongitudes, aspectBetween, moonPhaseInfo, nextMoonPhaseSign, wholeSignHouse } from './astro.js';
import { PEOPLE } from './chartData.js';
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
    if (ageDays >= 12) delete data.weekly;
    if (ageDays >= 45) delete data.monthly;
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
      <span class="element-count">${count}</span>
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
    s += `<text x="${gx}" y="${gy}" text-anchor="middle" dominant-baseline="central" font-size="17" fill="rgba(232,196,118,0.85)" style="font-family:serif">${SIGN_GLYPHS[i]}</text>`;
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
    ['dailton', 'pluto', 'felipe', 'ascendant', 'hard'],
  ];
  for (const [pa, ka, pb, kb, kind] of persons.length === 2 ? pairs : []) {
    const [x1, y1] = polar(cx, cy, rInner, PEOPLE[pa].points[ka]);
    const [x2, y2] = polar(cx, cy, rInner, PEOPLE[pb].points[kb]);
    const style = kind === 'soft'
      ? 'stroke="rgba(232,196,118,0.5)" stroke-width="1.1"'
      : 'stroke="rgba(242,166,200,0.45)" stroke-width="1" stroke-dasharray="4 4"';
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${style}/>`;
  }
  // plot points with a marker tick on the inner circle + glyph on the ring;
  // nudge stacked glyphs apart when they share a ring and sit close together
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
      s += `<circle cx="${x}" cy="${y}" r="11.5" fill="rgba(11,10,30,0.72)"/>`;
      s += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${key.length > 2 ? 11 : 19}" font-weight="700" fill="${color}">${PLANET_GLYPHS[key]}</text>`;
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
  const overall = typeof score.overall === 'string' ? score.overall.replace(/-/g, ' ') : null;
  const description = typeof score.description === 'string' ? score.description : null;
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
        ${value !== null ? `<div class="score-value">${value}</div>` : ''}
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
  const dynamicType = typeof synastry.dynamicType === 'string' ? synastry.dynamicType.replace(/-/g, ' ') : null;
  const hasBar = harmonyPct !== null && tensionPct !== null;
  if (!hasBar && !dynamicType) return '';
  return `<div class="harmony-block">
    ${hasBar ? `
    <div class="harmony-bar">
      <div class="harmony-seg harmony-gold" style="--w:${harmonyPct}%"></div>
      <div class="harmony-seg harmony-rose" style="--w:${tensionPct}%"></div>
    </div>
    <div class="harmony-legend">
      <span><span class="dot gold"></span>${T.destiny.harmonyLabel} · ${harmonyPct}%</span>
      <span><span class="dot rose"></span>${T.destiny.tensionLabel} · ${tensionPct}%</span>
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
        <div class="updated-at">${T.weeklyUpdated} ${updated} · astrology-api.io</div></div>
      </section>`;
}

// API-driven sections render inside slots so late-arriving data fills them
// in place instead of re-rendering the whole page (which replayed every
// entrance animation and looked like a second page load).
const API_SLOTS = {
  destiny: T => destinySectionHTML(T),
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
      observeReveals(slot);
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
        <div class="kicker">${T.heroKicker}</div>
        <h1>${PEOPLE[who].name}</h1>
        <p class="tagline">${page.tagline}</p>
        <div class="births"><div>${who === 'dailton' ? '☀️' : '🌙'} <span>${birthLine}</span></div></div>
        <div class="scroll-hint">${T.scrollHint}</div>
      </header>

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
${personNumerologySectionHTML(T, who)}
<div class="api-slot" data-slot="insights">${insightsSectionHTML(T, who)}</div>
      <section class="today">
        <h2 class="reveal">${T.todayTitle}</h2>
        <div class="sec-divider reveal" aria-hidden="true">✧</div>
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
          <div class="updated-at">${T.updatedAt} ${dateFmt}</div>
        </div>
      </section>
<div class="api-slot" data-slot="pweekly">${personWeeklySectionHTML(T, who)}</div>
<div class="api-slot" data-slot="monthly">${monthlySectionHTML(T, who)}</div>
<div class="api-slot" data-slot="chapters">${chaptersSectionHTML(T, who)}</div>
<div class="api-slot" data-slot="places">${placesSectionHTML(T, who)}</div>
      <p class="disclaimer">${T.disclaimer}</p>
      <footer>${T.footer} <span class="heart" role="button" tabindex="0" aria-label="${T.heartAria}">♥</span></footer>
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
        <div class="kicker">${T.heroKicker}</div>
        <h1>${T.heroNames}</h1>
        <p class="tagline">${T.heroTagline}</p>
        <div class="births">
          <div>☀️ <span>${T.heroBirthDailton}</span></div>
          <div>🌙 <span>${T.heroBirthFelipe}</span></div>
        </div>
        <div class="scroll-hint">${T.scrollHint}</div>
      </header>

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
${numerologySectionHTML(T)}
      <section class="synastry">
        <h2 class="reveal">${T.synastryTitle}</h2>
        <div class="sec-divider reveal" aria-hidden="true">❦</div>
        <p class="intro reveal">${T.synastryIntro}</p>
        ${Object.values(T.aspects).map(aspectCardHTML).join('')}
      </section>
<div class="api-slot" data-slot="destiny">${destinySectionHTML(T)}</div>
      <section class="real">
        <h2 class="reveal">${T.realTalkTitle}</h2>
        <div class="sec-divider reveal" aria-hidden="true">☾</div>
        <p class="intro reveal">${T.realTalkIntro}</p>
        ${Object.values(T.realAspects).map(aspectCardHTML).join('')}
      </section>
${compositeSectionHTML(T)}
${overlaysSectionHTML(T)}
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
          <div class="updated-at">${T.updatedAt} ${dateFmt}</div>
        </div>
      </section>
${comingMoonsSectionHTML(T)}
<div class="api-slot" data-slot="weekly">${weeklySectionHTML(T)}</div>
      <p class="disclaimer">${T.disclaimer}</p>
      <footer>${T.footer} <span class="heart" role="button" tabindex="0" aria-label="${T.heartAria}">♥</span></footer>
    </main>
  `;

  wireUp();
}

function observeReveals(root) {
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.12 });
  root.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

function wireUp() {
  document.querySelectorAll('.lang-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      lang = btn.dataset.lang;
      localStorage.setItem('astrolua-lang', lang);
      render();
    });
  });

  observeReveals(document);

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

initStarfield();
render();
loadApiExtras();
// Re-render at local midnight so an open tab rolls over to the new day's sky.
(function scheduleMidnight() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  setTimeout(() => { render(); scheduleMidnight(); }, midnight - now);
})();

import './styles.css';
import { signOf, planetLongitudes, aspectBetween, moonPhaseInfo, nextMoonPhaseSign } from './astro.js';
import { PEOPLE } from './chartData.js';
import { I18N } from './i18n.js';

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
    const ageDays = (Date.now() - new Date(data.generatedAt)) / 86400000;
    if (data.weekly && ageDays < 12) {
      apiExtras = data;
      render();
    }
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
        <div class="sec-divider reveal">🜃</div>
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
        <div class="sec-divider reveal">✧</div>
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

// --- synastry wheel SVG ---
function polar(cx, cy, r, lonDeg) {
  const th = ((180 - lonDeg) * Math.PI) / 180; // 0° Aries at left, counterclockwise
  return [cx + r * Math.cos(th), cy + r * Math.sin(th)];
}

function wheelSVG(persons = ['dailton', 'felipe']) {
  const size = 580, cx = size / 2, cy = size / 2;
  const rOuter = 276, rZodiacIn = 240, rFelipe = 212, rDailton = 162, rInner = 118;
  let s = `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Synastry wheel">`;
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
        <div class="sec-divider reveal">☄</div>
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
    return `<div class="moon-day-cell${today ? ' today' : ''}">
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
        <div class="sec-divider reveal">☽</div>
        <p class="intro reveal">${T.moons.intro}</p>
        <div class="today-sky reveal">
          <div class="moon-strip">${strip}</div>
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

function personPageHTML(T, sky) {
  const who = VIEW; // 'dailton' | 'felipe'
  const card = who === 'dailton' ? T.dailtonCard : T.felipeCard;
  const birthLine = who === 'dailton' ? T.heroBirthDailton : T.heroBirthFelipe;
  const page = T.pages[who];
  const counts = elementCounts(PEOPLE[who].points);
  const dateFmt = new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', {
    dateStyle: 'full', timeStyle: 'short',
  }).format(sky.now);
  const weeklyText = apiExtras?.weekly?.[who]?.[lang] || apiExtras?.weekly?.[who]?.pt;
  return `
    <main>
      <header class="hero person-hero">
        <div class="kicker">${T.heroKicker}</div>
        <h1>${PEOPLE[who].name}</h1>
        <p class="tagline">${page.tagline}</p>
        <div class="births"><div>${who === 'dailton' ? '☀️' : '🌙'} <span>${birthLine}</span></div></div>
        <div class="scroll-hint">${T.scrollHint}</div>
      </header>

      <section class="charts">
        <h2 class="reveal">${page.chartTitle}</h2>
        <div class="sec-divider reveal">✦</div>
        <div class="charts-grid single">
          ${natalCardHTML(card)}
          <div class="card reveal">
            <h3>${T.elements.title}</h3>
            ${elementBarsHTML(counts, T)}
          </div>
        </div>
        <div class="wheel-wrap reveal">
          <div class="wheel-frame">${wheelSVG([who])}</div>
        </div>
      </section>
${personNumerologySectionHTML(T, who)}
      <section class="today">
        <h2 class="reveal">${T.todayTitle}</h2>
        <div class="sec-divider reveal">✧</div>
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
${weeklyText ? `
      <section class="weekly">
        <h2 class="reveal">${T.weeklyTitle}</h2>
        <div class="sec-divider reveal">☄</div>
        <div class="today-sky reveal"><div class="today-cols"><div class="today-col"><p>${weeklyText}</p></div></div>
        <div class="updated-at">${T.weeklyUpdated} ${new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', { dateStyle: 'long' }).format(new Date(apiExtras.generatedAt))} · astrology-api.io</div></div>
      </section>` : ''}
      <p class="disclaimer">${T.disclaimer}</p>
      <footer>${T.footer} <span class="heart">♥</span></footer>
    </main>
  `;
}

function render() {
  const T = t9();
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
  document.title = VIEW === 'us' ? T.title : T.pages[VIEW].title;
  const sky = todaySky();
  const dayOfYear = Math.floor((sky.now - new Date(sky.now.getFullYear(), 0, 0)) / 86400000);
  const note = T.loveNotes[dayOfYear % T.loveNotes.length];
  const dateFmt = new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', {
    dateStyle: 'full', timeStyle: 'short',
  }).format(sky.now);

  const chrome = `
    <div class="lang-toggle" role="group" aria-label="Language">
      <button data-lang="pt" class="${lang === 'pt' ? 'active' : ''}">PT</button>
      <button data-lang="en" class="${lang === 'en' ? 'active' : ''}">EN</button>
    </div>
    ${navHTML(T)}
    <div class="shooting-star" aria-hidden="true"></div>
    <div class="shooting-star s2" aria-hidden="true"></div>`;

  if (VIEW !== 'us') {
    document.getElementById('app').innerHTML = chrome + personPageHTML(T, sky);
    wireUp();
    return;
  }

  document.getElementById('app').innerHTML = chrome + `
    <main>
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
        <div class="sec-divider reveal">✦</div>
        <p class="intro reveal">${T.chartsIntro}</p>
        <div class="charts-grid">
          ${natalCardHTML(T.dailtonCard)}
          ${natalCardHTML(T.felipeCard)}
        </div>
        <div class="wheel-wrap reveal">
          <div class="wheel-frame">${wheelSVG()}</div>
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
        <div class="sec-divider reveal">❦</div>
        <p class="intro reveal">${T.synastryIntro}</p>
        ${Object.values(T.aspects).map(aspectCardHTML).join('')}
      </section>

      <section class="real">
        <h2 class="reveal">${T.realTalkTitle}</h2>
        <div class="sec-divider reveal">☾</div>
        <p class="intro reveal">${T.realTalkIntro}</p>
        ${Object.values(T.realAspects).map(aspectCardHTML).join('')}
      </section>

      <section class="today">
        <h2 class="reveal">${T.todayTitle}</h2>
        <div class="sec-divider reveal">✧</div>
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
          <div class="updated-at">${T.updatedAt} ${dateFmt}</div>
        </div>
      </section>
${comingMoonsSectionHTML(T)}
${weeklySectionHTML(T)}
      <p class="disclaimer">${T.disclaimer}</p>
      <footer>${T.footer} <span class="heart">♥</span></footer>
    </main>
  `;

  wireUp();
}

function wireUp() {
  document.querySelectorAll('.lang-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      lang = btn.dataset.lang;
      localStorage.setItem('astrolua-lang', lang);
      render();
    });
  });

  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

render();
loadApiExtras();
// Re-render at local midnight so an open tab rolls over to the new day's sky.
(function scheduleMidnight() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  setTimeout(() => { render(); scheduleMidnight(); }, midnight - now);
})();

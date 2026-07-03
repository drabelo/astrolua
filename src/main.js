import './styles.css';
import { signOf, planetLongitudes, aspectBetween, moonPhaseInfo } from './astro.js';
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

// --- synastry wheel SVG ---
function polar(cx, cy, r, lonDeg) {
  const th = ((180 - lonDeg) * Math.PI) / 180; // 0° Aries at left, counterclockwise
  return [cx + r * Math.cos(th), cy + r * Math.sin(th)];
}

function wheelSVG() {
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
    ['dailton', 'midheaven', 'felipe', 'jupiter', 'soft'],
    ['dailton', 'venus', 'felipe', 'moon', 'soft'],
    ['dailton', 'jupiter', 'felipe', 'moon', 'hard'],
    ['dailton', 'mars', 'felipe', 'saturn', 'hard'],
    ['dailton', 'mars', 'felipe', 'sun', 'hard'],
    ['dailton', 'venus', 'felipe', 'venus', 'hard'],
    ['dailton', 'pluto', 'felipe', 'ascendant', 'hard'],
  ];
  for (const [pa, ka, pb, kb, kind] of pairs) {
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
  plot('felipe', rFelipe, '#f2a6c8');
  plot('dailton', rDailton, '#e8c476');
  s += `<text x="${cx}" y="${cy - 7}" text-anchor="middle" font-size="15" fill="rgba(243,239,255,0.7)" font-style="italic" style="font-family:Georgia,serif">D ♥ F</text>`;
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

function render() {
  const T = t9();
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
  document.title = T.title;
  const sky = todaySky();
  const dayOfYear = Math.floor((sky.now - new Date(sky.now.getFullYear(), 0, 0)) / 86400000);
  const note = T.loveNotes[dayOfYear % T.loveNotes.length];
  const dateFmt = new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', {
    dateStyle: 'full', timeStyle: 'short',
  }).format(sky.now);

  document.getElementById('app').innerHTML = `
    <div class="lang-toggle" role="group" aria-label="Language">
      <button data-lang="pt" class="${lang === 'pt' ? 'active' : ''}">PT</button>
      <button data-lang="en" class="${lang === 'en' ? 'active' : ''}">EN</button>
    </div>
    <div class="shooting-star" aria-hidden="true"></div>
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

      <p class="disclaimer">${T.disclaimer}</p>
      <footer>${T.footer} <span class="heart">♥</span></footer>
    </main>
  `;

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
// Re-render at local midnight so an open tab rolls over to the new day's sky.
(function scheduleMidnight() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  setTimeout(() => { render(); scheduleMidnight(); }, midnight - now);
})();

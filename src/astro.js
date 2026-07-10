import * as A from 'astronomy-engine';

export const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

export function signOf(lonDeg) {
  const lon = ((lonDeg % 360) + 360) % 360;
  const idx = Math.floor(lon / 30);
  return { key: SIGNS[idx], index: idx, degree: lon - idx * 30, lon };
}

// Whole-sign house of a placement (planetLon) as seen from a chart whose
// Ascendant sits at ascLon: the Ascendant's sign is the 1st house, and every
// sign after it counts up one house at a time, wrapping at 12.
export function wholeSignHouse(planetLon, ascLon) {
  return ((signOf(planetLon).index - signOf(ascLon).index + 12) % 12) + 1;
}

function horizonOf(date, observer, lonDeg) {
  const sphere = new A.Spherical(0, lonDeg, 1);
  const vecEct = A.VectorFromSphere(sphere, date);
  const vecEqd = A.RotateVector(A.Rotation_ECT_EQD(date), vecEct);
  const vecHor = A.RotateVector(A.Rotation_EQD_HOR(date, observer), vecEqd);
  const s = A.HorizonFromVector(vecHor, 'normal');
  return { alt: s.lat, az: s.lon };
}

function bisect(date, observer, lo, hi, targetFn) {
  let flo = targetFn(horizonOf(date, observer, lo));
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const fmid = targetFn(horizonOf(date, observer, mid));
    if ((fmid < 0) === (flo < 0)) { lo = mid; flo = fmid; } else { hi = mid; }
  }
  return (lo + hi) / 2;
}

function azDiffToTarget(h, target) {
  const d = h.az - target;
  return ((d + 180) % 360 + 360) % 360 - 180;
}

// Finds Ascendant and Midheaven (ecliptic longitude, degrees) for a given
// moment and location, via direct horizon-crossing search rather than the
// classic trig formula (cross-checked against it; the closed-form formula
// is easy to get an Asc/Desc sign flip in, so this brute-force version is
// the source of truth here).
export function findAngles(date, lat, lon) {
  const observer = new A.Observer(lat, lon, 0);
  const N = 720; // 0.5 deg steps, refined by bisection
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const lonDeg = (360 * i) / N;
    pts.push({ lonDeg, ...horizonOf(date, observer, lonDeg) });
  }
  const ascCands = [], northCands = [], southCands = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if ((a.alt < 0) !== (b.alt < 0)) {
      const root = bisect(date, observer, a.lonDeg, b.lonDeg, h => h.alt);
      ascCands.push({ lonDeg: root, az: horizonOf(date, observer, root).az });
    }
    const da = azDiffToTarget(a, 0), db = azDiffToTarget(b, 0);
    if (Math.abs(da) < 30 && Math.abs(db) < 30 && (da < 0) !== (db < 0)) {
      const root = bisect(date, observer, a.lonDeg, b.lonDeg, h => azDiffToTarget(h, 0));
      northCands.push({ lonDeg: root, alt: horizonOf(date, observer, root).alt });
    }
    const da2 = azDiffToTarget(a, 180), db2 = azDiffToTarget(b, 180);
    if (Math.abs(da2) < 30 && Math.abs(db2) < 30 && (da2 < 0) !== (db2 < 0)) {
      const root = bisect(date, observer, a.lonDeg, b.lonDeg, h => azDiffToTarget(h, 180));
      southCands.push({ lonDeg: root, alt: horizonOf(date, observer, root).alt });
    }
  }
  ascCands.forEach(c => { c.distToEast = Math.min(Math.abs(c.az - 90), 360 - Math.abs(c.az - 90)); });
  ascCands.sort((x, y) => x.distToEast - y.distToEast);
  const asc = ascCands[0].lonDeg;
  const allMeridian = [...northCands, ...southCands];
  allMeridian.sort((x, y) => y.alt - x.alt);
  const mc = allMeridian[0].lonDeg;
  return { asc, mc };
}

export function planetLongitudes(date) {
  const out = {};
  out.sun = A.SunPosition(date).elon;
  out.moon = A.EclipticGeoMoon(date).lon;
  const bodies = { mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto' };
  for (const [k, b] of Object.entries(bodies)) {
    // Geocentric ecliptic-of-date longitude. NOT A.EclipticLongitude(), which
    // is heliocentric and puts Mercury/Venus/Mars whole signs away from where
    // an astrological chart has them.
    const ecl = A.Ecliptic(A.GeoVector(A.Body[b], date, true));
    out[k] = ecl.elon;
  }
  return out;
}

export function natalChart(date, lat, lon) {
  const planets = planetLongitudes(date);
  const { asc, mc } = findAngles(date, lat, lon);
  return { planets, points: { ...planets, ascendant: asc, midheaven: mc }, asc, mc };
}

const ASPECTS = [
  { name: 'conjunction', angle: 0, orb: 8 },
  { name: 'sextile', angle: 60, orb: 4 },
  { name: 'square', angle: 90, orb: 6 },
  { name: 'trine', angle: 120, orb: 6 },
  { name: 'opposition', angle: 180, orb: 8 },
];

export function angleDiff(a, b) {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

export function aspectBetween(lonA, lonB, orbs = ASPECTS) {
  const d = angleDiff(lonA, lonB);
  let best = null;
  for (const asp of orbs) {
    const orb = Math.abs(d - asp.angle);
    if (orb <= asp.orb && (!best || orb < best.orb)) {
      best = { name: asp.name, orb };
    }
  }
  return best;
}

// Finds the next moment the Moon reaches a given phase angle (0=new,
// 180=full) after `fromDate`, and the zodiac sign the Moon is in then.
export function nextMoonPhaseSign(targetLonDeg, fromDate, limitDays = 40) {
  const found = A.SearchMoonPhase(targetLonDeg, fromDate, limitDays);
  const date = found.date;
  const sign = signOf(A.EclipticGeoMoon(date).lon);
  return { date, sign };
}

export function moonPhaseInfo(date) {
  const angle = A.MoonPhase(date); // 0=new, 90=first quarter, 180=full, 270=last quarter
  const illum = A.Illumination(A.Body.Moon, date).phase_fraction;
  let phase;
  if (angle < 10 || angle > 350) phase = 'new';
  else if (angle < 80) phase = 'waxing-crescent';
  else if (angle < 100) phase = 'first-quarter';
  else if (angle < 170) phase = 'waxing-gibbous';
  else if (angle < 190) phase = 'full';
  else if (angle < 260) phase = 'waning-gibbous';
  else if (angle < 280) phase = 'last-quarter';
  else phase = 'waning-crescent';
  return { angle, illumination: illum, phase };
}

// Retrograde test: a body is retrograde when its geocentric longitude is
// decreasing. Sampled ±12h around the moment.
const GEO_BODIES = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
export function retrogradesAt(date) {
  const t = date instanceof Date ? date : new Date(date);
  const before = planetLongitudes(new Date(t.getTime() - 43200000));
  const after = planetLongitudes(new Date(t.getTime() + 43200000));
  const out = {};
  for (const b of GEO_BODIES) {
    let d = after[b] - before[b];
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    out[b] = d < 0;
  }
  return out;
}

// Finds upcoming exact aspect hits from fast transiting bodies to a set of
// natal points, within `days` from `fromDate`. Daily sampling + bisection to
// roughly the hour. Returns [{body, point, aspect, date}] sorted by date.
const FORECAST_ASPECTS = [
  { name: 'conjunction', angle: 0 },
  { name: 'sextile', angle: 60 },
  { name: 'square', angle: 90 },
  { name: 'trine', angle: 120 },
  { name: 'opposition', angle: 180 },
];
export function upcomingTransits(natalPoints, fromDate, days = 16, bodies = ['sun', 'venus', 'mars']) {
  const from = fromDate.getTime();
  const samples = [];
  for (let d = 0; d <= days; d++) {
    samples.push(planetLongitudes(new Date(from + d * 86400000)));
  }
  const events = [];
  for (const body of bodies) {
    for (const [point, natalLon] of Object.entries(natalPoints)) {
      for (const asp of FORECAST_ASPECTS) {
        for (let d = 0; d < days; d++) {
          const f0 = angleDiff(samples[d][body], natalLon) - asp.angle;
          const f1 = angleDiff(samples[d + 1][body], natalLon) - asp.angle;
          if (f0 === 0 || (f0 < 0) === (f1 < 0)) continue;
          let lo = from + d * 86400000, hi = lo + 86400000;
          let flo = f0;
          for (let i = 0; i < 20; i++) {
            const mid = (lo + hi) / 2;
            const fmid = angleDiff(planetLongitudes(new Date(mid))[body], natalLon) - asp.angle;
            if ((fmid < 0) === (flo < 0)) { lo = mid; flo = fmid; } else { hi = mid; }
          }
          events.push({ body, point, aspect: asp.name, date: new Date((lo + hi) / 2) });
        }
      }
    }
  }
  events.sort((a, b) => a.date - b.date);
  return events;
}

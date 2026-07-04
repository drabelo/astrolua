// Natal data for Dailton & Felipe, precomputed from astronomy-engine
// (see scripts/computeNatal.js — run `npm run natal` to regenerate).
// Geocentric ecliptic-of-date positions, cross-checked against the couple's
// astrology-API report (all planets within 0.03°).
//
// Dailton Fernandes Rabelo Júnior — Apr 29 1994, 07:20 -03:00, Jussara-GO (-15.8433, -50.8867)
// Felipe Batista de Sousa       — Sep 13 1995, 09:54 -03:00, Goiânia-GO (-16.6869, -49.2648)

export const PEOPLE = {
  dailton: {
    name: 'Dailton',
    fullName: 'Dailton Fernandes Rabelo Júnior',
    birth: { iso: '1994-04-29T10:20:00Z', lat: -15.8433, lon: -50.8867 },
    points: {
      sun: 38.87, moon: 268.97, mercury: 37.70, venus: 63.85, mars: 11.35,
      jupiter: 219.91, saturn: 340.05, uranus: 296.34, neptune: 293.35, pluto: 237.19,
      ascendant: 49.20, midheaven: 318.83,
    },
  },
  felipe: {
    name: 'Felipe',
    fullName: 'Felipe Batista de Sousa',
    birth: { iso: '1995-09-13T12:54:00Z', lat: -16.6869, lon: -49.2648 },
    points: {
      sun: 170.27, moon: 43.30, mercury: 196.61, venus: 176.68, mars: 214.15,
      jupiter: 248.08, saturn: 351.42, uranus: 296.74, neptune: 292.90, pluto: 238.18,
      ascendant: 235.21, midheaven: 133.82,
    },
  },
};

// The synastry aspects the page tells the story around, hand-picked from the
// full computed list (tightest + most personally meaningful).
export const FEATURED_ASPECTS = [
  { a: ['dailton', 'sun'], b: ['felipe', 'moon'], type: 'conjunction', orb: 4.43, id: 'sunMoon' },
  { a: ['dailton', 'ascendant'], b: ['felipe', 'sun'], type: 'trine', orb: 1.07, id: 'ascSun' },
  { a: ['dailton', 'uranus'], b: ['felipe', 'venus'], type: 'trine', orb: 0.34, id: 'uranusVenus' },
  { a: ['dailton', 'venus'], b: ['felipe', 'jupiter'], type: 'opposition', orb: 4.23, id: 'venusJupiter' },
  { a: ['dailton', 'jupiter'], b: ['felipe', 'moon'], type: 'opposition', orb: 3.4, id: 'jupiterMoon' },
  { a: ['dailton', 'moon'], b: ['felipe', 'venus'], type: 'square', orb: 2.29, id: 'moonVenus' },
  { a: ['dailton', 'saturn'], b: ['felipe', 'jupiter'], type: 'square', orb: 1.97, id: 'saturnJupiter' },
  { a: ['dailton', 'mercury'], b: ['felipe', 'mars'], type: 'opposition', orb: 3.55, id: 'mercuryMars' },
  { a: ['dailton', 'pluto'], b: ['felipe', 'ascendant'], type: 'conjunction', orb: 1.98, id: 'plutoAsc' },
];

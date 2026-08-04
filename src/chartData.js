// Natal data for Dailton & Felipe, precomputed from astronomy-engine
// (see scripts/computeNatal.js — run `npm run natal` to regenerate).
// Geocentric ecliptic-of-date positions, cross-checked against the couple's
// astrology-API report (all planets within 0.03°).
//
// Dailton Fernandes Rabelo Júnior — Apr 29 1994, 07:20 -03:00, Jussara-GO (-15.8433, -50.8867)
// Felipe Batista de Sousa       — Sep 13 1995, 10:54 -03:00, Goiânia-GO (-16.6869, -49.2648)
// (Brazil's 1995 summer time began Oct 15, so this date is standard time.)

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
    birth: { iso: '1995-09-13T13:54:00Z', lat: -16.6869, lon: -49.2648 },
    points: {
      sun: 170.31, moon: 43.82, mercury: 196.64, venus: 176.73, mars: 214.18,
      jupiter: 248.09, saturn: 351.42, uranus: 296.74, neptune: 292.90, pluto: 238.18,
      ascendant: 250.54, midheaven: 149.20,
    },
  },
};

// The synastry aspects the page tells the story around, hand-picked from the
// full computed list (tightest + most personally meaningful).
export const FEATURED_ASPECTS = [
  { a: ['dailton', 'moon'], b: ['felipe', 'midheaven'], type: 'trine', orb: 0.23, id: 'moonMC' },
  { a: ['dailton', 'sun'], b: ['felipe', 'moon'], type: 'conjunction', orb: 4.94, id: 'sunMoon' },
  { a: ['dailton', 'ascendant'], b: ['felipe', 'sun'], type: 'trine', orb: 1.11, id: 'ascSun' },
  { a: ['dailton', 'uranus'], b: ['felipe', 'venus'], type: 'trine', orb: 0.39, id: 'uranusVenus' },
  { a: ['dailton', 'venus'], b: ['felipe', 'jupiter'], type: 'opposition', orb: 4.24, id: 'venusJupiter' },
  { a: ['dailton', 'jupiter'], b: ['felipe', 'moon'], type: 'opposition', orb: 3.91, id: 'jupiterMoon' },
  { a: ['dailton', 'moon'], b: ['felipe', 'venus'], type: 'square', orb: 2.23, id: 'moonVenus' },
  { a: ['dailton', 'saturn'], b: ['felipe', 'jupiter'], type: 'square', orb: 1.96, id: 'saturnJupiter' },
  { a: ['dailton', 'mercury'], b: ['felipe', 'mars'], type: 'opposition', orb: 3.52, id: 'mercuryMars' },
  { a: ['dailton', 'saturn'], b: ['felipe', 'ascendant'], type: 'square', orb: 0.49, id: 'saturnAsc' },
];

// Davison relationship chart — the midpoint in time AND space between the two
// births, i.e. a real chart with an actual moment and an actual place.
// Cross-checked against the API's /insights/relationship/davison: identical
// to the minute and to four decimal places, so it is computed rather than
// fetched (see scripts/computeNatal.js).
export const DAVISON = {
  iso: '1995-01-05T12:07:00.000Z',
  lat: -16.2651,
  lon: -50.0757,
  points: {
    sun: 284.68, moon: 338.01, mercury: 297.72, venus: 238.07, mars: 152.63,
    jupiter: 245.63, saturn: 338.38, uranus: 295.73, neptune: 292.74, pluto: 239.67,
    ascendant: 328.32, midheaven: 238.53,
  },
};

// Natal data for Dailton & Felipe, precomputed from astronomy-engine
// (see scripts/computeNatal.js — run `npm run natal` to regenerate).
//
// Dailton Fernandes Rabelo Júnior — Apr 29 1994, 07:20 -03:00, Jussara-GO (-15.8433, -50.8867)
// Felipe Batista de Sousa       — Sep 13 1995, 09:54 -03:00, Goiânia-GO (-16.6869, -49.2648)

export const PEOPLE = {
  dailton: {
    name: 'Dailton',
    fullName: 'Dailton Fernandes Rabelo Júnior',
    birth: { iso: '1994-04-29T10:20:00Z', lat: -15.8433, lon: -50.8867 },
    points: {
      sun: 38.87, moon: 268.97, mercury: 34.09, venus: 100.14, mars: 351.74,
      jupiter: 219.71, saturn: 334.98, uranus: 293.47, neptune: 291.50, pluto: 236.56,
      ascendant: 49.20, midheaven: 318.83,
    },
  },
  felipe: {
    name: 'Felipe',
    fullName: 'Felipe Batista de Sousa',
    birth: { iso: '1995-09-13T12:54:00Z', lat: -16.6869, lon: -49.2648 },
    points: {
      sun: 170.27, moon: 43.30, mercury: 288.90, venus: 185.69, mars: 241.44,
      jupiter: 258.77, saturn: 351.30, uranus: 299.09, neptune: 294.51, pluto: 240.02,
      ascendant: 235.21, midheaven: 133.82,
    },
  },
};

// The synastry aspects the page tells the story around, hand-picked from the
// full computed list (tightest + most personally meaningful; generational
// planet-to-generational-planet contacts left out).
export const FEATURED_ASPECTS = [
  { a: ['dailton', 'sun'], b: ['felipe', 'moon'], type: 'conjunction', orb: 4.43, id: 'sunMoon' },
  { a: ['dailton', 'ascendant'], b: ['felipe', 'moon'], type: 'conjunction', orb: 5.9, id: 'moonAsc' },
  { a: ['dailton', 'ascendant'], b: ['felipe', 'sun'], type: 'trine', orb: 1.07, id: 'ascSun' },
  { a: ['dailton', 'midheaven'], b: ['felipe', 'jupiter'], type: 'sextile', orb: 0.06, id: 'mcJupiter' },
  { a: ['dailton', 'venus'], b: ['felipe', 'moon'], type: 'sextile', orb: 3.16, id: 'venusMoon' },
  { a: ['dailton', 'jupiter'], b: ['felipe', 'moon'], type: 'opposition', orb: 3.59, id: 'jupiterMoon' },
  { a: ['dailton', 'mars'], b: ['felipe', 'saturn'], type: 'conjunction', orb: 0.44, id: 'marsSaturn' },
  { a: ['dailton', 'mars'], b: ['felipe', 'sun'], type: 'opposition', orb: 1.47, id: 'marsSun' },
  { a: ['dailton', 'venus'], b: ['felipe', 'venus'], type: 'square', orb: 4.45, id: 'venusVenus' },
  { a: ['dailton', 'pluto'], b: ['felipe', 'ascendant'], type: 'conjunction', orb: 1.35, id: 'plutoAsc' },
];

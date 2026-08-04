// Regenerates the natal numbers in src/chartData.js (run: npm run natal).
// Prints positions + full synastry aspect list to stdout for manual review.
import { natalChart, signOf, aspectBetween, SIGNS } from '../src/astro.js';

const BIRTHS = {
  dailton: { iso: '1994-04-29T10:20:00Z', lat: -15.8433, lon: -50.8867 },
  felipe: { iso: '1995-09-13T13:54:00Z', lat: -16.6869, lon: -49.2648 },
};

const charts = {};
for (const [who, b] of Object.entries(BIRTHS)) {
  const chart = natalChart(new Date(b.iso), b.lat, b.lon);
  charts[who] = chart;
  console.log(`\n=== ${who} ===`);
  for (const [k, v] of Object.entries(chart.points)) {
    const s = signOf(v);
    console.log(`  ${k.padEnd(10)} ${v.toFixed(2).padStart(7)}  ${s.key} ${s.degree.toFixed(2)}°`);
  }
}

console.log('\n=== synastry (dailton x felipe) ===');
const rows = [];
for (const [ka, va] of Object.entries(charts.dailton.points)) {
  for (const [kb, vb] of Object.entries(charts.felipe.points)) {
    const asp = aspectBetween(va, vb);
    if (asp) rows.push({ ka, kb, ...asp });
  }
}
rows.sort((a, b) => a.orb - b.orb);
for (const r of rows) {
  console.log(`  dailton ${r.ka.padEnd(10)} ${r.name.padEnd(12)} felipe ${r.kb.padEnd(10)} orb ${r.orb.toFixed(2)}°`);
}

// --- Davison relationship chart -------------------------------------------
// Midpoint in time AND space between the two births. Verified against
// /insights/relationship/davison: identical to the minute and to 4dp
// (1995-01-05T12:07:00Z, -16.2651, -50.07575), so it is computed here for
// free rather than fetched.
const tMid = new Date((new Date(BIRTHS.dailton.iso).getTime() + new Date(BIRTHS.felipe.iso).getTime()) / 2);
const latMid = (BIRTHS.dailton.lat + BIRTHS.felipe.lat) / 2;
const lonMid = (BIRTHS.dailton.lon + BIRTHS.felipe.lon) / 2;
const dav = natalChart(tMid, latMid, lonMid);
console.log('\n=== davison ===');
console.log('  moment', tMid.toISOString(), ' place', latMid.toFixed(4), lonMid.toFixed(4));
for (const [k, v] of Object.entries(dav.points)) {
  const sg = signOf(v);
  console.log(`  ${k.padEnd(10)} ${v.toFixed(2).padStart(7)}  ${sg.key} ${sg.degree.toFixed(2)}°`);
}

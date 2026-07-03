// Regenerates the natal numbers in src/chartData.js (run: npm run natal).
// Prints positions + full synastry aspect list to stdout for manual review.
import { natalChart, signOf, aspectBetween, SIGNS } from '../src/astro.js';

const BIRTHS = {
  dailton: { iso: '1994-04-29T10:20:00Z', lat: -15.8433, lon: -50.8867 },
  felipe: { iso: '1995-09-13T12:54:00Z', lat: -16.6869, lon: -49.2648 },
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

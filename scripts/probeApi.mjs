// Phase-A probe: makes a SMALL, FIXED number of API calls and prints enough of
// each response to fix the extractors offline afterwards.
//
// It exists because extraction for the newer endpoints was written against the
// published schema rather than observed payloads. Six calls here buy certainty
// for the ~20 that follow.
//
// Run via .github/workflows/probe-api.yml (workflow_dispatch).

const API_BASE = process.env.ASTROLOGY_API_URL || 'https://api.astrology-api.io';
const KEY = process.env.ASTROLOGY_API_KEY;
if (!KEY) {
  console.error('ASTROLOGY_API_KEY is not set');
  process.exit(1);
}

const SUBJECTS = {
  dailton: {
    name: 'Dailton',
    birth_data: {
      year: 1994, month: 4, day: 29, hour: 7, minute: 20,
      latitude: -15.8433, longitude: -50.8867, timezone: 'America/Sao_Paulo',
    },
  },
  felipe: {
    name: 'Felipe',
    birth_data: {
      year: 1995, month: 9, day: 13, hour: 10, minute: 54,
      latitude: -16.6869, longitude: -49.2648, timezone: 'America/Sao_Paulo',
    },
  },
};

// Exactly these, in this order. Nothing is generated dynamically, so the call
// count cannot drift.
const PROBES = [
  ['traditional-analysis', '/traditional/analysis', { subject: SUBJECTS.dailton, options: { language: 'pt' } }],
  ['profection-timeline', '/traditional/analysis/profection-timeline', { subject: SUBJECTS.dailton, start_age: 30, end_age: 34 }],
  ['davison', '/insights/relationship/davison', { subjects: [SUBJECTS.dailton, SUBJECTS.felipe], options: { language: 'pt' } }],
  ['composite-report', '/analysis/composite-report', { subject1: SUBJECTS.dailton, subject2: SUBJECTS.felipe, report_options: { language: 'pt' } }],
  ['relationship-timing', '/insights/relationship/timing', { subjects: [SUBJECTS.dailton, SUBJECTS.felipe], options: { language: 'pt' } }],
  ['natal-report', '/analysis/natal-report', { subject: SUBJECTS.dailton, report_options: { language: 'pt' } }],
];

// Prints the shape of a payload: keys, types, array lengths, to a shallow
// depth. Enough to write a correct extractor without dumping megabytes.
function outline(node, prefix = '', depth = 0, lines = []) {
  if (depth > 2 || lines.length > 70) return lines;
  if (Array.isArray(node)) {
    lines.push(`${prefix}[] len=${node.length}`);
    if (node.length) outline(node[0], `${prefix}[0]`, depth + 1, lines);
    return lines;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v === null) lines.push(`${path}: null`);
      else if (Array.isArray(v)) {
        lines.push(`${path}[]: len=${v.length}`);
        if (v.length) outline(v[0], `${path}[0]`, depth + 1, lines);
      } else if (typeof v === 'object') {
        lines.push(`${path}: {}`);
        outline(v, path, depth + 1, lines);
      } else {
        const val = typeof v === 'string' ? JSON.stringify(v.slice(0, 90)) : v;
        lines.push(`${path}: ${typeof v} = ${val}`);
      }
    }
  }
  return lines;
}

let calls = 0;
for (const [label, path, body] of PROBES) {
  console.log(`\n${'='.repeat(72)}\n### ${label}  ->  ${path}\n${'='.repeat(72)}`);
  try {
    calls++;
    const res = await fetch(`${API_BASE}/api/v3${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    console.log(`HTTP ${res.status}`);
    const text = await res.text();
    if (!res.ok) {
      console.log('BODY:', text.slice(0, 400));
      if (res.status === 429) {
        console.log('\n!! quota exhausted — stopping so nothing further is wasted');
        break;
      }
      continue;
    }
    const json = JSON.parse(text);
    console.log(`SIZE ${text.length} bytes`);
    console.log('--- shape ---');
    console.log(outline(json).join('\n'));
    console.log('--- first 900 chars of raw ---');
    console.log(text.slice(0, 900));
  } catch (err) {
    console.log('ERROR:', err.message);
  }
  await new Promise((r) => setTimeout(r, 400));
}
console.log(`\n\nPROBE COMPLETE — ${calls} call(s) used.`);

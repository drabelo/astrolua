// Fetches personalized weekly horoscopes (PT + EN) for both partners from
// astrology-api.io and writes them to public/api-extras.json, which the site
// renders in the "week" section (hidden gracefully when the file is absent).
//
// Runs in GitHub Actions (.github/workflows/weekly-extras.yml) with the token
// provided via the ASTROLOGY_API_KEY repository secret. Never commit the key.

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
      year: 1995, month: 9, day: 13, hour: 9, minute: 54,
      latitude: -16.6869, longitude: -49.2648, timezone: 'America/Sao_Paulo',
    },
  },
};

async function post(path, body) {
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
  if (!res.ok) {
    throw new Error(`${path} -> HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}

// The text payload shape isn't pinned down by the docs, so dig for the first
// substantial string field rather than assuming a key name.
function extractText(payload) {
  if (typeof payload === 'string') return payload;
  const preferred = ['text', 'horoscope', 'content', 'reading', 'summary', 'interpretation'];
  const queue = [payload];
  const texts = [];
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== 'object') continue;
    for (const k of preferred) {
      if (typeof node[k] === 'string' && node[k].trim().length > 80) return node[k].trim();
    }
    for (const v of Object.values(node)) {
      if (typeof v === 'string' && v.trim().length > 120) texts.push(v.trim());
      else if (v && typeof v === 'object') queue.push(v);
    }
  }
  return texts.sort((a, b) => b.length - a.length)[0] || null;
}

const out = {
  generatedAt: new Date().toISOString(),
  source: 'astrology-api.io',
  weekly: {},
};

let failures = 0;
for (const [who, subject] of Object.entries(SUBJECTS)) {
  out.weekly[who] = {};
  for (const language of ['pt', 'en']) {
    try {
      const payload = await post('/horoscope/personal/weekly/text', {
        subject,
        horoscope_type: 'weekly',
        language,
        format: 'paragraph',
        emoji: false,
      });
      const text = extractText(payload);
      if (!text) throw new Error('no text found in response');
      out.weekly[who][language] = text;
      console.log(`ok: weekly ${who} ${language} (${text.length} chars)`);
    } catch (err) {
      failures++;
      console.error(`FAIL: weekly ${who} ${language}:`, err.message);
    }
  }
}

const gotAny = Object.values(out.weekly).some(w => Object.keys(w).length > 0);
if (!gotAny) {
  console.error('All API calls failed; not writing api-extras.json');
  process.exit(1);
}

import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('public', { recursive: true });
writeFileSync('public/api-extras.json', JSON.stringify(out, null, 2) + '\n');
console.log(`wrote public/api-extras.json (${failures} failures)`);

# astrolua 🌙

A living, bilingual (PT/EN) one-page synastry site for **Dailton & Felipe** —
built on real astronomical ephemerides, restyled as a love letter.

## How it stays fresh every day

The "Today's sky" section is computed **in the browser, on every visit**, using
[astronomy-engine](https://github.com/cosinekitty/astronomy): current Moon sign
and phase, plus the tightest live transit to each person's natal chart. No cron
job or rebuild needed — the page is always up to date the moment it loads, and
an open tab re-renders itself at midnight.

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run natal    # recompute + print natal positions and synastry aspects
```

Natal positions are precomputed into `src/chartData.js` (they never change);
`npm run natal` regenerates the raw numbers for review if birth data is ever
corrected.

## Deployment

Pushes to `main` deploy automatically to GitHub Pages via
`.github/workflows/deploy.yml`. One-time setup: in the repo settings, set
**Settings → Pages → Source** to **GitHub Actions**.

# Cricscore 🏏

A responsive cricket-score web app built with Next.js, TypeScript and Tailwind CSS. The experience is designed to work on desktop and mobile and can be installed as a PWA on supported devices.

## Current status

- Responsive homepage and match centre
- Match filters for live, upcoming and results
- Search by team, venue or series
- Format filter (T20, ODI, Test)
- Match selection and favorite toggle (in-memory preview)
- Server-side CricketData integration for current matches
- Provider response cached for 15 minutes to conserve the free-tier quota
- PWA manifest and mobile-friendly layout
- Demo mode when no API key is configured; sample scores are illustrative, not real

## Enable the free CricketData API

1. Create a free account at https://cricketdata.org/ and copy your API key from the member dashboard.
2. For local development, copy `.env.example` to `.env.local` and set `CRICKET_API_KEY=your_key_here`.
3. For a hosted deployment, add `CRICKET_API_KEY` in your hosting provider's server-side environment settings.
4. Restart/redeploy the app and open `/api/matches` to inspect the normalized match response.

The free plan currently advertises 100 API hits per day. CricketData notes that free data can be delayed; the API response is cached for 15 minutes to reduce requests. Review the provider's current limits and terms before making the app public:
- Pricing: https://cricketdata.org/pricing/
- Current matches API guide: https://cricketdata.org/live-cricket-score-api/
- Terms: https://cricketdata.org/terms-of-use/

## Run locally

Requirements: Node.js 20 or later.

```bash
npm install
cp .env.example .env.local
# Add your CRICKET_API_KEY to .env.local
npm run dev
```

Open http://localhost:3000.

## Important limitations

- This first integration uses CricketData's `currentMatches` endpoint for match status and score summaries.
- Detailed ball-by-ball commentary and full innings scorecards are not yet wired into the UI.
- The free plan has a limited daily quota and may return delayed data. A 15-minute server cache helps conserve requests, but the actual cache behavior can depend on the hosting platform.
- Keep API keys server-side. Never prefix the key with `NEXT_PUBLIC_` or commit real credentials to Git.
- Verify CricketData's terms and data-redistribution permissions before publicly distributing its feed.

## Deploy

Import this repository into Vercel and use the default Next.js build settings. Add `CRICKET_API_KEY` in the project's server-side environment variables after creating the project.

## Next milestones

1. Add real ball-by-ball commentary and detailed innings scorecards.
2. Improve team/format normalization and provider error handling based on real API responses.
3. Add persistent favorites, team/player pages and series fixtures.
4. Add push notifications and authentication where required.
5. Add automated tests and production monitoring.

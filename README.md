# Cricscore 🏏

A responsive cricket-score web app built with Next.js, TypeScript and Tailwind CSS. The experience is designed to work on desktop and mobile and can be installed as a PWA on supported devices.

## Current status

- Responsive homepage and match centre
- Match filters for live, upcoming and results
- Search by team, venue or series
- Format filter (T20, ODI, Test)
- Match selection and favorite toggle (in-memory preview)
- API route at `/api/matches`
- PWA manifest and mobile-friendly layout
- **Demo mode by default:** sample scores are clearly marked and are not real live data

## Run locally

Requirements: Node.js 20 or later.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Enable real live scores

A cricket data provider and valid credentials are required. Choose a provider whose plan permits the match coverage, live refresh rate, scorecards and ball-by-ball commentary you need. Check redistribution and attribution terms before publishing the data.

1. Set `CRICKET_API_BASE_URL` and `CRICKET_API_KEY` in your deployment's server-side environment variables.
2. Implement a provider-specific adapter in `app/api/matches/route.ts` for the provider's documented endpoint and response schema.
3. Add normalisation for matches, innings, scorecards and commentary.
4. Test live, upcoming, completed, abandoned and unavailable-match responses.
5. Keep the API key server-side; do not prefix it with `NEXT_PUBLIC_` or commit it to Git.

The route intentionally does not guess a provider endpoint or pretend sample data is live. With credentials present but no provider adapter, it returns a setup-required response.

## Deploy

Import this repository into Vercel and use the default Next.js build settings. Add environment variables in project settings after the provider adapter has been implemented.

## Next milestones

1. Select the cricket API provider and implement its adapter.
2. Add real ball-by-ball commentary and innings scorecards.
3. Add persistent favorites, team/player pages and series fixtures.
4. Add push notifications and authentication where required.
5. Add automated tests and production monitoring.

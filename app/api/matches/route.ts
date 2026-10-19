import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export type CricketMatch = {
  id: string;
  format: "T20" | "ODI" | "TEST";
  status: "LIVE" | "UPCOMING" | "RESULT";
  series: string;
  venue: string;
  startTime: string;
  teamA: { name: string; code: string; score?: string; overs?: string };
  teamB: { name: string; code: string; score?: string; overs?: string };
  summary: string;
  isDemo: boolean;
};

// Clearly marked sample data keeps the interface useful before a licensed data
// provider is configured. Never present this fallback as a real live score.
const demoMatches: CricketMatch[] = [
  {
    id: "demo-1", format: "T20", status: "LIVE", series: "International T20 • Demo match",
    venue: "Sample Cricket Ground", startTime: "In progress",
    teamA: { name: "India", code: "IND", score: "168/4", overs: "18.2" },
    teamB: { name: "Australia", code: "AUS", score: "—", overs: "Yet to bat" },
    summary: "India need a strong finish • Sample scoreboard", isDemo: true,
  },
  {
    id: "demo-2", format: "ODI", status: "UPCOMING", series: "One Day International • Demo fixture",
    venue: "National Cricket Stadium", startTime: "Today • 7:00 PM IST",
    teamA: { name: "South Africa", code: "SA" },
    teamB: { name: "New Zealand", code: "NZ" },
    summary: "Fixture preview • Sample schedule", isDemo: true,
  },
  {
    id: "demo-3", format: "TEST", status: "RESULT", series: "Test Championship • Demo result",
    venue: "The Oval", startTime: "Completed",
    teamA: { name: "England", code: "ENG", score: "312 & 184" },
    teamB: { name: "Pakistan", code: "PAK", score: "251 & 210" },
    summary: "Sample result • Not an official match result", isDemo: true,
  },
];

export async function GET() {
  const baseUrl = process.env.CRICKET_API_BASE_URL;
  const apiKey = process.env.CRICKET_API_KEY;

  // Provider integration is deliberately not guessed: each cricket API has
  // its own endpoints, authentication, data schema, and licensing rules.
  if (baseUrl && apiKey) {
    return NextResponse.json({
      matches: [],
      mode: "provider-not-configured",
      message: "API credentials are present, but a provider-specific adapter must be configured before live scores can be served.",
      providerConfigured: true,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({
    matches: demoMatches,
    mode: "demo",
    message: "Showing sample data. Configure a supported cricket data provider for real live scores.",
    providerConfigured: false,
  }, { headers: { "Cache-Control": "no-store" } });
}

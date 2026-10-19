import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 900;

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

type ProviderScore = { r?: number; w?: number; o?: number | string; inning?: string };
type ProviderMatch = {
  id?: string;
  name?: string;
  matchType?: string;
  status?: string;
  venue?: string;
  date?: string;
  teams?: string[];
  teamInfo?: Array<{ name?: string; shortname?: string; img?: string }>;
  score?: ProviderScore[];
  matchStarted?: boolean;
  matchEnded?: boolean;
};

function teamCode(name: string, info?: ProviderMatch["teamInfo"]) {
  const found = info?.find((item) => item.name?.toLowerCase() === name.toLowerCase());
  if (found?.shortname) return found.shortname.toUpperCase();
  const words = name.trim().split(/\s+/);
  return (words.length > 1 ? words.map((word) => word[0]).join("") : name.slice(0, 3)).toUpperCase();
}

function formatMatchType(value?: string): CricketMatch["format"] {
  const type = (value ?? "").toLowerCase();
  if (type === "test") return "TEST";
  if (type === "odi") return "ODI";
  return "T20";
}

function formatDate(value?: string) {
  if (!value) return "Time not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata",
  }).format(date) + " IST";
}

function normalizeMatch(match: ProviderMatch, index: number): CricketMatch | null {
  const teams = match.teams ?? [];
  if (teams.length < 2) return null;
  const scores = match.score ?? [];
  const scoreFor = (team: string, teamIndex: number) => {
    const innings = scores.find((entry) => entry.inning?.toLowerCase().startsWith(team.toLowerCase()));
    const score = innings ?? scores[teamIndex];
    if (!score || (score.r === undefined && score.w === undefined)) return undefined;
    return {
      score: `${score.r ?? 0}/${score.w ?? 0}`,
      overs: score.o === undefined ? undefined : String(score.o),
    };
  };
  const first = scoreFor(teams[0], 0);
  const second = scoreFor(teams[1], 1);
  const statusText = (match.status ?? "").toLowerCase();
  const isEnded = match.matchEnded === true || /won by|drawn|tied|no result|match ended|completed/.test(statusText);
  const isStarted = match.matchStarted === true || scores.length > 0 || /live|in progress|stumps|innings break/.test(statusText);
  const status: CricketMatch["status"] = isEnded ? "RESULT" : isStarted ? "LIVE" : "UPCOMING";
  const dateLabel = isEnded ? "Completed" : isStarted ? "In progress" : formatDate(match.date);
  const summary = match.status?.trim() || (isEnded ? "Match completed" : isStarted ? "Match in progress" : "Upcoming fixture");
  return {
    id: match.id ?? `cricketdata-${index}-${teams.join("-")}`,
    format: formatMatchType(match.matchType),
    status,
    series: match.name ?? `${teams[0]} vs ${teams[1]}`,
    venue: match.venue ?? "Venue not available",
    startTime: dateLabel,
    teamA: { name: teams[0], code: teamCode(teams[0], match.teamInfo), ...(first ?? {}) },
    teamB: { name: teams[1], code: teamCode(teams[1], match.teamInfo), ...(second ?? {}) },
    summary,
    isDemo: false,
  };
}

export async function GET() {
  const apiKey = process.env.CRICKET_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      matches: demoMatches,
      mode: "demo",
      message: "Showing sample data. Add your free CricketData API key to enable real match scores.",
      providerConfigured: false,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    // CricketData's free tier allows 100 API hits/day. The provider response is
    // cached for 15 minutes to avoid spending a request on every page refresh.
    const url = new URL("https://api.cricapi.com/v1/currentMatches");
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("offset", "0");
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 900 },
    });

    if (!response.ok) {
      return NextResponse.json({
        matches: [], mode: "provider-error",
        message: `CricketData returned HTTP ${response.status}. Check the API key and free-tier quota.`,
        providerConfigured: true,
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    const payload = await response.json() as { status?: string; message?: string; data?: ProviderMatch[] };
    if (payload.status && payload.status.toLowerCase() !== "success") {
      return NextResponse.json({
        matches: [], mode: "provider-error",
        message: payload.message ?? "CricketData could not return matches. Check the API key and daily quota.",
        providerConfigured: true,
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    const matches = (payload.data ?? [])
      .map(normalizeMatch)
      .filter((match): match is CricketMatch => match !== null);

    return NextResponse.json({
      matches, mode: "live",
      message: matches.length ? "Match data supplied by CricketData. The free tier may have a short delay." : "CricketData returned no current matches.",
      providerConfigured: true,
    }, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json({
      matches: [], mode: "provider-error",
      message: "Could not connect to CricketData. Please try again later.",
      providerConfigured: true,
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

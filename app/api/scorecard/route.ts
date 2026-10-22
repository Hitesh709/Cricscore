import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const apiKey = process.env.CRICKET_API_KEY;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (!apiKey) {
    return NextResponse.json({ error: "CricketData API key is not configured." }, { status: 503 });
  }
  if (!id || !/^[a-zA-Z0-9-]{8,100}$/.test(id)) {
    return NextResponse.json({ error: "A valid match ID is required." }, { status: 400 });
  }

  try {
    const url = new URL("https://api.cricapi.com/v1/match_scorecard");
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("offset", "0");
    url.searchParams.set("id", id);

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 900 },
    });
    if (!response.ok) {
      return NextResponse.json({
        error: `CricketData returned HTTP ${response.status} for the scorecard. This match or endpoint may not be available on the current plan.`,
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    const payload = await response.json() as { status?: string; message?: string; data?: unknown; info?: unknown };
    if (payload.status && payload.status.toLowerCase() !== "success") {
      return NextResponse.json({
        error: payload.message ?? "Scorecard is unavailable for this match. The provider may not have detailed scorecard data enabled for this match or plan.",
        providerStatus: payload.status,
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({
      data: payload.data ?? null,
      info: payload.info ?? null,
      mode: "provider",
    }, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json({ error: "Could not connect to CricketData scorecard service." }, { status: 502 });
  }
}

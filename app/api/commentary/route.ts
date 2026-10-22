import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const apiKey = process.env.CRICKET_API_KEY;
  const id = new URL(request.url).searchParams.get("id")?.trim();

  if (!apiKey) {
    return NextResponse.json({ error: "CricketData API key is not configured." }, { status: 503 });
  }
  if (!id || !/^[a-zA-Z0-9-]{8,100}$/.test(id)) {
    return NextResponse.json({ error: "A valid match ID is required." }, { status: 400 });
  }

  try {
    const url = new URL("https://api.cricapi.com/v1/match_bbb");
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("offset", "0");
    url.searchParams.set("id", id);
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    const payload = await response.json().catch(() => ({})) as {
      status?: string; message?: string; data?: unknown; info?: unknown;
    };
    if (!response.ok || (payload.status && payload.status.toLowerCase() !== "success")) {
      return NextResponse.json({
        error: payload.message ?? "Ball-by-ball commentary is unavailable for this match or API plan. Check that match_bbb is enabled in your CricketData account.",
        providerStatus: payload.status ?? response.status,
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    if (payload.data == null) {
      return NextResponse.json({
        error: "The provider did not return ball-by-ball data for this match. It may not be supported by your current API plan.",
        info: payload.info ?? null,
      }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ data: payload.data, info: payload.info ?? null, mode: "provider" }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
    });
  } catch {
    return NextResponse.json({ error: "Could not connect to CricketData commentary service." }, { status: 502 });
  }
}

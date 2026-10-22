"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowRight, Bell, ChevronDown, CircleDot, Clock3, Menu,
  MessageCircle, Radio, Search, ShieldCheck, Star, Trophy, X,
} from "lucide-react";

type Match = {
  id: string; format: "T20" | "ODI" | "TEST"; status: "LIVE" | "UPCOMING" | "RESULT";
  series: string; venue: string; startTime: string;
  teamA: { name: string; code: string; score?: string; overs?: string };
  teamB: { name: string; code: string; score?: string; overs?: string };
  summary: string; isDemo: boolean;
};
type ApiResponse = { matches?: Match[]; mode?: string; message?: string; providerConfigured?: boolean };
type ScorecardRow = Record<string, string | number | boolean | null | undefined>;
type ScorecardInnings = { inning?: string; batting?: ScorecardRow[]; bowling?: ScorecardRow[] };
type ScorecardPayload = {
  data?: { name?: string; scorecard?: ScorecardInnings[] };
  error?: string;
};
type CommentaryBall = { over: string; text: string; runs?: string; wicket?: boolean };
type CommentaryPayload = { data?: unknown; error?: string; info?: unknown };

function normalizeCommentary(data: unknown): CommentaryBall[] {
  const found: CommentaryBall[] = [];
  const seen = new Set<string>();
  const walk = (value: unknown, depth = 0) => {
    if (depth > 7 || value == null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, depth + 1));
      return;
    }
    if (typeof value !== "object") return;
    const row = value as Record<string, unknown>;
    const text = displayScorecardValue(row.commentary ?? row.comment ?? row.comm ?? row.description ?? row.text ?? row.event);
    const overValue = displayScorecardValue(row.over ?? row.overNumber ?? row.over_number ?? row.overNo);
    const ballValue = displayScorecardValue(row.ball ?? row.ballNumber ?? row.ball_number ?? row.delivery);
    if (text !== "—" && text.length > 2) {
      const over = overValue === "—" ? "" : overValue;
      const ball = ballValue === "—" ? "" : ballValue;
      const label = over ? `${over}${ball && !over.includes(".") ? `.${ball}` : ""}` : ball;
      const key = `${label}|${text}`;
      if (!seen.has(key)) {
        seen.add(key);
        found.push({ over: label, text, runs: displayScorecardValue(row.runs ?? row.run ?? row.totalRuns), wicket: Boolean(row.wicket ?? row.isWicket ?? row.is_wicket) });
      }
    }
    for (const [key, child] of Object.entries(row)) {
      if (/comment|ball|over|delivery|event|data|inning|innings|bbb/i.test(key)) walk(child, depth + 1);
    }
  };
  walk(data);
  return found;
}

const fallbackMatches: Match[] = [
  { id:"demo-1",format:"T20",status:"LIVE",series:"International T20 • Demo match",venue:"Sample Cricket Ground",startTime:"In progress",teamA:{name:"India",code:"IND",score:"168/4",overs:"18.2"},teamB:{name:"Australia",code:"AUS",score:"—",overs:"Yet to bat"},summary:"Sample scoreboard — not live data",isDemo:true },
  { id:"demo-2",format:"ODI",status:"UPCOMING",series:"One Day International • Demo fixture",venue:"National Cricket Stadium",startTime:"Today • 7:00 PM IST",teamA:{name:"South Africa",code:"SA"},teamB:{name:"New Zealand",code:"NZ"},summary:"Fixture preview • Sample schedule",isDemo:true },
  { id:"demo-3",format:"TEST",status:"RESULT",series:"Test Championship • Demo result",venue:"The Oval",startTime:"Completed",teamA:{name:"England",code:"ENG",score:"312 & 184"},teamB:{name:"Pakistan",code:"PAK",score:"251 & 210"},summary:"Sample result — not official",isDemo:true },
];

const filters = ["All Matches", "Live", "Upcoming", "Results"] as const;
type Filter = typeof filters[number];

function statusLabel(status: Match["status"]) {
  return status === "LIVE" ? "LIVE" : status === "UPCOMING" ? "UPCOMING" : "RESULT";
}

function displayScorecardValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(displayScorecardValue).filter((part) => part !== "—").join(", ") || "—";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["name", "fullName", "full_name", "playerName", "player_name", "shortName", "shortname", "displayName", "title", "label", "batsman", "batter", "bowler", "player"]) {
      if (record[key] !== undefined && record[key] !== value) {
        const result = displayScorecardValue(record[key]);
        if (result !== "—") return result;
      }
    }
  }
  return "—";
}

export default function Home() {
  const [matches, setMatches] = useState<Match[]>(fallbackMatches);
  const [mode, setMode] = useState("demo");
  const [notice, setNotice] = useState("Showing sample scores. Connect a cricket data provider for real live updates.");
  const [filter, setFilter] = useState<Filter>("All Matches");
  const [format, setFormat] = useState("All formats");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("demo-1");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [scorecard, setScorecard] = useState<ScorecardPayload["data"] | null>(null);
  const [scorecardError, setScorecardError] = useState("");
  const [scorecardLoading, setScorecardLoading] = useState(false);
  const [commentary, setCommentary] = useState<CommentaryBall[]>([]);
  const [commentaryError, setCommentaryError] = useState("");
  const [commentaryLoading, setCommentaryLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/matches", { cache: "no-store" });
        if (!response.ok) throw new Error("Match feed unavailable");
        const data = (await response.json()) as ApiResponse;
        if (!active) return;
        if (Array.isArray(data.matches)) setMatches(data.matches);
        setMode(data.mode ?? "demo");
        setNotice(data.message ?? "Match feed loaded.");
      } catch {
        if (active) setNotice("Unable to load the match feed. Showing sample scores instead.");
      }
    };
    void load();
    const timer = window.setInterval(load, 900000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const visibleMatches = useMemo(() => matches.filter((match) => {
    const matchesFilter = filter === "All Matches" ||
      (filter === "Live" && match.status === "LIVE") ||
      (filter === "Upcoming" && match.status === "UPCOMING") ||
      (filter === "Results" && match.status === "RESULT");
    const matchesFormat = format === "All formats" || match.format === format;
    const text = [match.series, match.venue, match.teamA.name, match.teamB.name, match.teamA.code, match.teamB.code].join(" ").toLowerCase();
    return matchesFilter && matchesFormat && text.includes(query.toLowerCase().trim());
  }), [matches, filter, format, query]);

  const featured = matches.find((match) => match.id === selected) ?? visibleMatches[0] ?? matches[0];
  const liveCount = matches.filter((match) => match.status === "LIVE").length;

  useEffect(() => {
    setScorecard(null);
    setScorecardError("");
    setCommentary([]);
    setCommentaryError("");
  }, [featured?.id]);

  const loadCommentary = async () => {
    if (!featured || featured.isDemo) {
      setCommentaryError("Choose a real match from the CricketData feed first.");
      return;
    }
    setCommentaryLoading(true);
    setCommentaryError("");
    setCommentary([]);
    try {
      const response = await fetch(`/api/commentary?id=${encodeURIComponent(featured.id)}`, { cache: "no-store" });
      const payload = (await response.json()) as CommentaryPayload;
      if (!response.ok || payload.error) throw new Error(payload.error ?? "Ball-by-ball commentary is unavailable for this match.");
      const balls = normalizeCommentary(payload.data);
      if (!balls.length) throw new Error("The provider returned data, but no recognizable delivery commentary was found. The response format or API access may differ for this match.");
      setCommentary(balls);
    } catch (error) {
      setCommentaryError(error instanceof Error ? error.message : "Unable to load ball-by-ball commentary.");
    } finally {
      setCommentaryLoading(false);
    }
  };

  const loadScorecard = async () => {
    if (!featured || featured.isDemo) {
      setScorecardError("Choose a real match from the CricketData feed first.");
      return;
    }
    setScorecardLoading(true);
    setScorecardError("");
    setScorecard(null);
    try {
      const response = await fetch(`/api/scorecard?id=${encodeURIComponent(featured.id)}`, { cache: "no-store" });
      const payload = (await response.json()) as ScorecardPayload;
      if (!response.ok || payload.error) throw new Error(payload.error ?? "Scorecard is not available for this match.");
      setScorecard(payload.data ?? null);
      if (!payload.data) setScorecardError("The provider returned no scorecard data for this match.");
    } catch (error) {
      setScorecardError(error instanceof Error ? error.message : "Unable to load scorecard.");
    } finally {
      setScorecardLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-paper text-slate-900">
      <div className="topline"><span className="topline-dot" /> YOUR DAILY DOSE OF CRICKET <span className="topline-divider">/</span> SCORES • STORIES • STATS</div>
      <header className="site-header">
        <a className="brand" href="#" aria-label="Cricscore home"><span className="brand-mark"><CircleDot size={23} strokeWidth={2.7}/></span><span>cric<span className="brand-light">score</span><small>THE GAME, LIVE.</small></span></a>
        <nav className={mobileMenu ? "main-nav nav-open" : "main-nav"}>
          <a className="nav-active" href="#matches" onClick={() => setMobileMenu(false)}>Home</a>
          <a href="#matches" onClick={() => {setFilter("Live");setMobileMenu(false);}}>Live scores <span className="nav-live-dot"/></a>
          <a href="#matches" onClick={() => {setFilter("Upcoming");setMobileMenu(false);}}>Fixtures</a>
          <a href="#matches" onClick={() => {setFilter("Results");setMobileMenu(false);}}>Results</a>
          <a href="#commentary" onClick={() => setMobileMenu(false)}>Commentary</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button" aria-label="Notifications" title="Notifications coming soon"><Bell size={19}/></button>
          <a className="follow-button" href="#matches"><Star size={16}/> Follow cricket</a>
          <button className="mobile-menu-button" aria-label="Toggle menu" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X/> : <Menu/>}</button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line"/> THE WORLD OF CRICKET, AT A GLANCE</div>
          <h1>Every ball.<br/>Every <span>moment.</span></h1>
          <p>All the action, right as it happens. Follow live scores, sharp commentary and the moments that make cricket unforgettable.</p>
          <div className="hero-buttons"><a href="#matches" className="primary-button">Explore matches <ArrowRight size={17}/></a><a href="#commentary" className="text-button"><Radio size={17}/> Ball-by-ball updates</a></div>
          <div className="hero-trust"><span><ShieldCheck size={16}/> Scores in one place</span><span><Activity size={16}/> Match centre</span></div>
        </div>
        <div className="hero-art" aria-label="Cricket match illustration">
          <div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/>
          <div className="art-sun"/>
          <div className="art-stumps"><i/><i/><i/><b/><b/></div>
          <div className="art-ball"/>
          <div className="art-ground"><div className="ground-pitch"/><div className="ground-ring"/></div>
          <div className="art-score-chip"><span className="chip-live"><i/> MATCH CENTRE</span><strong>CRICKET, <em>CONNECTED.</em></strong><small>One game. A million moments.</small></div>
          <span className="art-label label-top">EST. FOR FANS</span><span className="art-label label-bottom">FOLLOW EVERY RUN ↗</span>
        </div>
      </section>

      <section className="stats-strip">
        <div className="stat-cell"><span className="stat-icon"><Radio size={18}/></span><div><strong>{liveCount.toString().padStart(2,"0")} <i>matches</i></strong><small>Live on the board</small></div></div>
        <div className="stat-cell"><span className="stat-icon"><Trophy size={18}/></span><div><strong>ALL <i>formats</i></strong><small>Test • ODI • T20</small></div></div>
        <div className="stat-cell"><span className="stat-icon"><MessageCircle size={18}/></span><div><strong>BALL <i>by ball</i></strong><small>Every detail matters</small></div></div>
        <div className="stat-status"><span className={mode === "demo" ? "status-dot status-demo" : "status-dot"}/>{mode === "demo" ? "DEMO MODE" : "FEED STATUS"}<small>{mode === "demo" ? "Live provider not connected" : "Checking feed configuration"}</small></div>
      </section>

      <section className="matches-section" id="matches">
        <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> THE SCOREBOARD</div><h2>Match <span>centre.</span></h2><p>Everything happening on the cricket field, in one place.</p></div><a className="view-all" href="#all-matches">View all matches <ArrowRight size={16}/></a></div>
        <div className="filter-bar">
          <div className="filter-tabs" role="tablist" aria-label="Match status">{filters.map((item) => <button key={item} role="tab" aria-selected={filter === item} className={filter === item ? "filter-tab filter-active" : "filter-tab"} onClick={() => setFilter(item)}>{item}{item === "Live" && liveCount > 0 && <span className="filter-count">{liveCount}</span>}</button>)}</div>
          <div className="filter-controls"><label className="search-box"><Search size={17}/><input aria-label="Search teams or series" placeholder="Search teams, series..." value={query} onChange={(e) => setQuery(e.target.value)}/></label><label className="format-select"><select aria-label="Filter by format" value={format} onChange={(e) => setFormat(e.target.value)}><option>All formats</option><option>T20</option><option>ODI</option><option>TEST</option></select><ChevronDown size={15}/></label></div>
        </div>
        {mode !== "live" && <div className="demo-notice"><span className="notice-mark">i</span><span><strong>{mode === "demo" ? "Preview mode:" : "Feed status:"}</strong> {notice}{mode === "demo" ? " Scores below are illustrative, not real-time match data." : ""}</span></div>}
        <div className="match-grid" id="all-matches">
          {visibleMatches.length ? visibleMatches.map((match) => (
            <article key={match.id} className={selected === match.id ? "match-card match-card-selected" : "match-card"}>
              <div className="match-card-top"><span className="format-pill">{match.format}</span><span className="match-series">{match.series}</span><button className={favorites.includes(match.id) ? "favorite-button favorited" : "favorite-button"} aria-label="Toggle favorite" onClick={() => setFavorites((old) => old.includes(match.id) ? old.filter((id) => id !== match.id) : [...old, match.id])}><Star size={17} fill={favorites.includes(match.id) ? "currentColor" : "none"}/></button></div>
              <div className="match-status-line"><span className={match.status === "LIVE" ? "live-pill" : "neutral-pill"}>{match.status === "LIVE" && <i/>}{statusLabel(match.status)}</span><span className="match-time"><Clock3 size={13}/>{match.startTime}</span></div>
              <button className="teams-score" onClick={() => setSelected(match.id)} aria-label={"View " + match.teamA.name + " versus " + match.teamB.name}>
                <span className="team-row"><span className={"team-badge badge-" + match.teamA.code.toLowerCase()}>{match.teamA.code.slice(0,3)}</span><span className="team-name">{match.teamA.name}</span><span className="team-score">{match.teamA.score ?? "—"}{match.teamA.overs && <small>{match.teamA.overs} ov</small>}</span></span>
                <span className="team-row"><span className={"team-badge badge-" + match.teamB.code.toLowerCase()}>{match.teamB.code.slice(0,3)}</span><span className="team-name">{match.teamB.name}</span><span className="team-score">{match.teamB.score ?? "—"}{match.teamB.overs && <small>{match.teamB.overs}</small>}</span></span>
              </button>
              <p className="match-summary">{match.summary}</p>
              <div className="match-card-footer"><span>{match.venue}</span><button onClick={() => setSelected(match.id)}>Match centre <ArrowRight size={14}/></button></div>
            </article>
          )) : <div className="empty-state"><Search size={25}/><strong>No matches found</strong><span>Try another search or change your filters.</span><button onClick={() => {setQuery("");setFormat("All formats");setFilter("All Matches");}}>Clear filters</button></div>}
        </div>
      </section>

      <section className="detail-section" id="commentary">
        <div className="detail-intro"><div className="eyebrow"><span className="eyebrow-line"/> INSIDE THE GAME</div><h2>More than just<br/><span>a score.</span></h2><p>Follow the story behind every innings. From crucial partnerships to game-changing spells, the details make the difference.</p><div className="detail-feature"><span><MessageCircle size={18}/></span><div><strong>Ball-by-ball commentary</strong><small>Follow every delivery, wicket and boundary.</small></div></div><div className="detail-feature"><span><Activity size={18}/></span><div><strong>Stats that tell the story</strong><small>Batting, bowling, overs and match context.</small></div></div></div>
        <div className="commentary-panel">
          <div className="commentary-head"><div><span className="commentary-kicker"><span className="status-dot status-demo"/> MATCH CENTRE</span><h3>{featured ? featured.teamA.name + " vs " + featured.teamB.name : "Match commentary"}</h3><small>{featured?.series ?? "Select a match"}{featured?.isDemo ? " • Sample match" : ""}</small></div><span className="format-pill">{featured?.format ?? "T20"}</span></div>
          <div className="commentary-score"><div><span>{featured?.teamA.code ?? "TEAM A"}</span><strong>{featured?.teamA.score ?? "—"}</strong><small>{featured?.teamA.overs ? featured.teamA.overs + " overs" : "Score unavailable"}</small></div><span className="versus">VS</span><div><span>{featured?.teamB.code ?? "TEAM B"}</span><strong>{featured?.teamB.score ?? "—"}</strong><small>{featured?.teamB.overs ?? "Score unavailable"}</small></div></div>
          <div className="commentary-feed">
            <div className="feed-heading"><span>SCORECARD & COMMENTARY</span><span className="demo-tag">{featured?.isDemo ? "DEMO" : "PROVIDER DATA"}</span></div>
            <div className="scorecard-action">
              <div><strong>Match scorecard</strong><p>Load batting and bowling figures for the selected match.</p></div>
              <button className="primary-button" onClick={loadScorecard} disabled={scorecardLoading || !featured || featured.isDemo}>{scorecardLoading ? "Loading…" : "Load scorecard"} <ArrowRight size={15}/></button>
            </div>
            {scorecardError && <p className="scorecard-error" role="status">{scorecardError}</p>}
            <div className="scorecard-action commentary-action">
              <div><strong>Ball-by-ball commentary</strong><p>Fetch actual delivery commentary when enabled by your CricketData plan.</p></div>
              <button className="primary-button" onClick={loadCommentary} disabled={commentaryLoading || !featured || featured.isDemo}>{commentaryLoading ? "Loading…" : "Load commentary"} <ArrowRight size={15}/></button>
            </div>
            {commentaryError && <p className="scorecard-error" role="status">{commentaryError}</p>}
            {commentary.length > 0 && <div className="ball-commentary-list" aria-live="polite">
              {commentary.map((ball, index) => <article className="ball-commentary-item" key={`${ball.over}-${index}`}>
                <span className="ball-over">{ball.over || index + 1}</span>
                <div><p>{ball.text}</p>{ball.runs && ball.runs !== "—" && <small>Runs: {ball.runs}</small>}</div>
                {ball.wicket && <span className="wicket-tag">WICKET</span>}
              </article>)}
            </div>}
            {scorecard?.scorecard?.length ? scorecard.scorecard.map((innings, inningsIndex) => (
              <div className="innings-card" key={innings.inning ?? inningsIndex}>
                <h4>{innings.inning ?? `Innings ${inningsIndex + 1}`}</h4>
                {innings.batting?.length ? <>
                  <h5>Batting</h5>
                  <div className="scorecard-table-wrap"><table className="scorecard-table"><thead><tr><th>Batter</th><th>Dismissal</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead><tbody>
                    {innings.batting.map((row, rowIndex) => <tr key={`${displayScorecardValue(row.batsman ?? row.batter ?? row.player ?? row.name ?? rowIndex)}-${rowIndex}`}><td>{displayScorecardValue(row.batsman ?? row.batter ?? row.player ?? row.name ?? row.playerName ?? row.fullName)}</td><td>{displayScorecardValue(row.dismissal ?? row.out ?? row.outDesc ?? row.out_desc)}</td><td>{String(row.r ?? row.runs ?? "—")}</td><td>{String(row.b ?? row.balls ?? "—")}</td><td>{String(row["4s"] ?? row.fours ?? "—")}</td><td>{String(row["6s"] ?? row.sixes ?? "—")}</td><td>{String(row.sr ?? row.strikeRate ?? "—")}</td></tr>)}
                  </tbody></table></div>
                </> : null}
                {innings.bowling?.length ? <>
                  <h5>Bowling</h5>
                  <div className="scorecard-table-wrap"><table className="scorecard-table"><thead><tr><th>Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Eco</th></tr></thead><tbody>
                    {innings.bowling.map((row, rowIndex) => <tr key={`${displayScorecardValue(row.bowler ?? row.player ?? row.name ?? rowIndex)}-${rowIndex}`}><td>{displayScorecardValue(row.bowler ?? row.player ?? row.name ?? row.playerName ?? row.fullName)}</td><td>{String(row.o ?? row.overs ?? "—")}</td><td>{String(row.m ?? row.maidens ?? "—")}</td><td>{String(row.r ?? row.runs ?? "—")}</td><td>{String(row.w ?? row.wickets ?? "—")}</td><td>{String(row.eco ?? row.economy ?? "—")}</td></tr>)}
                  </tbody></table></div>
                </> : null}
              </div>
            )) : !scorecardError ? <div className="commentary-empty"><span className="commentary-icon"><MessageCircle size={21}/></span><strong>Ball-by-ball updates aren't available here yet.</strong><p>CricketData's published Fantasy Ball-By-Ball documentation currently says that endpoint is in testing. The current-matches API only supplies match-level score summaries. The scorecard button can retrieve innings figures when the provider makes them available for that match and plan.</p></div> : null}
          </div>
          <div className="commentary-foot"><span><CircleDot size={13}/> {featured?.venue ?? "Match venue"}</span><span>Data feed: {mode === "demo" ? "Not connected" : "Setup required"}</span></div>
        </div>
      </section>

      <section className="cta-band"><div className="cta-icon"><Star size={23}/></div><div><span>BUILT FOR THE LOVE OF CRICKET</span><h2>Your game. Your moments. <em>Cricscore.</em></h2><p>One destination for the sport that brings us all together.</p></div><a href="#matches" className="cta-button">Explore scores <ArrowRight size={17}/></a></section>
      <footer className="site-footer"><a className="brand footer-brand" href="#"><span className="brand-mark"><CircleDot size={21}/></span><span>cric<span className="brand-light">score</span><small>THE GAME, LIVE.</small></span></a><span>Made for cricket fans, everywhere.</span><span>© {new Date().getFullYear()} Cricscore</span></footer>
    </main>
  );
}

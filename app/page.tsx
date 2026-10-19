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
          <div className="commentary-feed"><div className="feed-heading"><span>COMMENTARY</span><span className="demo-tag">PREVIEW</span></div><div className="commentary-empty"><span className="commentary-icon"><MessageCircle size={21}/></span><strong>Every ball has a story.</strong><p>Ball-by-ball commentary will appear here once a live cricket data provider is connected. This preview does not contain live delivery updates.</p></div></div>
          <div className="commentary-foot"><span><CircleDot size={13}/> {featured?.venue ?? "Match venue"}</span><span>Data feed: {mode === "demo" ? "Not connected" : "Setup required"}</span></div>
        </div>
      </section>

      <section className="cta-band"><div className="cta-icon"><Star size={23}/></div><div><span>BUILT FOR THE LOVE OF CRICKET</span><h2>Your game. Your moments. <em>Cricscore.</em></h2><p>One destination for the sport that brings us all together.</p></div><a href="#matches" className="cta-button">Explore scores <ArrowRight size={17}/></a></section>
      <footer className="site-footer"><a className="brand footer-brand" href="#"><span className="brand-mark"><CircleDot size={21}/></span><span>cric<span className="brand-light">score</span><small>THE GAME, LIVE.</small></span></a><span>Made for cricket fans, everywhere.</span><span>© {new Date().getFullYear()} Cricscore</span></footer>
    </main>
  );
}

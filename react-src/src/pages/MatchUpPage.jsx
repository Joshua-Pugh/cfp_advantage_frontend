import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import LoadingDots from "../components/LoadingDots";
import PageMetadata from "../components/PageMetadata";
import StandardPage from "../components/StandardPage";
import TeamLogo from "../components/TeamLogo";
import TeamContextTags, { PollRankTag } from "../components/TeamContextTags";
import { formatPercent, formatProjectionMargin, matchupDateLabel } from "../lib/formatters";
import { api } from "../lib/api";
import { appendAskAdvHistory, clearAskAdvHistory, readAskAdvHistory } from "../lib/askAdvHistory";
import { matchupPath } from "../lib/urls";
import { matchupNarrative, plainAdvantage } from "../lib/matchupNarrative";

const PAGE_SIZE = 20;
const LIVE_BOARD_LIMIT = 5;

function matchupSortTime(matchup) {
  const parsed = new Date(matchup?.kickoff_at || matchup?.start_date || matchup?.date || "");
  return Number.isNaN(parsed.getTime()) ? Number.MAX_SAFE_INTEGER : parsed.getTime();
}

function matchupDateHeading(matchup) {
  const parsed = new Date(matchup?.kickoff_at || matchup?.start_date || matchup?.date || "");
  if (Number.isNaN(parsed.getTime())) return matchupDateLabel(matchup);
  return parsed.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" });
}

function number(value, digits = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : "-";
}

function advantagesFor(matchup, team) {
  const values = matchup.key_advantages?.[team];
  return values?.length ? values : ["No clear edge in the displayed comparison."];
}

function profileRate(profile, key, fallback) {
  return formatPercent(profile?.[key]?.rate ?? fallback, 1);
}

function TeamContext({ context, name, rank }) {
  if (!context) {
    return <article className="matchup-team-context is-limited"><div className="matchup-team-heading"><h3>{name}</h3><TeamContextTags rank={rank} /></div><p>A complete FBS Control Framework profile is not available for this side.</p></article>;
  }
  const profile = context.football_profile || {};
  const stats = context.comparison_stats || {};
  const familiarStats = [
    ["Yards / Game", stats.yards_per_game, (value) => number(value)],
    ["Yards / Play", stats.yards_per_play, (value) => number(value, 2)],
    ["Pass Yards / Game", stats.pass_yards_per_game, (value) => number(value)],
    ["Rush Yards / Game", stats.rush_yards_per_game, (value) => number(value)],
    ["Points / Drive", stats.points_per_drive, (value) => number(value, 2)],
    ["First Downs / Game", stats.first_downs_per_game, (value) => number(value)],
    ["Completion Rate", stats.completion_rate, (value) => formatPercent(value, 1)],
    ["Third Down Rate", stats.third_down_rate, (value) => formatPercent(value, 1)],
    ["Fourth Down Rate", stats.fourth_down_rate, (value) => formatPercent(value, 1)],
    ["Red-Zone TD Rate", stats.red_zone_td_rate, (value) => formatPercent(value, 1)],
    ["Turnover Margin", stats.turnover_margin, (value) => Number(value) > 0 ? `+${value}` : String(value)],
    ["Possession / Game", stats.possession_minutes_per_game, (value) => `${number(value)} min`],
  ].filter(([, value]) => value != null);
  return <article className="matchup-team-context">
    <div className="matchup-team-heading"><h3>{name}</h3><TeamContextTags rank={rank} /></div>
    <div className="matchup-preview-summary matchup-context-summary"><div><span>Pregame ADV</span><strong>{number(context.pregame_adv_rating)}</strong></div><div><span>ADV SOS</span><strong>{number(context.rolling_adv_sos)}</strong></div><div><span>Recent Form</span><strong>{context.recent_form_label || "-"}</strong></div><div><span>Talent Yield</span><strong>{context.tyi_label || "-"}</strong><small>{number(context.talent_yield_index, 2)}</small></div></div>
    {context.recent_form_note && <p className="matchup-field-note">{context.recent_form_note}</p>}
    <div className="weekly-profile-row"><span>Control Creation</span><strong>{profileRate(profile, "control_creation", context.rolling_control_creation_rate)}</strong></div>
    <div className="weekly-profile-row"><span>Control Finish</span><strong>{profileRate(profile, "control_finish", context.rolling_control_finish_rate)}</strong></div>
    <div className="weekly-profile-row"><span>Control Denial</span><strong>{profileRate(profile, "control_denial", context.rolling_control_denial_rate)}</strong></div>
    {familiarStats.length > 0 && <details className="advanced-matchup-details"><summary>Familiar stat context · {familiarStats.length} stats</summary><div className="advanced-matchup-content matchup-stat-grid">{familiarStats.map(([label, value, formatter]) => <div key={label}><span>{label}</span><strong>{formatter(value)}</strong></div>)}</div>{stats.coverage_note && <p className="matchup-stat-coverage">{stats.coverage_note}</p>}</details>}
  </article>;
}

function AskAdvPanel({ matchup }) {
  const historyScope = `matchup-${matchup.game_id}`;
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(() => readAskAdvHistory(historyScope));

  async function askAdv(event, summaryOnly = false) {
    event?.preventDefault();
    try {
      setLoading(true);
      setError("");
      const askedQuestion = summaryOnly ? "Summarize this matchup." : question.trim();
      const payload = await api("/api/ask-adv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "matchup",
          season: matchup.season,
          week: matchup.week,
          game_id: String(matchup.game_id),
          question: summaryOnly ? "" : askedQuestion,
          history,
        }),
      });
      setResponse(payload);
      setHistory((current) => appendAskAdvHistory(historyScope, current, askedQuestion, payload));
    } catch (askError) {
      console.error("Ask ADV failed:", askError);
      setError("Ask ADV is temporarily unavailable. The published pick and matchup data are still available above.");
    } finally {
      setLoading(false);
    }
  }

  function clearConversation() {
    setHistory([]);
    setQuestion("");
    setResponse(null);
    setError("");
    clearAskAdvHistory(historyScope);
  }

  return <section className="ask-adv-panel" aria-label="Ask ADV matchup explainer">
    <div className="ask-adv-heading"><div><p className="eyebrow">AI-assisted matchup explainer</p><h3>Ask ADV</h3><p>Plain-language answers grounded only in this frozen CFP Advantage snapshot.</p></div><button className="secondary-action" type="button" onClick={(event) => askAdv(event, true)} disabled={loading}>{loading ? "Thinking…" : "Summarize Matchup"}</button></div>
    <form className="ask-adv-form" onSubmit={askAdv}><label htmlFor={`ask-adv-${matchup.game_id}`}>Ask about the pick, matchup edge, or risk</label><div><input id={`ask-adv-${matchup.game_id}`} value={question} maxLength={400} onChange={(event) => setQuestion(event.target.value)} placeholder="What gives the underdog a path to win?" /><button type="submit" disabled={loading || !question.trim()}>{loading ? "Thinking…" : "Ask ADV"}</button></div></form>
    {error && <p className="status-line warn">{error}</p>}
    {response?.answer && <article className="ask-adv-answer"><p>{response.answer}</p>{response.key_points?.length > 0 && <ul>{response.key_points.map((point) => <li key={point}>{point}</li>)}</ul>}{response.uncertainty && <p><strong>Uncertainty:</strong> {response.uncertainty}</p>}<small>{response.disclosure}</small></article>}
    {history.length > 0 && <button className="ask-adv-clear" type="button" onClick={clearConversation}>Start a new Ask ADV conversation</button>}
  </section>;
}

function MatchupDetail({ matchup, onClose }) {
  const limited = matchup.projection_limited || matchup.projection_unavailable;
  const narrative = matchupNarrative(matchup);
  return <section className="insight-panel matchup-preview-detail matchup-inline-detail" aria-label="Selected matchup analysis">
    <div className="panel-heading matchup-detail-heading"><div><p className="eyebrow">Full Breakdown</p><h2><span className="matchup-heading-team"><PollRankTag rank={matchup.away_ap_rank} />{matchup.away_full_name || matchup.away_team}</span> at <span className="matchup-heading-team"><PollRankTag rank={matchup.home_ap_rank} />{matchup.home_full_name || matchup.home_team}</span></h2><MatchupConferenceContext matchup={matchup} /><p>{matchup.date} · {matchup.game_type || "College Football"}</p></div><button className="secondary-action" type="button" onClick={onClose}>Close Breakdown</button></div>
    <div className="matchup-preview-summary"><div><span>Model Lean</span><strong>{matchup.projected_winner_full_name || "Not Published"}</strong></div><div><span>{matchup.margin_label || "Projected Margin"}</span><strong>{matchup.projected_margin_abs == null ? "-" : `By ${formatProjectionMargin(matchup.projected_margin_abs)}`}</strong></div><div><span>Matchup Conviction</span><strong>{matchup.matchup_conviction?.label || "-"}</strong></div><div><span>Projection Closeness</span><strong>{formatPercent(matchup.projection_closeness, 0)}</strong></div></div>
    <div className="matchup-casual-summary"><div><span>Why ADV leans this way</span><p>{narrative.why}</p></div><div><span>What could change the game</span><p>{narrative.risk}</p></div></div>
    <AskAdvPanel key={matchup.game_id} matchup={matchup} />
    <div className="matchup-story-panel"><div className="matchup-story-heading"><h3>{matchup.context_label || "Pregame Context"}</h3><p>{matchup.context_note}</p></div>{matchup.matchup_conviction?.note && <p>{matchup.matchup_conviction.note}</p>}</div>
    {limited ? <div className="matchup-limited-note"><strong>Limited opponent coverage</strong><p>This matchup uses the labeled opponent-tier view. A full two-team ADV and Control Framework comparison is not published when one side is outside supported FBS coverage.</p></div> : <><div className="matchup-advantages-grid">{[matchup.away_team, matchup.home_team].map((team) => <article key={team}><span>{team} advantages</span><ul>{advantagesFor(matchup, team).map((item) => <li key={item}><strong>{plainAdvantage(item)}</strong><small>{item}</small></li>)}</ul></article>)}</div><div className="matchup-context-columns"><TeamContext context={matchup.away_context} name={matchup.away_full_name || matchup.away_team} rank={matchup.away_ap_rank} /><TeamContext context={matchup.home_context} name={matchup.home_full_name || matchup.home_team} rank={matchup.home_ap_rank} /></div><div className="advanced-reading-guide"><strong>How to read the context</strong><p>Recent Form compares a team with its own season baseline. Talent Yield compares current performance with roster expectation. Both explain the matchup and do not override the published model margin.</p></div></>}
  </section>;
}

function MatchupTeamLine({ team, fullName, rank, logos }) {
  return <div className="matchup-list-team"><TeamLogo team={team} logos={logos} label={fullName} /><div><strong><PollRankTag rank={rank} />{fullName}</strong></div></div>;
}

function MatchupConferenceContext({ matchup }) {
  const away = String(matchup.away_conference || "").trim();
  const home = String(matchup.home_conference || "").trim();
  const same = away && home && away.toLowerCase() === home.toLowerCase();
  return <div className="matchup-list-context">
    {same ? <><span>Conference Game</span><TeamContextTags conference={away} /></> : <div className="matchup-nonconference-tags"><TeamContextTags conference={away} /><b>Non-Conference</b><TeamContextTags conference={home} /></div>}
  </div>;
}

function MatchupRow({ matchup, score, logos, selected, boardSelected, boardFull, onSelect, onToggleBoard }) {
  const awayName = matchup.away_full_name || matchup.away_team;
  const homeName = matchup.home_full_name || matchup.home_team;
  const modelRead = matchup.projected_winner_full_name ? `${matchup.projected_winner_full_name} by ${formatProjectionMargin(matchup.projected_margin_abs)}` : "Not a certified pick";
  const narrative = matchupNarrative(matchup);
  const isComplete = score?.status === "completed";
  const isLive = score?.status === "in_progress";
  const awayScore = score?.away_team?.points;
  const homeScore = score?.home_team?.points;
  const pickedWinner = matchup.projected_winner_full_name || matchup.projected_winner;
  const actualWinner = isComplete && Number.isFinite(awayScore) && Number.isFinite(homeScore)
    ? (awayScore > homeScore ? score?.away_team?.name : score?.home_team?.name)
    : null;
  const pickCorrect = actualWinner && pickedWinner
    ? actualWinner.toLowerCase().includes(String(pickedWinner).toLowerCase()) || String(pickedWinner).toLowerCase().includes(actualWinner.toLowerCase())
    : null;
  return <article className={`matchup-list-row${selected ? " is-selected" : ""}`}>
    <div className="matchup-list-date"><span>Date</span><strong>{matchupDateLabel(matchup)}</strong><small className={isComplete ? "is-complete" : isLive ? "is-live" : ""}>{isComplete ? "Complete" : isLive ? "Live" : "Upcoming"}</small></div>
    <div className="matchup-list-teams"><MatchupTeamLine team={matchup.away_team} fullName={awayName} rank={matchup.away_ap_rank} conference={matchup.away_conference} logos={logos} /><span>vs</span><MatchupTeamLine team={matchup.home_team} fullName={homeName} rank={matchup.home_ap_rank} conference={matchup.home_conference} logos={logos} /></div>
    <MatchupConferenceContext matchup={matchup} />
    <div className={`matchup-list-read${isComplete ? " is-complete" : ""}`}><span>{isComplete ? "Final Result" : "ADV Pick"}</span>{isComplete ? <><strong>{score.away_team?.name || awayName} {awayScore} · {score.home_team?.name || homeName} {homeScore}</strong><p><b>Frozen ADV pick:</b> {modelRead}</p>{pickCorrect != null && <small>{pickCorrect ? "Unofficial model win" : "Unofficial model loss"}</small>}</> : <><strong>{modelRead}</strong><p><b>Why:</b> {narrative.why}</p><p><b>Risk:</b> {narrative.risk}</p><small>{narrative.conviction}</small></> }</div>
    <div className="matchup-list-actions">{!matchup.projection_unavailable && <button type="button" onClick={onSelect}>{selected ? "Close Breakdown" : "Full Breakdown"}</button>}<button className={boardSelected ? "is-selected" : ""} type="button" onClick={onToggleBoard} disabled={!boardSelected && boardFull}>{boardSelected ? "On Live Board" : boardFull ? "Live Board Full" : "Add to Live Board"}</button></div>
  </article>;
}

function scoreboardStatus(game) {
  if (game?.status === "completed") return "Final";
  if (game?.status === "in_progress") return [game.period ? `Q${game.period}` : "Live", game.clock].filter(Boolean).join(" · ");
  const kickoff = new Date(game?.start_date || "");
  return Number.isNaN(kickoff.getTime()) ? "Scheduled" : kickoff.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" });
}

function ScoreboardCard({ game, matchup, selected, boardFull, onToggle }) {
  const away = game?.away_team || { name: matchup?.away_full_name || matchup?.away_team };
  const home = game?.home_team || { name: matchup?.home_full_name || matchup?.home_team };
  const gameId = String(game?.game_id ?? matchup?.game_id);
  return <article className={`official-score-card live-board-score-card${game?.status === "in_progress" ? " is-live" : ""}${game?.status === "completed" ? " is-final" : ""}`}><div className="official-score-status"><strong>{scoreboardStatus(game)}</strong>{game?.tv && <span>{game.tv}</span>}</div><div className="official-score-teams">{[[away, matchup?.away_team], [home, matchup?.home_team]].map(([team, fallback]) => <div className="score-team-row" key={team?.name || fallback}><span className="score-team-logo">{team?.team_id ? <img src={`https://cdn.collegefootballdata.com/logos/48/${team.team_id}.png`} alt="" loading="lazy" /> : <span>{String(team?.name || fallback || "-").slice(0, 2).toUpperCase()}</span>}</span><span className="score-team-name">{team?.name || fallback || "-"}</span><strong>{team?.points ?? "-"}</strong></div>)}</div><button className={`score-select-button${selected ? " is-selected" : ""}`} type="button" onClick={() => onToggle(gameId)} disabled={!selected && boardFull}>{selected ? "Selected" : boardFull ? "Live Board Full" : "Add to Live Board"}</button></article>;
}

function SelectedBoardRow({ id, game, matchup, onToggle }) {
  const away = game?.away_team?.name || matchup?.away_full_name || matchup?.away_team || "Away";
  const home = game?.home_team?.name || matchup?.home_full_name || matchup?.home_team || "Home";
  const pick = matchup?.projected_winner_full_name ? `${matchup.projected_winner_full_name} by ${formatProjectionMargin(matchup.projected_margin_abs)}` : "Scoreboard only";
  return <article className="selected-board-row"><div><strong>{away} <span>at</span> {home}</strong><small>ADV Pick · {pick}</small></div><button type="button" onClick={() => onToggle(id)}>Remove</button></article>;
}

function LiveScoreboard({ matchups, selectedIds, onToggle, onClear, onGamesLoaded }) {
  const [games, setGames] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function loadScores() { try { setLoading(true); setError(""); const payload = await api("/api/game-day/scoreboard?classification=fbs"); const nextGames = Array.isArray(payload.games) ? payload.games : []; setGames(nextGames); onGamesLoaded(nextGames); } catch (loadError) { console.error("CFP Advantage live scoreboard failed:", loadError); setError("Live scores are temporarily unavailable."); } finally { setLoading(false); } }
  useEffect(() => {
    let active = true;
    api("/api/game-day/scoreboard?classification=fbs")
      .then((payload) => {
        if (active) {
          const nextGames = Array.isArray(payload.games) ? payload.games : [];
          setGames(nextGames);
          onGamesLoaded(nextGames);
        }
      })
      .catch((loadError) => {
        if (!active) return;
        console.error("CFP Advantage live scoreboard failed:", loadError);
        setError("Live scores are temporarily unavailable.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [onGamesLoaded]);
  const scoresById = useMemo(() => Object.fromEntries(games.map((game) => [String(game.game_id), game])), [games]);
  const matchupsById = useMemo(() => Object.fromEntries(matchups.map((game) => [String(game.game_id), game])), [matchups]);
  const selectedGames = selectedIds.map((id) => ({ game: scoresById[id], matchup: matchupsById[id], id })).filter((item) => item.game || item.matchup);
  const boardFull = selectedIds.length >= LIVE_BOARD_LIMIT;
  return <section className="live-scoreboard-panel v2-live-scoreboard" id="live-scoreboard">
    <aside className="live-scoreboard-sidebar"><p className="eyebrow">CFBD Live Feed</p><h2>College Football Scoreboard</h2><p>Live scores are for convenience and do not alter frozen CFP Advantage projections or official grades.</p><button className="secondary-action" type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? "Hide Live Scoreboard" : "Show Live Scoreboard"}</button><div className="live-board-selection"><div className="live-board-heading"><div><strong>Your Live Board</strong><p>Select games to keep together here.</p></div>{selectedIds.length > 0 && <button type="button" onClick={onClear}>Clear</button>}</div>{selectedGames.length ? <div className="selected-board-list">{selectedGames.map((item) => <SelectedBoardRow key={item.id} {...item} onToggle={onToggle} />)}</div> : <p className="live-board-empty">No games selected yet.</p>}</div></aside>
    <div className="live-scoreboard-main"><div className="live-scoreboard-toolbar"><strong>{selectedIds.length} selected</strong><button type="button" onClick={onClear} disabled={!selectedIds.length}>Clear</button><button type="button" onClick={loadScores} disabled={loading}>{loading ? "Refreshing…" : "Refresh Scores"}</button></div>{expanded && <div className="live-scoreboard-embed">{loading ? <LoadingDots text="Loading live scores" /> : error ? <p className="status-line warn">{error}</p> : games.length ? <div className="official-score-grid">{games.map((game) => <ScoreboardCard key={game.game_id} game={game} matchup={matchupsById[String(game.game_id)]} selected={selectedIds.includes(String(game.game_id))} boardFull={boardFull} onToggle={onToggle} />)}</div> : <p>No live or scheduled FBS games are available right now.</p>}</div>}</div>
  </section>;
}

function MatchUpPage() {
  const navigate = useNavigate();
  const { gameId: routeGameId } = useParams();
  const [payload, setPayload] = useState(null);
  const [logos, setLogos] = useState({});
  const [localSelectedId, setLocalSelectedId] = useState(null);
  const [selectedLiveBoardIds, setSelectedLiveBoardIds] = useState([]);
  const [scoreGames, setScoreGames] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { Promise.all([api("/api/product-a/current-week?limit=150&include_schedule_only=true"), fetch("/team-logos.json").then((response) => response.ok ? response.json() : { teams: {} })]).then(([weekly, logoPayload]) => { setPayload(weekly); setLogos(logoPayload.teams || {}); }).catch((loadError) => { console.error("CFP Advantage matchup board failed:", loadError); setError("The weekly matchup board is temporarily unavailable."); }); }, []);
  const games = useMemo(() => [...(payload?.matchups || [])].sort((left, right) => matchupSortTime(left) - matchupSortTime(right) || String(left.away_full_name || left.away_team).localeCompare(String(right.away_full_name || right.away_team))), [payload]);
  const scoresById = useMemo(() => Object.fromEntries(scoreGames.map((game) => [String(game.game_id), game])), [scoreGames]);
  const filteredGames = useMemo(() => { const needle = query.trim().toLowerCase(); if (!needle) return games; return games.filter((game) => [game.away_team, game.away_full_name, game.home_team, game.home_full_name, game.game_type].some((value) => String(value || "").toLowerCase().includes(needle))); }, [games, query]);
  const routeGameIndex = routeGameId ? games.findIndex((game) => String(game.game_id) === String(routeGameId)) : -1;
  const selectedId = routeGameIndex >= 0 ? String(routeGameId) : localSelectedId;
  const effectiveVisibleCount = routeGameIndex >= 0 ? Math.max(visibleCount, routeGameIndex + 1) : visibleCount;
  const visibleGames = query.trim() ? filteredGames : filteredGames.slice(0, effectiveVisibleCount);
  const selectedMatchup = games.find((game) => String(game.game_id) === selectedId);
  const status = payload?.status || {};

  useEffect(() => {
    if (payload && routeGameId && routeGameIndex < 0) {
      navigate("/matchups", { replace: true });
    }
  }, [navigate, payload, routeGameId, routeGameIndex]);

  function selectMatchup(id, isSelected) {
    if (isSelected) {
      setLocalSelectedId(null);
      navigate("/matchups");
      return;
    }
    setLocalSelectedId(id);
    navigate(matchupPath(id));
  }
  function toggleLiveBoard(gameId) { const id = String(gameId); setSelectedLiveBoardIds((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length < LIVE_BOARD_LIMIT ? [...current, id] : current); }
  const metadataTitle = selectedMatchup
    ? `${selectedMatchup.away_full_name || selectedMatchup.away_team} at ${selectedMatchup.home_full_name || selectedMatchup.home_team} | CFP Advantage`
    : "College Football Matchups | CFP Advantage";
  const metadataDescription = selectedMatchup
    ? `Pregame CFP Advantage matchup context and published model margin for ${selectedMatchup.away_full_name || selectedMatchup.away_team} at ${selectedMatchup.home_full_name || selectedMatchup.home_team}.`
    : "Current college football matchup projections and Control Framework context from CFP Advantage.";

  return <StandardPage className="matchup-page-shell">
    <PageMetadata
      title={metadataTitle}
      description={metadataDescription}
      path={selectedMatchup ? matchupPath(selectedMatchup.game_id) : "/matchups"}
      structuredData={selectedMatchup ? {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        name: `${selectedMatchup.away_full_name || selectedMatchup.away_team} at ${selectedMatchup.home_full_name || selectedMatchup.home_team}`,
        sport: "College Football",
        startDate: selectedMatchup.kickoff_at || selectedMatchup.date,
        url: `https://cfpadvantage.com${matchupPath(selectedMatchup.game_id)}`,
        awayTeam: { "@type": "SportsTeam", name: selectedMatchup.away_full_name || selectedMatchup.away_team },
        homeTeam: { "@type": "SportsTeam", name: selectedMatchup.home_full_name || selectedMatchup.home_team },
      } : null}
    />
    <LiveScoreboard matchups={games} selectedIds={selectedLiveBoardIds} onToggle={toggleLiveBoard} onClear={() => setSelectedLiveBoardIds([])} onGamesLoaded={setScoreGames} />
    <section className="full-slate-panel" id="full-slate"><div className="full-slate-panel-header"><div><p className="eyebrow">Current Week</p><h2>{status.label || "Matchup Intelligence"}</h2><p className="panel-note">Games are ordered by kickoff time. Completed games show their provisional result in the original matchup card; frozen picks and certified grades remain unchanged.</p></div>{payload && <span className="framework-read-label">{games.length} Games</span>}</div><label className="full-slate-inline-search"><span>Find a team or matchup</span><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(PAGE_SIZE); setLocalSelectedId(null); if (routeGameId) navigate("/matchups"); }} placeholder="Search the weekly slate" /></label>
      {!payload && !error && <div className="full-slate-empty"><LoadingDots text="Loading the certified weekly slate" /></div>}{error && <p className="status-line warn">{error}</p>}{payload && games.length === 0 && <div className="full-slate-empty"><strong>No weekly snapshot is available.</strong><p>{payload.weekly_snapshot_note || status.message}</p></div>}{payload && games.length > 0 && filteredGames.length === 0 && <div className="full-slate-empty"><strong>No matchups match that search.</strong></div>}
      {visibleGames.length > 0 && <div className="matchup-list"><div className="full-slate-table">{visibleGames.map((matchup, index) => { const id = String(matchup.game_id); const isSelected = id === selectedId; const dateHeading = matchupDateHeading(matchup); const priorDateHeading = index > 0 ? matchupDateHeading(visibleGames[index - 1]) : null; return <Fragment key={id}>{dateHeading !== priorDateHeading && <h3 className="matchup-date-divider">{dateHeading}</h3>}<MatchupRow matchup={matchup} score={scoresById[id]} logos={logos} selected={isSelected} boardSelected={selectedLiveBoardIds.includes(id)} boardFull={selectedLiveBoardIds.length >= LIVE_BOARD_LIMIT} onSelect={() => selectMatchup(id, isSelected)} onToggleBoard={() => toggleLiveBoard(id)} />{isSelected && selectedMatchup && <MatchupDetail matchup={selectedMatchup} onClose={() => { setLocalSelectedId(null); navigate("/matchups"); }} />}</Fragment>; })}</div>{!query.trim() && filteredGames.length > visibleGames.length && <div className="full-slate-load-more"><button className="secondary-action" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Load More Games</button><span>Showing {visibleGames.length} of {filteredGames.length} games</span></div>}{!query.trim() && filteredGames.length > PAGE_SIZE && filteredGames.length === visibleGames.length && <div className="full-slate-load-more"><span>Showing all {filteredGames.length} games</span></div>}</div>}
    </section>
  </StandardPage>;
}

export default MatchUpPage;

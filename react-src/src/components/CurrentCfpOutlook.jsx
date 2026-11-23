import { useEffect, useMemo, useState } from "react";
import LoadingDots from "./LoadingDots";
import TeamLogo from "./TeamLogo";

const OUTLOOK_URL = "/public-data/cfp-outlook-2026-current.json";
const percent = (value) => value == null ? "-" : `${(Number(value) * 100).toFixed(1)}%`;
const number = (value) => value == null ? "-" : Number(value).toFixed(2);
const dateLabel = (value) => value ? new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" }) : "Unavailable";
function TeamName({ team, logos }) { return <span className="team-name-with-logo"><TeamLogo team={team} logos={logos} />{team}</span>; }
function Value({ children }) { return <span className="table-value table-value-end">{children}</span>; }

export default function CurrentCfpOutlook({ logos }) {
  const [outlook, setOutlook] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch(OUTLOOK_URL, { cache: "no-cache" }).then((response) => {
      if (!response.ok) throw new Error("CFP outlook unavailable");
      return response.json();
    }).then((payload) => { if (active) setOutlook(payload); })
      .catch(() => { if (active) setError("The current CFP outlook is temporarily unavailable."); });
    return () => { active = false; };
  }, []);
  const committee = useMemo(() => outlook?.committee_snapshot?.rankings || [], [outlook]);
  const power = useMemo(() => outlook?.adv_power_board || [], [outlook]);
  const paths = useMemo(() => new Map((outlook?.team_paths || []).map((r) => [r.team, r])), [outlook]);
  const powerByTeam = useMemo(() => new Map(power.map((r) => [r.team, r])), [power]);
  const seeds = useMemo(() => new Map((outlook?.adv_seed_board || []).map((r) => [r.team, r])), [outlook]);
  const apRanks = useMemo(() => new Map((outlook?.ap_snapshot?.rankings || []).map((r) => [r.team, r.rank])), [outlook]);
  const cfpRanks = useMemo(() => new Map(committee.map((r) => [r.team, r.rank])), [committee]);
  if (error) return <p className="status-line warn">{error}</p>;
  if (!outlook) return <LoadingDots text="Loading the current CFP outlook" />;

  function rankingTable(rows) {
    return <div className="validation-table-wrap"><table><thead><tr><th>CFP</th><th>Team</th><th>Current record</th><th>AP</th><th>ADV power</th></tr></thead><tbody>{rows.map((row) => <tr key={row.team}>
      <td data-label="CFP rank"><Value>{row.rank || "-"}</Value></td><td data-label="Team"><TeamName team={row.team} logos={logos} /></td>
      <td data-label="Current record"><Value>{paths.get(row.team)?.current_record || seeds.get(row.team)?.record || "-"}</Value></td>
      <td data-label="AP rank"><Value>{apRanks.get(row.team) || "-"}</Value></td><td data-label="ADV power rank"><Value>{powerByTeam.get(row.team)?.rank || "-"}</Value></td>
    </tr>)}</tbody></table></div>;
  }
  const leaders = power.slice(0, 12);
  return <div className="current-cfp-outlook">
    <section className="context-callout bracket-scope-note current-outlook-note">
      <p className="eyebrow">Entering Week {outlook.entering_week} · Preliminary</p>
      <h3>2026 CFP Outlook</h3>
      <p>ADV reflects completed results through Week {outlook.through_week}. CFP rankings remain the official {dateLabel(outlook.committee_snapshot.released_at)} release; AP rankings are dated {dateLabel(outlook.ap_snapshot.released_at)}. Current records can include games played after the committee release.</p>
    </section>
    <div className="summary-grid bracket-summary-grid current-outlook-summary">
      <div><span>Committee No. 1</span><strong>{committee[0]?.team || "-"}</strong><small>{dateLabel(outlook.committee_snapshot.released_at)}</small></div>
      <div><span>AP No. 1</span><strong>{outlook.ap_snapshot.rankings[0]?.team || "-"}</strong><small>{dateLabel(outlook.ap_snapshot.released_at)}</small></div>
      <div><span>ADV Power Leader</span><strong>{power[0]?.team || "-"}</strong><small>Current neutral-field strength</small></div>
      <div><span>Current ADV Title Lean</span><strong>{outlook.current_title_lean?.team || "-"}</strong><small>Preliminary; final championship pick not frozen</small></div>
    </div>
    <section className="cfp-outlook-grid">
      <article className="insight-panel"><p className="eyebrow">Official committee ranking</p><h2>CFP Top 12</h2><p className="panel-note">Ranking position is not a confirmed playoff berth. Automatic bids can change the eventual field.</p>{rankingTable(committee.filter((r) => r.rank <= 12))}<a href={outlook.committee_snapshot.source} target="_blank" rel="noreferrer">Open official committee ranking</a></article>
      <article className="insight-panel"><p className="eyebrow">Outside the top 12</p><h2>Playoff Watchlist</h2><p className="panel-note">CFP- or AP-ranked teams outside the committee top 12 with three or fewer current losses. This includes ranked teams pursuing an automatic-bid route. This watchlist is not selection odds or an elimination list; other conference-title routes may remain.</p>{rankingTable(outlook.outside_top_12)}</article>
    </section>
    <section className="insight-panel bracket-contender-table"><p className="eyebrow">After Week {outlook.through_week}</p><h2>ADV Power Board</h2><p className="panel-note">The retained ADVPI method estimates neutral-field strength. Records and earned results appear separately in the Seed Outlook. Research challengers have not replaced the live model.</p>
      <div className="validation-table-wrap"><table><thead><tr><th>Power</th><th>Team</th><th>Record</th><th>Neutral points</th><th>ADV SRS</th><th>CFP</th></tr></thead><tbody>{leaders.map((row) => <tr key={row.team}><td data-label="Power rank"><Value>{row.rank || "-"}</Value></td><td data-label="Team"><TeamName team={row.team} logos={logos} /></td><td data-label="Record"><Value>{seeds.get(row.team)?.record || "-"}</Value></td><td data-label="Neutral points"><Value>{number(row.neutral_rating)}</Value></td><td data-label="ADV SRS"><Value>{number(row.adv_srs)}</Value></td><td data-label="CFP rank"><Value>{cfpRanks.get(row.team) || "-"}</Value></td></tr>)}</tbody></table></div>
    </section>
    <section className="insight-panel bracket-contender-table"><p className="eyebrow">Power plus earned résumé</p><h2>ADV Seed Outlook</h2><p className="panel-note">The retained résumé-aware comparison is separate from both neutral power and the committee ranking. It is not a forecast of the final field or automatic bids.</p><div className="validation-table-wrap"><table><thead><tr><th>Seed read</th><th>Team</th><th>Record</th><th>Power</th><th>SOR</th></tr></thead><tbody>{outlook.adv_seed_board.slice(0, 12).map((row) => <tr key={row.team}><td data-label="Seed read"><Value>{row.rank || "-"}</Value></td><td data-label="Team"><TeamName team={row.team} logos={logos} /></td><td data-label="Record"><Value>{row.record}</Value></td><td data-label="Power rank"><Value>{row.power_rank}</Value></td><td data-label="SOR"><Value>{number(row.sor_score)}</Value></td></tr>)}</tbody></table></div></section>
    <section className="insight-panel bracket-contender-table"><p className="eyebrow">Remaining regular season</p><h2>Remaining-Slate Outlook</h2><p className="panel-note">These percentages describe finishing with two or fewer losses, not making the CFP. A zero here does not establish elimination from a conference-title or automatic-bid route.</p><div className="validation-table-wrap"><table><thead><tr><th>Team</th><th>Record</th><th>Next opponent</th><th>Win chance</th><th>Two losses or fewer</th><th>If win</th><th>If loss</th></tr></thead><tbody>{[...committee, ...outlook.outside_top_12.filter((row) => !cfpRanks.has(row.team))].map((ranked) => {
      const row = paths.get(ranked.team);
      return <tr key={ranked.team}><td data-label="Team"><TeamName team={ranked.team} logos={logos} /></td><td data-label="Record"><Value>{row?.current_record || seeds.get(ranked.team)?.record || "-"}</Value></td><td data-label="Next opponent"><Value>{row?.next_opponent || "No remaining game modeled"}</Value></td><td data-label="Win chance"><Value>{percent(row?.next_game_win_probability)}</Value></td><td data-label="Two losses or fewer"><Value>{percent(row?.probability_two_or_fewer_losses)}</Value></td><td data-label="If win"><Value>{percent(row?.two_loss_path_if_next_win)}</Value></td><td data-label="If loss"><Value>{percent(row?.two_loss_path_if_next_loss)}</Value></td></tr>;
    })}</tbody></table></div></section>
    <section className="insight-panel"><p className="eyebrow">Committee ranking illustration</p><h2>Provisional First-Round Picture</h2><p className="panel-note">Illustrative only. This uses ranking positions and is not corrected for automatic bids or a forecast of the final bracket.</p><div className="bracket-tree provisional-bracket-grid">{outlook.provisional_bracket.filter((game) => game.higher_seed).map((game) => <article className="bracket-game-card" key={game.higher_seed}><span><TeamName team={game.higher_seed_team} logos={logos} /> #{game.higher_seed}</span><span><TeamName team={game.lower_seed_team} logos={logos} /> #{game.lower_seed}</span></article>)}</div></section>
  </div>;
}

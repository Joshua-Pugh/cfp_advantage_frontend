import { useEffect, useMemo, useState } from "react";

import LoadingDots from "./LoadingDots";
import TeamLogo from "./TeamLogo";

const OUTLOOK_URL = "/public-data/cfp-outlook-2026-week10.json";

function percent(value, digits = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${(parsed * 100).toFixed(digits)}%` : "-";
}

function number(value, digits = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : "-";
}

function TeamName({ team, logos }) {
  return <span className="team-name-with-logo"><TeamLogo team={team} logos={logos} />{team}</span>;
}

export default function CurrentCfpOutlook({ logos }) {
  const [outlook, setOutlook] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(OUTLOOK_URL).then((response) => {
        if (!response.ok) throw new Error("CFP outlook snapshot unavailable");
        return response.json();
      })
      .then((outlookPayload) => {
        setOutlook(outlookPayload);
      })
      .catch((loadError) => {
        console.error("2026 CFP outlook failed:", loadError);
        setError("The 2026 CFP outlook is temporarily unavailable.");
      });
  }, []);

  const committee = useMemo(
    () => outlook?.committee_snapshot?.rankings || [],
    [outlook],
  );
  const powerBoard = useMemo(() => outlook?.adv_power_board || [], [outlook]);
  const seedBoard = useMemo(() => outlook?.adv_seed_board || [], [outlook]);
  const committeeRanks = useMemo(
    () => new Map(committee.map((row) => [row.team, row.rank])),
    [committee],
  );
  const advRanks = useMemo(
    () => new Map(powerBoard.map((row) => [row.team, row.rank])),
    [powerBoard],
  );
  const paths = useMemo(
    () => new Map((outlook?.team_paths || []).map((row) => [row.team, row])),
    [outlook],
  );

  if (error) return <p className="status-line warn">{error}</p>;
  if (!outlook) return <LoadingDots text="Building the Week 11 CFP outlook" />;

  const georgia = paths.get("Georgia");
  return <div className="current-cfp-outlook">
    <section className="context-callout bracket-scope-note current-outlook-note">
      <p className="eyebrow">Entering Week 11 · Preliminary</p>
      <h3>2026 CFP Outlook — Not a Championship Pick</h3>
      <p>This view compares the committee&apos;s latest official ranking snapshot with ADV&apos;s post-Week-10 strength read and frozen remaining-slate probabilities. The final field, conference champions, and ADV Championship Favorite have not been selected.</p>
    </section>

    <div className="summary-grid bracket-summary-grid current-outlook-summary">
      <div><span>Committee No. 1</span><strong>{committee[0]?.team || "-"}</strong><small>November 3 snapshot</small></div>
      <div><span>ADV Power Leader</span><strong>{powerBoard[0]?.team || "-"}</strong><small>Multi-signal ADVPI, not SRS alone</small></div>
      <div><span>Current ADV Title Lean</span><strong>{outlook.current_title_lean?.team || "-"}</strong><small>Preliminary entering Week 11</small></div>
      <div><span>Georgia Two-Loss-or-Better Path</span><strong>{percent(georgia?.probability_two_or_fewer_losses)}</strong><small>Remaining regular season only</small></div>
    </div>

    <section className="cfp-outlook-grid">
      <article className="insight-panel">
        <p className="eyebrow">Official snapshot</p>
        <h2>CFP Committee Top 12</h2>
        <p className="panel-note">Released November 3. Week 10 results are not retroactively inserted into the committee&apos;s ranking.</p>
        <div className="validation-table-wrap"><table><thead><tr><th>CFP</th><th>Team</th><th>ADV</th></tr></thead><tbody>
          {committee.map((row) => <tr key={row.team}><td data-label="CFP rank">{row.rank}</td><td data-label="Team"><TeamName team={row.team} logos={logos} /></td><td data-label="ADV power rank">{advRanks.get(row.team) || "-"}</td></tr>)}
        </tbody></table></div>
        <a href={outlook.committee_snapshot.source} target="_blank" rel="noreferrer">Open official committee ranking</a>
      </article>

      <article className="insight-panel">
        <p className="eyebrow">ADV after Week 10</p>
        <h2>ADV Power Board</h2>
        <p className="panel-note">This is the refreshed multi-signal ADVPI board—not ADV SRS alone. It combines corrected ADV with opponent-adjusted offense, defense, special teams, and stable Control evidence. Georgia is the current neutral-field power leader.</p>
        <div className="validation-table-wrap"><table><thead><tr><th>Power</th><th>Team</th><th>Neutral pts</th><th>ADV SRS</th><th>CFP</th></tr></thead><tbody>
          {powerBoard.map((row) => <tr key={row.team}><td data-label="Power rank">{row.rank}</td><td data-label="Team"><TeamName team={row.team} logos={logos} /></td><td data-label="Neutral points">{number(row.neutral_rating, 2)}</td><td data-label="ADV SRS">{number(row.adv_srs, 2)}</td><td data-label="CFP rank">{committeeRanks.get(row.team) || "-"}</td></tr>)}
        </tbody></table></div>
      </article>
    </section>

    <section className="insight-panel bracket-contender-table">
      <p className="eyebrow">Power plus earned résumé</p>
      <h2>ADV Seed Outlook</h2>
      <p className="panel-note">This answers a different question from the power board. The retained late-season research blend is 55% ADVPI power and 45% Strength of Record. Utah and UCLA lead the seed read because they are unbeaten; Georgia is third in seed order but remains ADV&apos;s strongest team and current title lean.</p>
      <div className="validation-table-wrap"><table><thead><tr><th>Seed read</th><th>Team</th><th>Record</th><th>Power</th><th>SOR</th><th>Next-game path</th></tr></thead><tbody>
        {seedBoard.map((row) => {
          const path = paths.get(row.team);
          return <tr key={row.team}><td data-label="Seed read">{row.rank}</td><td data-label="Team"><TeamName team={row.team} logos={logos} /></td><td data-label="Record">{row.record}</td><td data-label="Power rank">#{row.power_rank}</td><td data-label="SOR">{number(row.sor_score, 3)}</td><td data-label="Next-game path">{path ? `${percent(path.two_loss_path_if_next_win)} if win · ${percent(path.two_loss_path_if_next_loss)} if loss` : "-"}</td></tr>;
        })}
      </tbody></table></div>
    </section>

    <section className="insight-panel current-bracket-snapshot">
      <p className="eyebrow">If the November 3 order were seeded directly</p>
      <h2>Provisional First-Round Picture</h2>
      <p className="panel-note">Illustrative only. This is not auto-bid corrected and is not a forecast of the final bracket.</p>
      <div className="bracket-tree provisional-bracket-grid">
        {outlook.provisional_bracket.map((game) => <article className="bracket-game-card" key={`${game.higher_seed}-${game.lower_seed}`}>
          <span className="team-name-with-logo"><TeamLogo team={game.higher_seed_team} logos={logos} /><span className="bracket-team-name">{game.higher_seed} {game.higher_seed_team}</span></span>
          <span className="team-name-with-logo"><TeamLogo team={game.lower_seed_team} logos={logos} /><span className="bracket-team-name">{game.lower_seed} {game.lower_seed_team}</span></span>
        </article>)}
      </div>
    </section>

    <section className="insight-panel bracket-contender-table">
      <p className="eyebrow">Frozen ADV Fair Line path</p>
      <h2>Remaining-Slate Outlook</h2>
      <p className="panel-note">“Path odds” mean the chance to finish the modeled regular season with two or fewer losses. They are not CFP selection probabilities.</p>
      <div className="validation-table-wrap"><table><thead><tr><th>Team</th><th>Record</th><th>Next game</th><th>Win chance</th><th>Two-loss-or-better</th><th>If win</th><th>If loss</th></tr></thead><tbody>
        {committee.map((ranked) => {
          const row = paths.get(ranked.team);
          return <tr key={ranked.team}><td data-label="Team"><TeamName team={ranked.team} logos={logos} /></td><td data-label="Record">{row?.current_record || "-"}</td><td data-label="Next game">{row ? `vs ${row.next_opponent}` : "-"}</td><td data-label="Win chance">{percent(row?.next_game_win_probability)}</td><td data-label="Two-loss or better">{percent(row?.probability_two_or_fewer_losses)}</td><td data-label="If win">{percent(row?.two_loss_path_if_next_win)}</td><td data-label="If loss">{percent(row?.two_loss_path_if_next_loss)}</td></tr>;
        })}
      </tbody></table></div>
    </section>

    <section className="relationship-guardrail">
      <strong>How to read this</strong>
      <p>The committee ranking is an external résumé/selection snapshot. ADVPI estimates neutral-field power. The ADV seed outlook adds earned résumé without counting SOS twice. The remaining-game percentages come from the frozen raw ADV Fair Line and a historical margin-to-win calibration. Georgia is the current ADV title lean, but the final selection remains intentionally unfrozen with three regular-season games left.</p>
    </section>
  </div>;
}

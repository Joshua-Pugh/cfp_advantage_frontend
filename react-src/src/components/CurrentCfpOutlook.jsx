import { useEffect, useMemo, useState } from "react";

import LoadingDots from "./LoadingDots";
import TeamLogo from "./TeamLogo";
import { api } from "../lib/api";

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
  const [adv, setAdv] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(OUTLOOK_URL).then((response) => {
        if (!response.ok) throw new Error("CFP outlook snapshot unavailable");
        return response.json();
      }),
      api("/api/product-a/championship-favorite?season=2026"),
    ])
      .then(([outlookPayload, advPayload]) => {
        setOutlook(outlookPayload);
        setAdv(advPayload);
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
  const contenders = useMemo(() => adv?.contenders || [], [adv]);
  const committeeRanks = useMemo(
    () => new Map(committee.map((row) => [row.team, row.rank])),
    [committee],
  );
  const advRanks = useMemo(
    () => new Map(contenders.map((row) => [row.team, row.adv_srs_rank])),
    [contenders],
  );
  const paths = useMemo(
    () => new Map((outlook?.team_paths || []).map((row) => [row.team, row])),
    [outlook],
  );

  if (error) return <p className="status-line warn">{error}</p>;
  if (!outlook || !adv) return <LoadingDots text="Building the Week 11 CFP outlook" />;

  const georgia = paths.get("Georgia");
  return <div className="current-cfp-outlook">
    <section className="context-callout bracket-scope-note current-outlook-note">
      <p className="eyebrow">Entering Week 11 · Preliminary</p>
      <h3>2026 CFP Outlook — Not a Championship Pick</h3>
      <p>This view compares the committee&apos;s latest official ranking snapshot with ADV&apos;s post-Week-10 strength read and frozen remaining-slate probabilities. The final field, conference champions, and ADV Championship Favorite have not been selected.</p>
    </section>

    <div className="summary-grid bracket-summary-grid current-outlook-summary">
      <div><span>Committee No. 1</span><strong>{committee[0]?.team || "-"}</strong><small>November 3 snapshot</small></div>
      <div><span>ADV Strength Leader</span><strong>{adv.strength_leader?.team || "-"}</strong><small>Power signal, not title pick</small></div>
      <div><span>Georgia</span><strong>Committee #2 · ADV #3</strong><small>Post-Week-10 views</small></div>
      <div><span>Georgia Two-Loss-or-Better Path</span><strong>{percent(georgia?.probability_two_or_fewer_losses)}</strong><small>Remaining regular season only</small></div>
    </div>

    <section className="cfp-outlook-grid">
      <article className="insight-panel">
        <p className="eyebrow">Official snapshot</p>
        <h2>CFP Committee Top 12</h2>
        <p className="panel-note">Released November 3. Week 10 results are not retroactively inserted into the committee&apos;s ranking.</p>
        <div className="validation-table-wrap"><table><thead><tr><th>CFP</th><th>Team</th><th>ADV</th></tr></thead><tbody>
          {committee.map((row) => <tr key={row.team}><td>{row.rank}</td><td><TeamName team={row.team} logos={logos} /></td><td>{advRanks.get(row.team) || "-"}</td></tr>)}
        </tbody></table></div>
        <a href={outlook.committee_snapshot.source} target="_blank" rel="noreferrer">Open official committee ranking</a>
      </article>

      <article className="insight-panel">
        <p className="eyebrow">ADV after Week 10</p>
        <h2>Current Strength Outlook</h2>
        <p className="panel-note">ADV SRS estimates neutral strength. It does not award résumé or head-to-head credit, and this ordering is not the final championship pick.</p>
        <div className="validation-table-wrap"><table><thead><tr><th>ADV</th><th>Team</th><th>Rating</th><th>CFP</th><th>Champion floors</th></tr></thead><tbody>
          {contenders.map((row) => <tr key={row.team}><td>{row.adv_srs_rank}</td><td><TeamName team={row.team} logos={logos} /></td><td>{number(row.adv_srs, 2)}</td><td>{committeeRanks.get(row.team) || "-"}</td><td>{row.championship_shape?.traits_cleared ?? "-"}/6</td></tr>)}
        </tbody></table></div>
      </article>
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
          return <tr key={ranked.team}><td><TeamName team={ranked.team} logos={logos} /></td><td>{row?.current_record || "-"}</td><td>{row ? `vs ${row.next_opponent}` : "-"}</td><td>{percent(row?.next_game_win_probability)}</td><td>{percent(row?.probability_two_or_fewer_losses)}</td><td>{percent(row?.two_loss_path_if_next_win)}</td><td>{percent(row?.two_loss_path_if_next_loss)}</td></tr>;
        })}
      </tbody></table></div>
    </section>

    <section className="relationship-guardrail">
      <strong>How to read this</strong>
      <p>The committee ranking is a résumé/selection snapshot. ADV SRS is a power estimate. The remaining-game percentages come from the frozen raw ADV Fair Line and a historical margin-to-win calibration. None of these rows declares ADV&apos;s national champion.</p>
    </section>
  </div>;
}

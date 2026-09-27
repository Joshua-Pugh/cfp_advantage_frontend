import { useState } from "react";

import TeamLogo from "./TeamLogo";
import { api } from "../lib/api";

function gameLocationLabel(game) {
  if (game.is_neutral) return "Neutral";
  if (game.is_home) return "Home";
  return "Away";
}

function resultLabel(result) {
  if (result === "W") return "Win";
  if (result === "L") return "Loss";
  return "";
}

function scoreLine(game) {
  const hasTeamScore =
    game.team_score !== null &&
    game.team_score !== undefined;

  const hasOpponentScore =
    game.opponent_score !== null &&
    game.opponent_score !== undefined;

  if (!hasTeamScore || !hasOpponentScore) {
    return "Upcoming";
  }

  return `${game.team_score}-${game.opponent_score}`;
}

function weekLabel(game) {
  const week =
    game.display_week ??
    game.week ??
    game.game_order;

  if (week === null || week === undefined) {
    return "Game";
  }

  const normalizedWeek =
    typeof week === "string"
      ? week.trim().replace(/^week\s+/i, "")
      : week;

  return `Week ${normalizedWeek}`;
}

function recordFromGames(games, filter) {
  let wins = 0;
  let losses = 0;
  let ties = 0;

  games.filter(filter).forEach((game) => {
    if (game.result_w_l === "W") wins += 1;
    else if (game.result_w_l === "L") losses += 1;
    else if (game.result_w_l === "T") ties += 1;
  });

  return ties
    ? `${wins}-${losses}-${ties}`
    : `${wins}-${losses}`;
}

function truthyValue(value) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    String(value).toLowerCase() === "true"
  );
}

function statValue(value, digits = 0) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "-";
}

function passingLine(stats = {}) {
  if (!Object.keys(stats).length) return "-";
  return [
    `${statValue(stats.pass_completions)}/${statValue(stats.pass_attempts)}`,
    `${statValue(stats.pass_yards)} yds`,
    `${statValue(stats.pass_tds)} TD`,
    `${statValue(stats.interceptions_thrown)} INT`,
  ].join(" · ");
}

function rushingLine(stats = {}) {
  if (!Object.keys(stats).length) return "-";
  return [
    `${statValue(stats.rush_attempts)} att`,
    `${statValue(stats.rush_yards)} yds`,
    `${statValue(stats.rush_tds)} TD`,
  ].join(" · ");
}

function penaltyLine(stats = {}) {
  if (!Object.keys(stats).length) return "-";
  return `${statValue(stats.penalties)}-${statValue(stats.penalty_yards)} yds`;
}

function possessionLine(stats = {}) {
  const totalSeconds = Number(stats.possession_seconds);
  if (!Number.isFinite(totalSeconds)) return "-";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function safeColor(value, fallback) {
  const color = String(value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  if (/^[0-9a-f]{6}$/i.test(color)) return `#${color}`;
  return fallback;
}

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function conversionRate(stats, madeKey, attemptsKey, rateKey) {
  const rate = numeric(stats?.[rateKey]);
  if (rate !== null) return rate;
  const made = numeric(stats?.[madeKey]);
  const attempts = numeric(stats?.[attemptsKey]);
  return attempts ? made / attempts : null;
}

function ComparisonBar({ label, awayValue, homeValue, awayLabel, homeLabel, awayColor, homeColor, lowerBetter = false }) {
  const left = numeric(awayValue);
  const right = numeric(homeValue);
  const magnitude = Math.abs(left || 0) + Math.abs(right || 0);
  const leftWidth = magnitude ? Math.max(4, Math.abs(left || 0) / magnitude * 100) : 50;
  const rightWidth = magnitude ? Math.max(4, Math.abs(right || 0) / magnitude * 100) : 50;
  const awayWins = left !== null && right !== null && (lowerBetter ? left < right : left > right);
  const homeWins = left !== null && right !== null && (lowerBetter ? right < left : right > left);
  return <div className="recap-comparison-row">
    <div className={`recap-comparison-values${awayWins ? " away-wins" : ""}${homeWins ? " home-wins" : ""}`}><strong>{awayLabel}</strong><span>{label}</span><strong>{homeLabel}</strong></div>
    <div className="recap-comparison-bars"><i style={{ width: `${leftWidth}%`, background: awayColor }} /><i style={{ width: `${rightWidth}%`, background: homeColor }} /></div>
  </div>;
}

function RecapBoxScore({ recap, displayName, teamIdentities }) {
  const [showAdv, setShowAdv] = useState(false);
  const game = recap.game || {};
  const away = recap.box_score?.away || {};
  const home = recap.box_score?.home || {};
  const awayAdv = recap.adv_drive_conversion?.away || {};
  const homeAdv = recap.adv_drive_conversion?.home || {};
  const awayName = displayName(game.away_team) || "Away";
  const homeName = displayName(game.home_team) || "Home";
  const recapDate = game.date || away.date || home.date || "";
  const awayIdentity = teamIdentities?.[game.away_team] || {};
  const homeIdentity = teamIdentities?.[game.home_team] || {};
  const awayColor = safeColor(awayIdentity.color, "#2e668f");
  const homeColor = safeColor(homeIdentity.color, "#8b3038");
  const thirdAway = conversionRate(away, "third_down_conversions", "third_down_attempts", "third_down_rate");
  const thirdHome = conversionRate(home, "third_down_conversions", "third_down_attempts", "third_down_rate");
  const rzAway = conversionRate(away, "red_zone_tds", "red_zone_trips", "red_zone_td_rate");
  const rzHome = conversionRate(home, "red_zone_tds", "red_zone_trips", "red_zone_td_rate");
  const regularRows = [
    ["Total Yards", away.total_yards, home.total_yards, statValue(away.total_yards), statValue(home.total_yards)],
    ["Passing Yards", away.pass_yards, home.pass_yards, statValue(away.pass_yards), statValue(home.pass_yards)],
    ["Rushing Yards", away.rush_yards, home.rush_yards, statValue(away.rush_yards), statValue(home.rush_yards)],
    ["Yards / Play", away.yards_per_play, home.yards_per_play, statValue(away.yards_per_play, 1), statValue(home.yards_per_play, 1)],
    ["First Downs", away.first_downs, home.first_downs, statValue(away.first_downs), statValue(home.first_downs)],
    ["3rd Down Rate", thirdAway, thirdHome, thirdAway == null ? "-" : `${(thirdAway * 100).toFixed(1)}%`, thirdHome == null ? "-" : `${(thirdHome * 100).toFixed(1)}%`],
    ["Red-Zone TD Rate", rzAway, rzHome, rzAway == null ? "-" : `${(rzAway * 100).toFixed(1)}%`, rzHome == null ? "-" : `${(rzHome * 100).toFixed(1)}%`],
    ["Turnovers", away.turnovers, home.turnovers, statValue(away.turnovers), statValue(home.turnovers), true],
  ];
  const awayHasAdv = Object.values(awayAdv).some((value) => value !== null && value !== undefined && value !== "");
  const homeHasAdv = Object.values(homeAdv).some((value) => value !== null && value !== undefined && value !== "");
  const advRows = [
    ["Game Control Rate", awayAdv.game_control_rate, homeAdv.game_control_rate, awayAdv.game_control_rate == null ? "-" : `${(Number(awayAdv.game_control_rate) * 100).toFixed(1)}%`, homeAdv.game_control_rate == null ? "-" : `${(Number(homeAdv.game_control_rate) * 100).toFixed(1)}%`],
    ["Control Drives", awayAdv.control_drives, homeAdv.control_drives, statValue(awayAdv.control_drives), statValue(homeAdv.control_drives)],
    ["Control Finish", awayAdv.scoring_conversion_rate, homeAdv.scoring_conversion_rate, awayAdv.scoring_conversion_rate == null ? "-" : `${(Number(awayAdv.scoring_conversion_rate) * 100).toFixed(1)}%`, homeAdv.scoring_conversion_rate == null ? "-" : `${(Number(homeAdv.scoring_conversion_rate) * 100).toFixed(1)}%`],
    ["TD Control Conversion", awayAdv.td_conversion_rate, homeAdv.td_conversion_rate, awayAdv.td_conversion_rate == null ? "-" : `${(Number(awayAdv.td_conversion_rate) * 100).toFixed(1)}%`, homeAdv.td_conversion_rate == null ? "-" : `${(Number(homeAdv.td_conversion_rate) * 100).toFixed(1)}%`],
    ["Points / Control Drive", awayAdv.points_per_control_drive, homeAdv.points_per_control_drive, statValue(awayAdv.points_per_control_drive, 2), statValue(homeAdv.points_per_control_drive, 2)],
    ["ADV / Control Drive", awayAdv.adv_per_control_drive, homeAdv.adv_per_control_drive, statValue(awayAdv.adv_per_control_drive, 2), statValue(homeAdv.adv_per_control_drive, 2)],
  ].filter((row) => row[1] != null && row[2] != null);

  return <div className="recap-detail">
    <div className="panel-heading recap-heading"><div><p className="eyebrow">{game.season || ""} Week {game.week || "-"}</p><h2>{awayName} at {homeName}</h2></div><span className="panel-note">{recapDate}</span></div>
    <div className="recap-scoreboard" aria-label="Final score"><div className="recap-away"><span>Away</span><strong>{awayName}</strong><b>{game.away_points ?? "-"}</b></div><p><span>Final</span><b>at</b></p><div className="recap-home"><span>Home</span><strong>{homeName}</strong><b>{game.home_points ?? "-"}</b></div></div>
    <section className="recap-comparison-section"><div className="recap-comparison-header"><span style={{ color: awayColor }}>{awayName}</span><h3>Team Stats</h3><span style={{ color: homeColor }}>{homeName}</span></div>{regularRows.map(([label, awayValue, homeValue, awayLabel, homeLabel, lowerBetter]) => <ComparisonBar key={label} label={label} awayValue={awayValue} homeValue={homeValue} awayLabel={awayLabel} homeLabel={homeLabel} awayColor={awayColor} homeColor={homeColor} lowerBetter={lowerBetter} />)}<details className="recap-detail-stats"><summary>More box-score details</summary><div><span>Passing</span><strong>{passingLine(away)}</strong><strong>{passingLine(home)}</strong><span>Rushing</span><strong>{rushingLine(away)}</strong><strong>{rushingLine(home)}</strong><span>Possession</span><strong>{possessionLine(away)}</strong><strong>{possessionLine(home)}</strong><span>Penalties</span><strong>{penaltyLine(away)}</strong><strong>{penaltyLine(home)}</strong></div></details></section>
    {awayHasAdv && homeHasAdv && advRows.length > 0 && <section className="recap-adv-section"><button type="button" onClick={() => setShowAdv((value) => !value)}>{showAdv ? "Hide ADV Game-Control Metrics" : "Show ADV Game-Control Metrics"}</button>{showAdv && <div className="recap-adv-content"><div className="recap-comparison-header"><span style={{ color: awayColor }}>{awayName}</span><h3>ADV Control</h3><span style={{ color: homeColor }}>{homeName}</span></div>{advRows.map(([label, awayValue, homeValue, awayLabel, homeLabel]) => <ComparisonBar key={label} label={label} awayValue={awayValue} homeValue={homeValue} awayLabel={awayLabel} homeLabel={homeLabel} awayColor={awayColor} homeColor={homeColor} />)}{recap.postgame_control?.summary && <div className="recap-control-note"><span>ADV Game-Control Read</span><p>{recap.postgame_control.summary}</p></div>}</div>}</section>}
  </div>;
}

function TeamScheduleGame({ game, logos, displayName, onOpenRecap }) {
  const resultClass =
    game.result_w_l === "W"
      ? "is-win"
      : game.result_w_l === "L"
        ? "is-loss"
        : "";

  const hasRecap =
    Boolean(game.game_id) &&
    truthyValue(game.has_adv_recap);

  return (
    <article className={`team-schedule-game ${resultClass}`}>
      <div className="team-schedule-week">{weekLabel(game)}</div>

      <div className="team-schedule-opponent">
        <TeamLogo team={game.opponent} logos={logos} />
        <div>
          <span>Opponent</span>
          <strong>{displayName(game.opponent)}</strong>
          <small>
            {[game.date, game.opponent_conference, game.is_neutral ? "Neutral Site" : null]
              .filter(Boolean)
              .join(" · ")}
          </small>
        </div>
      </div>

      <div className="team-schedule-location">
        <span>Site</span>
        <strong>{gameLocationLabel(game)}</strong>
      </div>

      <div className="team-schedule-score">
        {game.result_w_l && <span>{resultLabel(game.result_w_l)}</span>}
        <strong>{scoreLine(game)}</strong>
      </div>

      <div className="team-schedule-actions">
        {hasRecap ? (
          <button
            type="button"
            className="secondary-button compact-action"
            onClick={() => onOpenRecap(game.game_id)}
          >
            View Recap
          </button>
        ) : (
          <span className="team-schedule-no-recap">—</span>
        )}
      </div>
    </article>
  );
}

function TeamScheduleSection({ title, games, logos, displayName, onOpenRecap }) {
  if (!games.length) return null;

  return (
    <section className="team-schedule-section">
      <div className="team-schedule-section-heading">
        <h3>{title}</h3>
        <span>{games.length} {games.length === 1 ? "game" : "games"}</span>
      </div>

      <div className="team-schedule-list">
        {games.map((game) => (
          <TeamScheduleGame
            key={game.game_id || `${game.display_week}-${game.opponent}`}
            game={game}
            logos={logos}
            displayName={displayName}
            onOpenRecap={onOpenRecap}
          />
        ))}
      </div>
    </section>
  );
}
function TeamSchedule({
  team,
  fullName,
  season,
  record = {},
  games = [],
  logos = {},
  teamIdentities = {},
}) {
  const [recap, setRecap] = useState(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [recapError, setRecapError] = useState("");

  const displayName = (teamName) =>
    teamIdentities[teamName]?.full_name ||
    teamName;

  const regularSeason = games.filter(
    (game) =>
      game.schedule_section === "regular_season"
  );

  const conferenceChampionship = games.filter(
    (game) =>
      game.schedule_section ===
      "conference_championship"
  );

  const postseason = games.filter(
    (game) =>
      game.schedule_section === "postseason"
  );

  async function openRecap(gameId) {
    if (!gameId) return;

    try {
      setRecapLoading(true);
      setRecapError("");
      setRecap(null);

      const payload = await api(
        `/api/game/${encodeURIComponent(gameId)}/recap`
      );

      setRecap(payload);
    } catch (error) {
      console.error(
        "CFP Advantage recap failed:",
        error
      );

      setRecapError(
        "The game recap could not be loaded."
      );
    } finally {
      setRecapLoading(false);
    }
  }

  function closeRecap() {
    setRecap(null);
    setRecapError("");
  }

  const homeRecord = recordFromGames(
    games,
    (game) => game.is_home && !game.is_neutral
  );

  const awayRecord = recordFromGames(
    games,
    (game) => !game.is_home && !game.is_neutral
  );


  return (
    <>
      <div className="team-schedule-view">
        <div className="team-record-header">
          <div>
            <p className="eyebrow">
              {season} Record
            </p>

            <h3>
              {fullName || team}
            </h3>
          </div>

          <div className="team-record-summary">
            <div>
              <span>Overall</span>
              <strong>
                {record.overall_record || "-"}
              </strong>
            </div>

            <div>
              <span>Conference</span>
              <strong>
                {record.conference_record || "-"}
              </strong>
            </div>

            <div>
              <span>Home</span>
              <strong>{homeRecord}</strong>
            </div>

            <div>
              <span>Away</span>
              <strong>{awayRecord}</strong>
            </div>
          </div>
        </div>

        <TeamScheduleSection
          title="Regular Season"
          games={regularSeason}
          logos={logos}
          displayName={displayName}
          onOpenRecap={openRecap}
        />

        <TeamScheduleSection
          title="Conference Championship"
          games={conferenceChampionship}
          logos={logos}
          displayName={displayName}
          onOpenRecap={openRecap}
        />

        <TeamScheduleSection
          title="Postseason"
          games={postseason}
          logos={logos}
          displayName={displayName}
          onOpenRecap={openRecap}
        />
      </div>

      {(recapLoading ||
        recap ||
        recapError) && (
        <section
          className="bracket-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Game recap"
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeRecap();
            }
          }}
        >
          <div className="bracket-modal-card recap-modal-card">
            <button
              type="button"
              className="help-close"
              aria-label="Close game recap"
              onClick={closeRecap}
            >
              ×
            </button>

            {recapLoading && (
              <div className="empty-state compact">
                Loading recap...
              </div>
            )}

            {recapError && (
              <div className="empty-state compact">
                {recapError}
              </div>
            )}

            {recap && (
              <RecapBoxScore
                recap={recap}
                displayName={displayName}
                teamIdentities={teamIdentities}
              />
            )}
          </div>
        </section>
      )}
    </>
  );
}

export default TeamSchedule;

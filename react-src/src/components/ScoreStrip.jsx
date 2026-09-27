import { useEffect, useState } from "react";

import { api } from "../lib/api";
import LoadingDots from "./LoadingDots";

function ScoreTeamLogo({ team }) {
  const teamId = Number(team?.team_id);
  const name = String(team?.name || "");

  const logoUrl = Number.isFinite(teamId)
    ? `https://cdn.collegefootballdata.com/logos/48/${teamId}.png`
    : "";

  return (
    <span className="score-team-logo" title={name}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span>{name.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}

function ScoreCard({ game }) {
  const away = game.away_team || {};
  const home = game.home_team || {};

  const isLive = game.status === "in_progress";
  const isFinal = game.status === "completed";

  let statusText = "Scheduled";

  if (isFinal) {
    statusText = "Final";
  } else if (isLive) {
    statusText = [
      game.period ? `Q${game.period}` : "Live",
      game.clock || "",
    ]
      .filter(Boolean)
      .join(" · ");
  } else if (game.start_date) {
    const kickoff = new Date(game.start_date);

    if (!Number.isNaN(kickoff.getTime())) {
      statusText = kickoff.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      });
    }
  }

  const cardClass = [
    "official-score-card",
    isLive ? "is-live" : "",
    isFinal ? "is-final" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={cardClass}>
      <div className="official-score-status">
        <span>{statusText}</span>

        {isLive && <strong>LIVE</strong>}
      </div>

      <div className="official-score-teams">
        <div className="score-team-row">
          <ScoreTeamLogo team={away} />

          <span className="score-team-name">
            {away.name || "-"}
          </span>

          <strong>
            {away.points ?? "-"}
          </strong>
        </div>

        <div className="score-team-row">
          <ScoreTeamLogo team={home} />

          <span className="score-team-name">
            {home.name || "-"}
          </span>

          <strong>
            {home.points ?? "-"}
          </strong>
        </div>
      </div>
    </article>
  );
}

function ScoreStrip() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadScores() {
      try {
        setLoading(true);
        setError("");

        const payload = await api(
          "/api/game-day/scoreboard?classification=fbs"
        );

        const rows = Array.isArray(payload.games)
          ? payload.games
          : [];

        setGames(rows.slice(0, 4));
      } catch (loadError) {
        console.error(
          "CFP Advantage score strip failed:",
          loadError
        );

        setError(
          "Live scores are temporarily unavailable."
        );
      } finally {
        setLoading(false);
      }
    }

    loadScores();
  }, []);

  return (
    <section
      className="home-section home-score-strip-section"
      aria-labelledby="homeScoresTitle"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">CFBD Live Feed</p>

          <h2 id="homeScoresTitle">
            Today&apos;s Scores
          </h2>

          <p className="panel-note">
            A quick live snapshot. Frozen CFP Advantage
            projections never change after kickoff.
          </p>
        </div>

        <a
          className="text-link"
          href="/matchups#live-scoreboard"
        >
          Open Full Scoreboard
        </a>
      </div>

      <div
        className="home-scoreboard-strip"
        aria-live="polite"
      >
        {loading ? (
          <div className="scoreboard-loading">
            <LoadingDots text="Loading live scores" />
          </div>
        ) : error ? (
          <div className="scoreboard-loading">
            {error}
          </div>
        ) : games.length ? (
          <div className="official-score-grid is-compact">
            {games.map((game) => (
              <ScoreCard
                key={game.game_id}
                game={game}
              />
            ))}
          </div>
        ) : (
          <div className="scoreboard-loading">
            No live or scheduled FBS games are available right now.
          </div>
        )}
      </div>
    </section>
  );
}

export default ScoreStrip;

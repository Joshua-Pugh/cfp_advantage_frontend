import { useEffect, useMemo, useState } from "react";

import { api } from "../lib/api";
import { formatProjectionMargin } from "../lib/formatters";

import LoadingDots from "./LoadingDots";
import TeamLogo from "./TeamLogo";

const PAGE_SIZE = 8;

function normalizedTeamName(team) {
  return String(team || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function teamNamesMatch(left, right) {
  const normalizedLeft = normalizedTeamName(left);
  const normalizedRight = normalizedTeamName(right);

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
}

function ResultCard({ result, logos }) {
  const tone =
    result.model_result === "W"
      ? "is-win"
      : result.model_result === "L"
        ? "is-loss"
        : "is-push";

  const outcome =
    result.model_result === "W"
      ? "Win"
      : result.model_result === "L"
        ? "Loss"
        : "Push";

  return (
    <article className={`home-unofficial-result ${tone}`}>
      <div className="home-unofficial-result-topline">
        <span>Final</span>
        <b>{outcome}</b>
      </div>

      <div className="home-unofficial-scoreline">
        <span>
          <TeamLogo team={result.away_team} logos={logos} />
          <strong>
            {result.away_full_name || result.away_team}{" "}
            {result.away_score}
          </strong>
        </span>

        <em>-</em>

        <span>
          <TeamLogo team={result.home_team} logos={logos} />
          <strong>
            {result.home_full_name || result.home_team}{" "}
            {result.home_score}
          </strong>
        </span>
      </div>

      <small>
        ADV pick:{" "}
        {result.projected_winner_full_name ||
          result.projected_winner}{" "}
        by{" "}
        {formatProjectionMargin(result.projected_margin_abs)}
      </small>
    </article>
  );
}

function Summary({ results }) {
  const wins = results.filter(
    (game) => game.model_result === "W"
  ).length;

  const losses = results.filter(
    (game) => game.model_result === "L"
  ).length;

  const pushes = results.filter(
    (game) => game.model_result === "P"
  ).length;

  const decidedGames = wins + losses;

  const accuracy = decidedGames
    ? (wins / decidedGames) * 100
    : 0;

  const mae = results.length
    ? results.reduce(
        (sum, game) => sum + game.margin_error,
        0
      ) / results.length
    : null;

  return (
    <div className="home-unofficial-summary">
      <div>
        <span>Completed Games</span>
        <strong>{results.length}</strong>
      </div>

      <div>
        <span>Model Record</span>
        <strong>
          {wins}-{losses}
          {pushes ? `-${pushes}` : ""}
        </strong>
      </div>

      <div>
        <span>Winner Accuracy</span>
        <strong>{accuracy.toFixed(1)}%</strong>
      </div>

      <div>
        <span>Average Margin Error</span>
        <strong>
          {mae === null ? "-" : mae.toFixed(1)}
        </strong>
      </div>
    </div>
  );
}

function UnofficialResults() {
  const [results, setResults] = useState([]);
  const [logos, setLogos] = useState({});
  const [week, setWeek] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    async function loadResults() {
      try {
        setLoading(true);
        setError("");

        const current = await api(
          "/api/product-a/current-week?limit=8"
        );

        const season = Number(
          current.status?.season
        );

        const selectedWeek = Number(
          current.status?.selected_week
        );

        if (
          !Number.isInteger(season) ||
          season < 1 ||
          !Number.isInteger(selectedWeek) ||
          selectedWeek < 1
        ) {
          throw new Error(
            "No published week is available for unofficial results."
          );
        }

        const [
          picksPayload,
          scorePayload,
          logoPayload,
        ] = await Promise.all([
          api(
            `/api/product-a/current-week?season=${season}&week=${selectedWeek}&limit=150`
          ),

          api(
            "/api/game-day/scoreboard?classification=fbs"
          ),

          fetch("/team-logos.json").then(
            (response) =>
              response.ok
                ? response.json()
                : { teams: {} }
          ),
        ]);

        if (
          !picksPayload.weekly_snapshot_available ||
          !picksPayload.matchups?.length
        ) {
          throw new Error(
            "The frozen weekly picks are temporarily unavailable."
          );
        }

        const picks = Array.isArray(
          picksPayload.matchups
        )
          ? picksPayload.matchups
          : [];

        const pickByGame = new Map(
          picks.map((pick) => [
            String(pick.game_id),
            pick,
          ])
        );

        const finals = (
          Array.isArray(scorePayload.games)
            ? scorePayload.games
            : []
        )
          .filter(
            (game) =>
              game.status === "completed" &&
              pickByGame.has(
                String(game.game_id)
              )
          )
          .filter(
            (game) =>
              Number.isFinite(
                game.away_team?.points
              ) &&
              Number.isFinite(
                game.home_team?.points
              )
          )
          .map((game) => {
            const pick = pickByGame.get(
              String(game.game_id)
            );

            const awayScore = Number(
              game.away_team.points
            );

            const homeScore = Number(
              game.home_team.points
            );

            const pickAwayScore = teamNamesMatch(
              pick.away_team,
              game.away_team.name
            )
              ? awayScore
              : teamNamesMatch(
                  pick.away_team,
                  game.home_team.name
                )
                ? homeScore
                : awayScore;

            const pickHomeScore = teamNamesMatch(
              pick.home_team,
              game.home_team.name
            )
              ? homeScore
              : teamNamesMatch(
                  pick.home_team,
                  game.away_team.name
                )
                ? awayScore
                : homeScore;

            const actualWinner =
              pickAwayScore === pickHomeScore
                ? null
                : pickAwayScore > pickHomeScore
                  ? pick.away_team
                  : pick.home_team;

            const projectedWinnerScore =
              pick.projected_winner ===
              pick.away_team
                ? pickAwayScore
                : pickHomeScore;

            const projectedLoserScore =
              pick.projected_winner ===
              pick.away_team
                ? pickHomeScore
                : pickAwayScore;

            const actualProjectedWinnerMargin =
              projectedWinnerScore -
              projectedLoserScore;

            const marginError = Math.abs(
              actualProjectedWinnerMargin -
                Number(
                  pick.projected_margin_abs
                )
            );

            return {
              game_id: String(game.game_id),
              start_date: game.start_date,

              away_team: pick.away_team,
              home_team: pick.home_team,
              away_full_name:
                pick.away_full_name,
              home_full_name:
                pick.home_full_name,

              away_score: pickAwayScore,
              home_score: pickHomeScore,

              projected_winner:
                pick.projected_winner,
              projected_winner_full_name:
                pick.projected_winner_full_name,

              projected_margin_abs:
                pick.projected_margin_abs,

              model_result:
                actualWinner === null
                  ? "P"
                  : actualWinner ===
                      pick.projected_winner
                    ? "W"
                    : "L",

              margin_error: marginError,
            };
          })
          .sort(
            (left, right) =>
              new Date(
                right.start_date
              ).getTime() -
              new Date(
                left.start_date
              ).getTime()
          );

        setWeek(
          picksPayload.status
            ?.selected_week ||
            picks[0]?.week ||
            selectedWeek
        );

        setResults(finals);
        setLogos(
          logoPayload.teams || {}
        );
      } catch (loadError) {
        console.error(
          "CFP Advantage unofficial results failed:",
          loadError
        );

        setError(
          "The live results feed is reconnecting. Certified records remain unchanged."
        );
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, []);

  useEffect(() => {
    document.body.classList.toggle(
      "modal-open",
      modalOpen
    );

    return () => {
      document.body.classList.remove(
        "modal-open"
      );
    };
  }, [modalOpen]);

  const totalPages = Math.max(
    1,
    Math.ceil(results.length / PAGE_SIZE)
  );

  const visibleModalResults = useMemo(() => {
    const start = page * PAGE_SIZE;

    return results.slice(
      start,
      start + PAGE_SIZE
    );
  }, [results, page]);

  function openModal() {
    setPage(0);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  return (
    <>
      <div
        className="home-unofficial-results"
        aria-live="polite"
      >
        <div className="home-unofficial-results-heading">
          <div>
            <span className="eyebrow">
              {week
                ? `Week ${week}`
                : "Current Week"}
            </span>

            <strong>
              Unofficial Model Results
            </strong>
          </div>
        </div>

        <Summary results={results} />

        <div className="home-unofficial-results-list">
          {loading ? (
            <div
              className="home-unofficial-loading"
              role="status"
            >
              <LoadingDots text="Checking final scores" />
            </div>
          ) : error ? (
            <span className="home-unofficial-empty">
              {error}
            </span>
          ) : results.length ? (
            results
              .slice(0, 4)
              .map((result) => (
                <ResultCard
                  key={result.game_id}
                  result={result}
                  logos={logos}
                />
              ))
          ) : (
            <span className="home-unofficial-empty">
              Completed games will appear here as live finals become available.
            </span>
          )}
        </div>

        <div className="home-unofficial-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={openModal}
          >
            View All Unofficial Results
          </button>
        </div>

        <small>
          Live CFBD finals are provisional.
          The certified tracker updates only
          after the weekly grading run.
        </small>
      </div>

      {modalOpen && (
        <section
          className="unofficial-results-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unofficialModalTitle"
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="unofficial-results-modal-card">
            <button
              className="modal-close"
              type="button"
              onClick={closeModal}
            >
              Close
            </button>

            <p className="eyebrow">
              2026 Development Tracking
            </p>

            <h2 id="unofficialModalTitle">
              Unofficial Model Results
            </h2>

            <Summary results={results} />

            <div className="unofficial-results-modal-list">
              {visibleModalResults.length ? (
                visibleModalResults.map(
                  (result) => (
                    <ResultCard
                      key={result.game_id}
                      result={result}
                      logos={logos}
                    />
                  )
                )
              ) : (
                <span className="home-unofficial-empty">
                  No completed games yet.
                </span>
              )}
            </div>

            <div className="unofficial-results-pagination">
              <button
                className="secondary-button"
                type="button"
                disabled={page === 0}
                onClick={() =>
                  setPage((current) =>
                    Math.max(
                      0,
                      current - 1
                    )
                  )
                }
              >
                ←{" "}
                <span className="pagination-label">
                  Previous
                </span>
              </button>

              <span>
                Page {page + 1} of{" "}
                {totalPages}
              </span>

              <button
                className="secondary-button"
                type="button"
                disabled={
                  page >= totalPages - 1
                }
                onClick={() =>
                  setPage((current) =>
                    Math.min(
                      totalPages - 1,
                      current + 1
                    )
                  )
                }
              >
                <span className="pagination-label">
                  Next
                </span>{" "}
                →
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

export default UnofficialResults;

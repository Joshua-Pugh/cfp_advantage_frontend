import { useEffect, useRef, useState } from "react";

import { api } from "../lib/api";

import LoadingDots from "./LoadingDots";
import MatchupCard from "./MatchupCard";

function GamesOfWeek() {
  const [payload, setPayload] = useState(null);
  const [logos, setLogos] = useState({});
  const [error, setError] = useState("");

  const railRef = useRef(null);

  useEffect(() => {
    async function loadGames() {
      try {
        const [weeklyPayload, logoPayload] =
          await Promise.all([
            api("/api/product-a/current-week?limit=8"),

            fetch("/team-logos.json").then((response) =>
              response.ok
                ? response.json()
                : { teams: {} }
            ),
          ]);

        setPayload(weeklyPayload);
        setLogos(logoPayload.teams || {});
      } catch (loadError) {
        console.error(
          "CFP Advantage home matchups failed:",
          loadError
        );

        setError(
          "The full weekly slate remains available on the Matchups page."
        );
      }
    }

    loadGames();
  }, []);

  function scrollRail(direction) {
    const rail = railRef.current;

    if (!rail) return;

    const card = rail.querySelector(
      ".featured-matchup-card"
    );

    const styles = window.getComputedStyle(rail);

    const gap =
      Number.parseFloat(
        styles.columnGap || styles.gap || "0"
      ) || 0;

    const cardWidth =
      card?.getBoundingClientRect().width || 430;

    rail.scrollBy({
      left: direction * (cardWidth + gap),
      behavior: "smooth",
    });
  }

  const matchups = payload?.matchups || [];
  const status = payload?.status || {};

  const weeklyAvailable =
    payload?.weekly_snapshot_available &&
    matchups.length > 0;

  const week =
    payload?.week ||
    status.selected_week ||
    1;

  return (
    <section
      className="current-matchups-panel home-matchups-panel"
      aria-labelledby="homeMatchupsLabel"
    >
      <div className="current-matchups-heading">
        <div>
          <p className="eyebrow">
            Games Of The Week
          </p>

          <h2 id="homeMatchupsLabel">
            {error
              ? "Games Of The Week"
              : payload
                ? status.label || `Week ${week}`
                : "Loading this week's matchups..."}
          </h2>

          <p className="panel-note">
            Certified pregame outlooks for the games
            that define the week.
          </p>
        </div>

        <div className="matchup-rail-actions">
          <button
            className="icon-button"
            type="button"
            aria-label="Previous matchups"
            title="Previous matchups"
            onClick={() => scrollRail(-1)}
          >
            ←
          </button>

          <button
            className="icon-button"
            type="button"
            aria-label="Next matchups"
            title="Next matchups"
            onClick={() => scrollRail(1)}
          >
            →
          </button>
        </div>
      </div>

      <div className="home-matchup-guide">
        <p>
          <strong>Start with the football read.</strong>{" "}
          Each card tells you who ADV favors, why, and the clearest reason the game could turn.
        </p>

        <p>
          Open the full matchup board when you want the ratings, Control Framework, recent form, talent context, and familiar stats behind the pick.
        </p>
      </div>

      {!payload && !error && (
        <div className="current-matchups-empty">
          <LoadingDots text="Checking the current weekly slate" />
        </div>
      )}

      {error && (
        <div className="current-matchups-empty">
          <strong>
            Featured matchups are reconnecting
          </strong>

          <p>{error}</p>
        </div>
      )}

      {payload && !weeklyAvailable && !error && (
        <div className="current-matchups-empty">
          <strong>
            {status.label ||
              "Weekly snapshot pending"}
          </strong>

          <p>
            {payload.weekly_snapshot_note ||
              status.message ||
              "Featured matchup outlooks are not available yet."}
          </p>
        </div>
      )}

      {weeklyAvailable && (
        <>
          <div
            ref={railRef}
            className="featured-matchup-grid matchup-rail"
            aria-label="Games of the week"
          >
            {matchups.map((matchup) => (
              <MatchupCard
                key={matchup.game_id}
                matchup={matchup}
                logos={logos}
              />
            ))}
          </div>

          <div className="home-matchups-cta">
            <div>
              <strong>
                Want the full Control Framework
                breakdown?
              </strong>

              <p>
                View CFP Advantage projections and full
                Control Framework analysis for the
                complete weekly slate.
              </p>
            </div>

            <a
              className="primary-action"
              href={`/matchups?full_slate=1#full-slate`}
            >
              Explore All Week {week} Matchups
            </a>
          </div>
        </>
      )}
    </section>
  );
}

export default GamesOfWeek;

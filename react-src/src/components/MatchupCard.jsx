import TeamLogo from "./TeamLogo";
import { PollRankTag } from "./TeamContextTags";

import {
  formatPercent,
  formatProjectionMargin,
  matchupDateLabel,
  shortConferenceTag,
} from "../lib/formatters";

function MatchupCard({ matchup, logos }) {
  const awayName = matchup.away_full_name || matchup.away_team;
  const homeName = matchup.home_full_name || matchup.home_team;
  const awayConference = String(
    matchup.away_conference || ""
  ).trim();

  const homeConference = String(
    matchup.home_conference || ""
  ).trim();

  const sameConference =
    awayConference &&
    homeConference &&
    awayConference.toLowerCase() ===
      homeConference.toLowerCase();

  return (
    <article className="featured-matchup-card matchup-rail-card">
      <div className="featured-matchup-topline">
        <span>{matchupDateLabel(matchup)}</span>

        <strong>
          {matchup.context_label || "Pregame Context"}
        </strong>
      </div>

      <div className="featured-matchup-title">
        <div>
          <span>Away</span>

          <span className="featured-team-mark">
            <TeamLogo
              team={matchup.away_team}
              logos={logos}
              label={awayName}
            />
            <PollRankTag rank={matchup.away_ap_rank} />
          </span>
        </div>

        <div>
          <b>vs</b>

          {sameConference && awayConference ? (
            <div className="matchup-conference-group">
              <span className="matchup-conference-tag">
                {shortConferenceTag(awayConference)}
              </span>
            </div>
          ) : awayConference && homeConference ? (
            <div className="matchup-conference-group">
              <span className="matchup-conference-tag">
                {shortConferenceTag(awayConference)}
              </span>

              <span className="matchup-conference-divider">
                non-conf
              </span>

              <span className="matchup-conference-tag">
                {shortConferenceTag(homeConference)}
              </span>
            </div>
          ) : null}
        </div>

        <div>
          <span>Home</span>

          <span className="featured-team-mark">
            <TeamLogo
              team={matchup.home_team}
              logos={logos}
              label={homeName}
            />
            <PollRankTag rank={matchup.home_ap_rank} />
          </span>
        </div>
      </div>

      <div className="weekly-projection-strip">
        <div>
          <span>Model Lean</span>
          <strong>
            {matchup.projected_winner_full_name ||
              matchup.projected_winner}
          </strong>
        </div>

        <div>
          <span>Projected Margin</span>
          <strong>
            By{" "}
            {formatProjectionMargin(
              matchup.projected_margin_abs
            )}
          </strong>
        </div>

        <div>
          <span title="How close the projected margin is, not model confidence">
            Projection Closeness
          </span>

          <strong>
            {formatPercent(
              matchup.projection_closeness ??
                matchup.close_matchup_risk,
              0
            )}
          </strong>
        </div>
      </div>
    </article>
  );
}

export default MatchupCard;

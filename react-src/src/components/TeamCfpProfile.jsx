import { FiExternalLink } from "react-icons/fi";
import { Link } from "react-router-dom";

import MetricLabel from "./MetricLabel";
import {
  buildFrameworkTraits,
  contextualValues,
  decimal,
  numberOrNull,
  percent,
  percentile,
  scoreboardGapRead,
  teamPalette,
} from "../lib/frameworkProfile";

function MetricCell({ label, value, note }) {
  return (
    <div className="regular-cfp-metric">
      <MetricLabel label={label} />
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

function ProfileSection({ eyebrow, title, note, children }) {
  return (
    <section className="regular-cfp-section">
      <header>
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        <p>{note}</p>
      </header>
      {children}
    </section>
  );
}

function LimitedHistoricalProfile({ season, teamName, identity, view }) {
  const controlRate = view.CR ?? view.cr ?? view.control_rate ?? (
    numberOrNull(view.control_rate_pct) === null ? null : Number(view.control_rate_pct) / 100
  );

  return (
    <div className="regular-cfp-profile" style={teamPalette(identity)}>
      <header className="regular-cfp-hero">
        <div>
          <span>{season} Contextual Football Profile</span>
          <h3>Limited Historical Profile</h3>
          <strong>{teamName}</strong>
          <p>The full six-trait Control Framework begins with the 2016 data set.</p>
        </div>
      </header>
      <p className="team-reading-guide"><strong>How to read this:</strong> Start with ADV SRS, then use Control Rate and the available conversion measures to understand how often control formed and became points.</p>
      <ProfileSection eyebrow="Historical Coverage" title="Available ADV Context" note="Only measures supported by the 2015 data are shown.">
        <div className="regular-cfp-metric-grid">
          <MetricCell label="ADV Strength Rating (ADV SRS)" value={decimal(view.adv_srs, 1)} note="Opponent-adjusted strength" />
          <MetricCell label="ADV Rank" value={view.adv_srs_rank ? `#${view.adv_srs_rank}` : "-"} note="National ADV standing" />
          <MetricCell label="Control Rate (CR)" value={percent(controlRate)} note="Useful control share" />
          <MetricCell label="Schedule Strength" value={percentile(view.adv_sos_percentile)} note="Opponent context" />
        </div>
      </ProfileSection>
    </div>
  );
}

function TeamCfpProfile({ season, team, teamName, identity = {}, intel = {}, stats = {}, record = {}, driveConversion = {}, frameworkReference = {} }) {
  const view = contextualValues(intel, driveConversion);

  if (numberOrNull(season) !== null && Number(season) < 2016) {
    return <LimitedHistoricalProfile season={season} teamName={teamName} identity={identity} view={view} />;
  }

  const traits = buildFrameworkTraits(view, frameworkReference);
  if (!traits.length) return <div className="empty-state">The full Contextual Football Profile is not available for this team-season.</div>;

  const games = numberOrNull(record.pre_playoff_games) ?? numberOrNull(stats.games) ?? numberOrNull(view.games);
  const pointsFor = games && numberOrNull(record.pre_playoff_points_for) !== null ? Number(record.pre_playoff_points_for) / games : numberOrNull(stats.points_per_game);
  const pointsAgainst = games && numberOrNull(record.pre_playoff_points_against) !== null ? Number(record.pre_playoff_points_against) / games : numberOrNull(stats.points_allowed_per_game);
  const dce = view.team_season_dce ?? view.dce ?? view.drive_conversion_efficiency;
  const controlRate = view.CR ?? view.cr ?? view.control_rate ?? (numberOrNull(view.control_rate_pct) === null ? null : Number(view.control_rate_pct) / 100);
  const recentForm = view.recent_form_label || view.trajectory_bucket || "-";
  const talentYield = view.tyi_label || view.talent_yield_label || "-";
  const cardUrl = `/framework-card?season=${encodeURIComponent(season)}&team=${encodeURIComponent(team)}`;

  return (
    <div className="regular-cfp-profile" style={teamPalette(identity)}>
      <header className="regular-cfp-hero">
        <div>
          <span>{season} Contextual Football Profile</span>
          <h3>{view.contextual_profile_label || "Season Identity"}</h3>
          <strong>{teamName}</strong>
          <p>{view.contextual_profile_summary || "How this team creates, converts, and denies meaningful possession-level control."}</p>
        </div>
        <Link className="secondary-action team-cfp-card-link" to={cardUrl}>Open Downloadable Card <FiExternalLink aria-hidden="true" /></Link>
      </header>

      <p className="team-reading-guide"><strong>How to read this:</strong> Start with ADV SRS for overall strength. Use Control Foundation and Pressure to see how that strength is produced, then use Finish and Scoreboard Control Gap to see whether it is translating into results.</p>

      <ProfileSection eyebrow="Team Identity" title="Control Foundation" note="Can this team create control and deny control?">
        <div className="regular-cfp-metric-grid">
          <MetricCell label="Control Creation" value={view.control_creation_tier || "-"} note={percentile(view.control_creation_percentile)} />
          <MetricCell label="Control Denial" value={view.control_denial_tier || "-"} note={percentile(view.control_denial_percentile)} />
          <MetricCell label="Control Rate (CR)" value={percent(controlRate)} note="Share of possessions producing useful control" />
          <MetricCell label="Control Foundation" value={view.control_foundation_tier || "-"} note={percentile(view.control_foundation_percentile)} />
        </div>
      </ProfileSection>

      <ProfileSection eyebrow="Team Identity" title="Scoring Pressure" note="How much sustainable scoring pressure does this team create or allow?">
        <div className="regular-cfp-metric-grid">
          <MetricCell label="Control Pressure Per Offensive Drive" value={decimal(view.control_production_rate, 2)} note={`${view.control_production_tier || "-"} | ${percentile(view.control_production_percentile)}`} />
          <MetricCell label="Control Pressure Allowed Per Defensive Drive" value={decimal(view.defensive_control_production_allowed, 2)} note={`${view.defensive_control_production_allowed_tier || "-"} | ${percentile(view.defensive_control_production_allowed_percentile)} | Lower is better`} />
          <MetricCell label="Control Pressure" value={view.control_production_tier || "-"} note={percentile(view.control_production_percentile)} />
          <MetricCell label="Control Pressure Allowed" value={view.defensive_control_production_allowed_tier || "-"} note={`${percentile(view.defensive_control_production_allowed_percentile)} | Lower is better`} />
        </div>
      </ProfileSection>

      <ProfileSection eyebrow="Team Identity" title="Conversion Profile" note="What happens once control exists?">
        <div className="regular-cfp-metric-grid regular-cfp-five-grid">
          <MetricCell label="Finishing Control" value={view.control_finish_tier || percent(driveConversion.scoring_conversion_rate)} note={percentile(view.control_finish_percentile)} />
          <MetricCell label="Finishing Resistance" value={view.finishing_resistance_tier || "-"} note={percentile(view.finishing_resistance_percentile)} />
          <MetricCell label="Points Per Control Drive" value={decimal(view.points_per_control_drive, 2)} note="Output once meaningful control exists" />
          <MetricCell label="TD Control Conversion" value={percent(driveConversion.td_conversion_rate)} note="Touchdown finish" />
          <MetricCell label="Finish Waste" value={percent(view.finish_waste_rate)} note="Control drives producing no points" />
        </div>
      </ProfileSection>

      <ProfileSection eyebrow="Metric Relationships" title="What This Profile Looks Like In Football" note="Familiar-stat differences observed between top- and bottom-quintile team seasons.">
        <div className="team-relationship-map">
          {traits.map((trait) => (
            <div className="team-metric-relationship" key={trait.key}>
              <div><strong>{trait.formalLabel}</strong><b>{percentile(trait.percentile)}</b></div>
              <p>{trait.translation}</p>
            </div>
          ))}
        </div>
        <p className="relationship-guardrail">Population relationships; not formula inputs, game-level point adjustments, or causal estimates.</p>
      </ProfileSection>

      <ProfileSection eyebrow="Pressure vs Scoreboard" title="Scoring Pressure Read" note="Underlying scoring pressure compared with actual output.">
        <div className="pressure-compare-grid regular-cfp-pressure-grid">
          <div className="pressure-compare-column">
            <span>CFP Identity</span>
            <div><MetricLabel label="Control Pressure Per Offensive Drive" /><b>{decimal(view.control_production_rate, 2)}</b><small>{view.control_production_tier || "Sustainable scoring pressure"}</small></div>
            <div><MetricLabel label="Control Pressure Allowed Per Defensive Drive" /><b>{decimal(view.defensive_control_production_allowed, 2)}</b><small>Lower is better</small></div>
            <div><MetricLabel label="Finishing Control" /><b>{percent(view.control_finish_rate)}</b><small>How often control becomes points</small></div>
            <div><strong>Creation Waste</strong><b>{percent(view.creation_waste_rate)}</b><small>Possessions without meaningful control</small></div>
          </div>
          <div className="pressure-compare-column scoreboard-output">
            <span>Scoreboard Output</span>
            <div><strong>Points Per Game</strong><b>{decimal(pointsFor, 1)}</b><small>Actual scoring output</small></div>
            <div><strong>Points Allowed Per Game</strong><b>{decimal(pointsAgainst, 1)}</b><small>Actual scoring allowed</small></div>
            <div><strong>Red Zone TD Rate</strong><b>{percent(stats.red_zone_td_rate)}</b><small>Traditional close-range finishing</small></div>
            <div><strong>Points Per Drive</strong><b>{decimal(stats.points_per_drive, 2)}</b><small>Actual scoring efficiency</small></div>
          </div>
        </div>
      </ProfileSection>

      <ProfileSection eyebrow="Outcome & Context" title="Results Context" note="How do the underlying football traits show up in results?">
        <div className="regular-cfp-metric-grid regular-cfp-six-grid">
          <MetricCell label="ADV Strength Rating (ADV SRS)" value={decimal(view.adv_srs, 1)} note="Opponent-adjusted strength" />
          <MetricCell label="ADV Rank" value={view.adv_srs_rank ? `#${view.adv_srs_rank}` : "-"} note="National standing" />
          <MetricCell label="Schedule Strength" value={percentile(view.adv_sos_percentile)} note="Opponent context" />
          <MetricCell label="Scoreboard Control Gap" value={decimal(dce, 2)} note="Scoreboard vs underlying control" />
          <MetricCell label="Recent Form" value={recentForm} note="Current trajectory" />
          <MetricCell label="Talent Yield" value={talentYield} note={decimal(view.talent_yield_index, 2)} />
        </div>
        <p className="regular-cfp-interpretation">{scoreboardGapRead(dce)}</p>
      </ProfileSection>
    </div>
  );
}

export default TeamCfpProfile;

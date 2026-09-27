import {
  buildFrameworkTraits,
  contextualValues,
  decimal,
  numberOrNull,
  percentile,
  profileDiagnosis,
  signedDecimal,
  frameworkCardPalette,
} from "../lib/frameworkProfile";

function Trait({ trait }) {
  const width = Math.max(0, Math.min(100, trait.percentile || 0));
  const clearsFloor = trait.floor !== null && trait.percentile >= trait.floor;
  return (
    <div className={`cfp-trait-card ${clearsFloor ? "clears-champ-signal" : ""}`}>
      <div className="cfp-trait-heading">
        <div><strong>{trait.label}</strong><span>{trait.raw} | {trait.tier}</span></div>
        <div className="cfp-trait-percentile"><b>{Math.round(trait.percentile)}</b><span>percentile</span></div>
      </div>
      <div className="cfp-trait-track" aria-hidden="true">
        <i style={{ width: `${width}%` }} />
        {trait.floor !== null && <em style={{ left: `${trait.floor}%` }} />}
      </div>
      <small>{clearsFloor ? `Championship-profile floor cleared (${percentile(trait.floor)})` : `Championship-profile floor: ${percentile(trait.floor)}`}</small>
    </div>
  );
}

function FrameworkCard({ season, teamName, identity = {}, intel = {}, stats = {}, record = {}, driveConversion = {}, frameworkReference = {}, cardRef }) {
  const view = contextualValues(intel, driveConversion);
  const traits = buildFrameworkTraits(view, frameworkReference);
  const strongest = [...traits].sort((a, b) => b.percentile - a.percentile)[0];
  const limiting = [...traits].sort((a, b) => a.percentile - b.percentile)[0];
  const cleared = traits.filter((trait) => trait.floor !== null && trait.percentile >= trait.floor).length;
  const created = numberOrNull(view.control_production_rate);
  const allowed = numberOrNull(view.defensive_control_production_allowed);
  const pressureDiff = created !== null && allowed !== null ? created - allowed : null;
  const games = numberOrNull(record.pre_playoff_games) ?? numberOrNull(stats.games) ?? numberOrNull(view.games);
  const pointsFor = games && numberOrNull(record.pre_playoff_points_for) !== null ? Number(record.pre_playoff_points_for) / games : numberOrNull(stats.points_per_game);
  const pointsAgainst = games && numberOrNull(record.pre_playoff_points_against) !== null ? Number(record.pre_playoff_points_against) / games : numberOrNull(stats.points_allowed_per_game);
  const margin = numberOrNull(record.pre_playoff_avg_margin) ?? (pointsFor !== null && pointsAgainst !== null ? pointsFor - pointsAgainst : null);
  const dce = view.team_season_dce ?? view.dce ?? view.drive_conversion_efficiency;

  return (
    <article className="team-cfp-view download-framework-card" style={frameworkCardPalette(identity)} ref={cardRef}>
      <header className="download-card-header">
        <div className="download-card-team-name">
          <span>Team Profile</span>
          <strong>{teamName}</strong>
        </div>
        <div className="download-card-title">
          <span>{season} Contextual Football Profile</span>
          <h3>{view.contextual_profile_label || "Control Framework"}</h3>
          <p>{profileDiagnosis(strongest, limiting)}</p>
        </div>
        <div className="download-card-header-spacer" aria-hidden="true" />
      </header>

      <section className="cfp-diagnosis-grid">
        <div><span>Defining Advantage</span><strong>{strongest?.formalLabel || "-"}</strong><small>{percentile(strongest?.percentile)}</small></div>
        <div><span>Limiting Trait</span><strong>{limiting?.formalLabel || "-"}</strong><small>{percentile(limiting?.percentile)}</small></div>
        <div className={cleared === traits.length ? "is-complete-signal" : ""}><span>Championship Shape</span><strong>{cleared} of {traits.length} floors cleared</strong><small>Historical profile comparison</small></div>
      </section>

      <section className="team-cfp-section">
        <div className="team-cfp-section-heading"><b>1</b><div><span>Team Shape</span><h3>Six Control Traits</h3><p>Gold marks a historical championship-profile floor cleared.</p></div></div>
        <div className="cfp-trait-grid">{traits.map((trait) => <Trait key={trait.key} trait={trait} />)}</div>
      </section>

      <section className="team-cfp-section">
        <div className="team-cfp-section-heading"><b>2</b><div><span>Football Translation</span><h3>Defining Strength And Constraint</h3></div></div>
        <div className="cfp-relationship-grid">
          {[strongest, limiting].map((trait, index) => trait && (
            <div className="cfp-relationship-card" key={trait.key}>
              <span>{index === 0 ? "When This Strength Rises" : "When This Constraint Improves"}</span>
              <h4>{trait.formalLabel}</h4><b>{teamName}: {percentile(trait.percentile)}</b><p>{trait.translation}</p>
              <small>Population relationship, not a formula input or causal claim.</small>
            </div>
          ))}
        </div>
      </section>

      <section className="team-cfp-section">
        <div className="team-cfp-section-heading"><b>3</b><div><span>Pressure vs Scoreboard</span><h3>Is The Scoreboard Telling The Truth?</h3></div></div>
        <div className="cfp-context-grid">
          <div className="cfp-context-metric"><span>Pressure Differential</span><strong>{signedDecimal(pressureDiff, 2)}</strong><small>{decimal(created, 2)} created | {decimal(allowed, 2)} allowed</small></div>
          <div className="cfp-context-metric"><span>Average Score Margin</span><strong>{signedDecimal(margin, 1)}</strong><small>{decimal(pointsFor, 1)} scored | {decimal(pointsAgainst, 1)} allowed</small></div>
          <div className="cfp-context-metric"><span>Scoreboard Control Gap</span><strong>{signedDecimal(dce, 2)}</strong><small>Actual margin vs underlying control</small></div>
          <div className="cfp-context-metric"><span>Points Per Control Drive</span><strong>{decimal(view.points_per_control_drive, 2)}</strong><small>Output once control exists</small></div>
        </div>
      </section>

      <div className="team-cfp-footer">
        <span><b>ADV SRS</b>{decimal(view.adv_srs, 1)}</span>
        <span><b>ADV Rank</b>{view.adv_srs_rank ? `#${view.adv_srs_rank}` : "-"}</span>
        <span><b>Schedule Strength</b>{percentile(view.adv_sos_percentile)}</span>
        <span><b>Sample</b>{games || "-"} games | {decimal(view.offensive_drives, 0)} drives</span>
        <span><b>Reference</b>{frameworkReference.version || "Unavailable"}</span>
        <small>Descriptive team profile | Championship comparison is not a title probability.</small>
      </div>

      <footer className="download-card-signature">
        <img src="/assets/adv-logo.png" alt="" />
        <div>
          <strong>CFP Advantage</strong>
          <b>Advantage Through Contextual Football Profiles.</b>
          <small>Independent football intelligence platform. Not affiliated with the CFP, NCAA, conferences, or universities.</small>
        </div>
        <p><span>College Football Intelligence</span><span>Evidence-Based Analysis</span><b>Control What Matters</b></p>
      </footer>
    </article>
  );
}

export default FrameworkCard;

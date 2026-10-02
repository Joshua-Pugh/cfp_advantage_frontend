import { useEffect, useMemo, useState } from "react";
import PageMetadata from "../components/PageMetadata";
import StandardPage from "../components/StandardPage";

const DATA_URL = "/public-data/metric-relationships.json";

function signed(value, digits = 2) {
  if (value == null) return "—";
  const number = Number(value);
  return `${number > 0 ? "+" : ""}${number.toFixed(digits)}`;
}

function valueText(row) {
  const percentMetric = row.key.includes("rate") || row.key.includes("havoc");
  if (percentMetric) return `${(Number(row.top_minus_bottom) * 100).toFixed(1)} pts`;
  return signed(row.top_minus_bottom, row.key === "season_end_result_elo" ? 1 : 2);
}

function RelationRow({ row }) {
  const correlation = row.pearson_r == null ? 0 : Number(row.pearson_r);
  return (
    <article className="relationship-row">
      <div className="relationship-row-heading">
        <div><strong>{row.label}</strong><small>{row.correlation_strength || "Response-band comparison"}</small></div>
        <b>{row.pearson_r == null ? valueText(row) : `r ${signed(row.pearson_r)}`}</b>
      </div>
      <div className="correlation-track" aria-label={`${row.label} correlation ${row.pearson_r ?? "not available"}`}>
        <span className="correlation-midpoint" />
        {row.pearson_r != null && (
          <i
            className={correlation < 0 ? "is-negative" : "is-positive"}
            style={{ width: `${Math.abs(correlation) * 50}%`, left: correlation < 0 ? `${50 - Math.abs(correlation) * 50}%` : "50%" }}
          />
        )}
      </div>
      <p>
        Bottom quintile <strong>{Number(row.bottom_quintile_mean).toFixed(row.key === "season_end_result_elo" ? 1 : 3)}</strong>
        <span aria-hidden="true"> → </span>
        top quintile <strong>{Number(row.top_quintile_mean).toFixed(row.key === "season_end_result_elo" ? 1 : 3)}</strong>
        <span className="relationship-delta">Change {valueText(row)}</span>
      </p>
    </article>
  );
}

function CorrelationCell({ value }) {
  if (value == null) return <td>—</td>;
  const strength = Math.min(1, Math.abs(Number(value)));
  return (
    <td
      className={Number(value) < 0 ? "matrix-negative" : "matrix-positive"}
      style={{ "--matrix-opacity": 0.08 + strength * 0.5 }}
      title={`Pearson r ${signed(value, 3)}`}
    >
      {signed(value, 2)}
    </td>
  );
}

function perspectiveText(metric) {
  const defensive = ["control_denial_rate", "finishing_resistance_rate", "control_pressure_allowed"].includes(metric.key);
  if (defensive) {
    return "Read the defensive columns first. A negative value for yards, points, PPA, Success Rate, or explosiveness allowed means that stronger ADV defense accompanies less opponent production. Small links with the team's own offense describe teams that were good in both phases; they do not mean the defensive metric created offensive yards.";
  }
  if (metric.key === "raw_adv_margin") {
    return "This is a team-level margin profile, so both sides matter: positive offensive relationships and negative opponent-production relationships both describe a stronger overall team.";
  }
  return "Read the offensive columns first. Positive values mean stronger ADV offense tends to accompany more team production; negative values for havoc allowed mean stronger profiles tend to surrender less disruption. Defensive columns describe team-level co-movement, not an offensive metric causing the defense.";
}

function MetricRelationshipsPage() {
  const [data, setData] = useState(null);
  const [selectedKey, setSelectedKey] = useState("control_rate");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(DATA_URL)
      .then((response) => {
        if (!response.ok) throw new Error("Metric relationship data is unavailable.");
        return response.json();
      })
      .then(setData)
      .catch(() => setError("The current Metric Relationships study is temporarily unavailable."));
  }, []);

  const metric = useMemo(
    () => data?.metrics?.find((item) => item.key === selectedKey) || data?.metrics?.[0],
    [data, selectedKey],
  );
  const coverage = data?.coverage;
  const predictive = data?.predictive_reality_check;
  const structuredData = data ? {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: data.title,
    description: data.summary,
    url: "https://cfpadvantage.com/metric-relationships/",
    dateModified: data.generated_at_utc,
    temporalCoverage: `${coverage.seasons[0]}/${coverage.seasons[1]}`,
    distribution: { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `https://cfpadvantage.com${DATA_URL}` },
  } : null;

  return (
    <StandardPage className="metric-relationships-page">
      <PageMetadata
        title="ADV Metric Relationships | CFP Advantage"
        description="See how ADV control metrics move with familiar football stats, PPA, Success Rate, havoc, explosiveness, and result Elo."
        path="/metric-relationships/"
        structuredData={structuredData}
      />
      <section className="relationship-hero">
        <p className="eyebrow">Current Research · Public Evidence</p>
        <h2>What Changes When ADV Metrics Move?</h2>
        <p>{data?.summary || "A historical population view of CFP Advantage metrics beside familiar and established football measures."}</p>
        {coverage && <div className="relationship-coverage">
          <div><strong>{coverage.seasons[0]}–{coverage.seasons[1]}</strong><span>Seasons</span></div>
          <div><strong>{coverage.fbs_vs_fbs_team_games.toLocaleString()}</strong><span>FBS team-games</span></div>
          <div><strong>{coverage.team_seasons.toLocaleString()}</strong><span>Team-seasons</span></div>
        </div>}
        {error && <p className="status-line warn">{error}</p>}
      </section>

      {data && metric && <>
        <section className="insight-panel relationship-explainer">
          <p className="eyebrow">Choose an ADV lens</p>
          <div className="relationship-tabs" role="tablist" aria-label="ADV metrics">
            {data.metrics.map((item) => <button key={item.key} className={item.key === metric.key ? "is-active" : ""} onClick={() => setSelectedKey(item.key)}>{item.label}</button>)}
          </div>
          <div className="relationship-definition">
            <div><h2>{metric.label}</h2><p>{metric.meaning}</p></div>
            <aside><strong>Why it matters</strong><p>{metric.why}</p></aside>
          </div>
        </section>

        <section className="insight-panel">
          <div className="relationship-section-heading">
            <div><p className="eyebrow">Historical movement</p><h2>From the Bottom Quintile to the Top</h2></div>
            <p>Bars show Pearson correlation where available. The values below each bar show the observed season-relative quintile change.</p>
          </div>
          <div className="relationship-grid">{metric.relationships.map((row) => <RelationRow key={row.key} row={row} />)}</div>
        </section>

        <section className="insight-panel relationship-matrix-section">
          <div className="relationship-section-heading">
            <div><p className="eyebrow">Selected-metric comparison</p><h2>{metric.label} Beside Common Football Metrics</h2></div>
            <p>{data.comparison_matrix.note}</p>
          </div>
          <div className="matrix-reading-guide">
            <p><strong>Whose stats?</strong> Offensive columns describe the selected team's offense. Defensive columns describe what that team's defense allowed its opponents.</p>
            <p><strong>How to read this row:</strong> {perspectiveText(metric)}</p>
            <p className="matrix-method">{data.comparison_matrix.method}. Positive values move together; negative values move in opposite directions. Correlation is descriptive and does not establish cause.</p>
          </div>
          <div className="relationship-matrix-wrap">
            <table className="relationship-matrix">
              <thead>
                <tr><th>ADV metric</th>{data.comparison_matrix.columns.map((column) => <th key={column.key}><span>{column.group}</span>{column.label}</th>)}</tr>
              </thead>
              <tbody>
                {data.comparison_matrix.rows.filter((row) => row.key === metric.key).map((row) => (
                  <tr key={row.key} className="is-selected">
                    <th>{row.label}</th>
                    {data.comparison_matrix.columns.map((column) => <CorrelationCell key={column.key} value={row.values[column.key]} />)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="insight-panel distinctiveness-panel">
          <div className="relationship-section-heading">
            <div><p className="eyebrow">Information beyond the usual inputs</p><h2>ADV Is Related, but It Is Not a Renamed Stat</h2></div>
            <p>{data.distinctiveness_evidence.language}</p>
          </div>
          <div className="distinctiveness-grid">
            <article><span>{data.distinctiveness_evidence.baseline.label}</span><strong>{data.distinctiveness_evidence.baseline.mae.toFixed(3)}</strong><small>Held-out-season MAE</small></article>
            {data.distinctiveness_evidence.candidates.map((candidate) => <article key={candidate.key}>
              <span>{candidate.label}</span><strong>{candidate.mae.toFixed(3)}</strong><small>MAE improvement {candidate.mae_improvement.toFixed(3)} · R² gain {candidate.r2_gain.toFixed(3)}</small>
            </article>)}
          </div>
          <p className="matrix-method">Target: {data.distinctiveness_evidence.target}. Validation: {data.distinctiveness_evidence.validation}. These completed-season tests explain retained information; they do not claim a future betting or projection edge.</p>
        </section>

        <section className="relationship-method-grid">
          <article className="insight-panel"><p className="eyebrow">How to read correlation</p><h2>Direction and Strength</h2><p>{data.interpretation.correlation}</p><ul>{data.interpretation.strength_scale.map((item) => <li key={item.label}><strong>{item.label}</strong> begins at |r| {item.minimum_absolute_r.toFixed(1)}</li>)}</ul></article>
          <article className="insight-panel"><p className="eyebrow">Familiar benchmark</p><h2>Why Elo Is Here</h2><p>{data.interpretation.elo}</p><p>{data.interpretation.response_bands}</p></article>
        </section>

        {predictive && <section className="insight-panel predictive-reality-card">
          <div><p className="eyebrow">Chronological reality check</p><h2>Useful Context, Measured Honestly</h2><p>{predictive.language}</p></div>
          <div className="relationship-coverage">
            <div><strong>{predictive.games.toLocaleString()}</strong><span>Out-of-sample games</span></div>
            <div><strong>{predictive.traditional_plus_adv_mae.toFixed(3)}</strong><span>Traditional + ADV MAE</span></div>
            <div><strong>{signed(predictive.winner_accuracy_gain * 100, 2)} pts</strong><span>Winner accuracy change</span></div>
          </div>
        </section>}

        <section className="relationship-guardrail">
          <strong>Research boundaries</strong>
          <ul>{data.interpretation.guardrails.map((guardrail) => <li key={guardrail}>{guardrail}</li>)}</ul>
          <a href={DATA_URL}>Download the machine-readable public dataset</a>
        </section>
      </>}
    </StandardPage>
  );
}

export default MetricRelationshipsPage;

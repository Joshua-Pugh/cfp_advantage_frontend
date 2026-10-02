import { useEffect, useState } from "react";
import PageMetadata from "../components/PageMetadata";
import StandardPage from "../components/StandardPage";

const DATA_URL = "/public-data/validation-record.json";

function percent(value) {
  return value == null ? "Pending" : `${(Number(value) * 100).toFixed(2)}%`;
}

function number(value, digits = 2) {
  return value == null ? "Pending" : Number(value).toFixed(digits);
}

function ModelRecordPage() {
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(DATA_URL)
      .then((response) => {
        if (!response.ok) throw new Error("Model record unavailable");
        return response.json();
      })
      .then(setRecord)
      .catch(() => setError("The current public model record is temporarily unavailable."));
  }, []);

  const current = record?.current_season;
  const summary = current?.summary;
  const historical = record?.historical_evidence;

  return (
    <StandardPage className="model-record-page">
      <PageMetadata
        title="Public Model Record | CFP Advantage"
        description="Published CFP Advantage historical evidence, graded 2026 results, pending projections, receipts, and development-validation limits."
        path="/model-record/"
      />
      <section className="model-record-hero">
        <p className="eyebrow">Public Evidence · Auditable Scope</p>
        <h2>The Model Record, With Its Limits</h2>
        <p>Historical evidence, graded live-season results, and pending projections are different kinds of evidence. This page keeps them separate and links the published receipts.</p>
      </section>

      {error && <p className="status-line warn">{error}</p>}
      {record && <>
        <section className="insight-panel">
          <p className="eyebrow">Current season</p>
          <h2>2026 Development Validation</h2>
          <div className="record-stat-grid">
            <article><span>Published games</span><strong>{summary.games_published}</strong></article>
            <article><span>Graded games</span><strong>{summary.games_graded}</strong></article>
            <article><span>Pending games</span><strong>{summary.games_pending}</strong></article>
            <article><span>Winner accuracy</span><strong>{percent(summary.winner_accuracy)}</strong></article>
            <article><span>Margin MAE</span><strong>{number(summary.margin_mae)}</strong></article>
          </div>
          <div className="record-scope-note"><strong>Scope:</strong> {current.specification_note}</div>
        </section>

        <section className="insight-panel">
          <p className="eyebrow">Weekly receipts</p>
          <h2>Published and Graded by Week</h2>
          <div className="record-table-wrap">
            <table className="record-table">
              <thead><tr><th>Week</th><th>Published</th><th>Graded</th><th>Pending</th><th>Winner accuracy</th><th>Margin MAE</th><th>Receipt</th></tr></thead>
              <tbody>{current.weeks.map((week) => <tr key={week.week}>
                <th>Week {week.week}</th><td>{week.games_published}</td><td>{week.games_graded}</td><td>{week.games_pending}</td><td>{percent(week.winner_accuracy)}</td><td>{number(week.margin_mae, 3)}</td><td>v{week.receipt_version}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <a className="primary-action record-receipt-link" href={record.receipt_repository_url} target="_blank" rel="noreferrer">Open Immutable Public Receipts</a>
        </section>

        <section className="record-evidence-grid">
          <article className="insight-panel">
            <p className="eyebrow">Historical evidence</p><h2>{historical.scope}</h2>
            <dl><div><dt>Games</dt><dd>{historical.games.toLocaleString()}</dd></div><div><dt>Winner accuracy</dt><dd>{percent(historical.winner_accuracy)}</dd></div><div><dt>Margin MAE</dt><dd>{number(historical.margin_mae)}</dd></div><div><dt>Margin RMSE</dt><dd>{number(historical.margin_rmse)}</dd></div></dl>
            <p>{historical.limitation}</p>
          </article>
          <article className="insight-panel">
            <p className="eyebrow">Independent review</p><h2>{record.independent_review.status}</h2>
            <p>{record.independent_review.note}</p>
            <p>Public receipts make the claims inspectable. They do not turn first-party reporting into an independent audit.</p>
          </article>
        </section>

        <section className="relationship-guardrail">
          <strong>Reading rule</strong>
          <p>Do not combine pending games with graded accuracy. Do not present retrospective historical results as an untouched prospective season. Cite the season, week, update time, and evidence scope.</p>
          <a href={DATA_URL} download="cfp-advantage-validation-record.json">Download the machine-readable validation record</a>
        </section>
      </>}
    </StandardPage>
  );
}

export default ModelRecordPage;

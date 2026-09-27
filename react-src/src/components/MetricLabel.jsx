import { useState } from "react";

const METRIC_GUIDES = {
  "ADV Strength Rating (ADV SRS)": "Start here for overall opponent-adjusted team strength.",
  "ADV Rank": "Use with ADV SRS to place the team's strength in national context.",
  "Schedule Strength": "Shows the quality of the opponents behind the profile.",
  "Control Creation": "How often the offense creates meaningful possession-level control.",
  "Control Denial": "How often the defense prevents opponents from creating meaningful control.",
  "Control Rate (CR)": "The share of possessions that become useful control opportunities.",
  "Control Foundation": "The combined ability to create control and deny it to opponents.",
  "Control Pressure Per Offensive Drive": "Repeatable scoring pressure created per offensive possession.",
  "Control Pressure Allowed Per Defensive Drive": "Repeatable scoring pressure allowed per defensive possession. Lower is better.",
  "Control Pressure": "How strongly a team turns possession control into sustainable scoring pressure.",
  "Control Pressure Allowed": "How well the defense suppresses sustainable scoring pressure. Lower is better.",
  "Finishing Control": "How often meaningful control possessions produce points.",
  "Finishing Resistance": "How often the defense keeps an opponent's control possession from producing points.",
  "Points Per Control Drive": "Scoring output after meaningful control has already been established.",
  "TD Control Conversion": "The share of control drives that finish with touchdowns.",
  "Finish Waste": "The share of control drives that produce no points.",
  "Scoreboard Control Gap": "Actual scoring margin minus the margin implied by the underlying control profile.",
  "Recent Form": "How the current profile is moving relative to its established baseline.",
  "Talent Yield": "Whether results are running above or below the expectation created by roster talent.",
};

function MetricLabel({ label }) {
  const [open, setOpen] = useState(false);
  const guide = METRIC_GUIDES[label];

  if (!guide) return <span>{label}</span>;

  return (
    <span className={`metric-label-with-help ${open ? "is-open" : ""}`}>
      <span>{label}</span>
      <button
        type="button"
        className="metric-use-tip"
        aria-label={`How to use ${label}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      <span className="metric-use-tooltip" role="tooltip">{guide}</span>
    </span>
  );
}

export default MetricLabel;

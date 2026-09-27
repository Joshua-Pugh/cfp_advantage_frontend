import { useEffect, useState } from "react";

import { api } from "../lib/api";
import LoadingDots from "./LoadingDots";

const LABELS = {
  COMPLETIONS: "CMP",
  "QB HUR": "HUR",
  "In 20": "IN 20",
};

function displayStat(value, column) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  if (column === "PCT") {
    const percent = Math.abs(number) <= 1 ? number * 100 : number;
    return `${percent.toFixed(1)}%`;
  }
  return Number.isInteger(number) ? number.toLocaleString() : number.toFixed(1);
}

export default function TeamPlayerStats({ season, team, teamName }) {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api(`/api/product-a/player-stats/team/${encodeURIComponent(season)}/${encodeURIComponent(team)}`)
      .then((data) => active && setPayload(data))
      .catch(() => active && setError("Player statistics are temporarily unavailable."));
    return () => { active = false; };
  }, [season, team]);

  return <div className="team-player-stats-view">
    <div className="team-stats-intro">
      <p className="eyebrow">Player Statistics</p>
      <h3>{teamName} Season Leaders</h3>
      <p>Season-to-date production from CollegeFootballData.com. Categories appear when the source reports player-level data.</p>
    </div>
    {!payload && !error && <div className="team-page-loading"><LoadingDots text={`Loading ${teamName} player stats`} /></div>}
    {error && <p className="status-line warn">{error}</p>}
    {payload?.sections?.map((section) => <section className="player-stat-section" key={section.key}>
      <h3>{section.label}</h3>
      <div className="player-stat-table-wrap">
        <table className="player-stat-table">
          <thead><tr><th>Player</th><th>Pos</th>{section.columns.map((column) => <th key={column}>{LABELS[column] || column}</th>)}</tr></thead>
          <tbody>{section.players.map((player) => <tr key={`${section.key}-${player.player_id || player.player}`}><td>{player.player}</td><td>{player.position || "-"}</td>{section.columns.map((column) => <td key={column}>{displayStat(player.stats[column], column)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>)}
    {payload && !payload.sections?.length && <p className="status-line">No player statistics are available for this team and season.</p>}
  </div>;
}

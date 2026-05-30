const CONFIG = window.CFP_ADV_CONFIG || {};
const API_BASE = (CONFIG.API_BASE_URL || "https://cfp-advantage-model-1.onrender.com").replace(/\/$/, "");
const TERMS_ACCEPTED_KEY = "cfp_adv_terms_accepted";
const TERMS_VERSION_KEY = "cfp_adv_terms_version";
const TERMS_ACCEPTED_AT_KEY = "cfp_adv_terms_accepted_at";
const DEFAULT_TERMS_VERSION = "2026-05-29-product-a-v4";
const TERMS_GATE_MESSAGE = "Before entering CFP Advantage, please review and accept the Terms of Use. CFP Advantage provides football intelligence and model-derived context for informational and entertainment purposes. It does not guarantee outcomes, and access is only allowed if you agree to the Terms, Privacy Policy, Refund Policy, and Disclaimer.";

const METRIC_DISPLAY = {
  "ADV SRS": ["ADV Strength Rating (ADV SRS)", "Measures a team's overall football-control strength after accounting for schedule context. Higher values indicate stronger season-level team quality."],
  "OFF ADV SRS": ["Offensive ADV Strength Rating (OFF ADV SRS)", "Measures how much value a team's offense creates through sustained, useful football control."],
  "DEF ADV SRS": ["Defensive ADV Strength Rating (DEF ADV SRS)", "Measures how much a team's defense suppresses opponent control and scoring opportunity."],
  "SP ADV": ["Special Teams Advantage (SP ADV)", "Captures meaningful special teams events that change field position, scoring, or possession value."],
  "ADV SOS": ["ADV Strength of Schedule (ADV SOS)", "Measures the quality of opponents a team faced through the ADV lens."],
  "Control Rate": ["Control Rate (CR)", "Measures how often a team creates useful control opportunities across its games. It is a consistency signal, not a final score measure."],
  "DCE": ["Drive Conversion Efficiency (DCE)", "Measures how efficiently a team's scoreboard output lines up with its underlying drive control."],
  "Weak-Side Profile": ["Weak-Side Profile", "Shows the weaker side of a team's offense/defense profile so users can spot balance or fragility."],
  "ADV Expected Margin": ["ADV Expected Margin", "A matchup margin estimate created from the difference between two teams' ADV strength profiles."],
  "ADV Deserved Margin": ["ADV Deserved Margin", "A postgame control recap that compares how the game was played to the final scoreboard result."],
  "Scoreboard vs ADV Gap": ["Scoreboard vs ADV Gap", "Shows when the final score looked stronger or weaker than the underlying football-control profile."],
  "Talent Yield Index": ["Talent Yield Index (TYI)", "Compares roster talent context with ADV performance to show overachievement, underachievement, or development signal."],
};

const COMPARISON_DISPLAY = {
  "Total Yards": "Total offensive yardage gained.",
  "Yards Per Play": "Average yards gained per offensive play.",
  "Passing Yards": "Yards gained through the passing game.",
  "Rushing Yards": "Yards gained through the running game.",
  "Explosive Plays": "High-impact plays that create large chunks of field position or scoring opportunity.",
  "Points Per Drive": "Average points produced per offensive drive.",
  "ADV Drive Conversion": "How often meaningful ADV control drives turn into points, with touchdown and field goal quality separated where available.",
  "First Downs": "How often an offense extends possessions by earning a new set of downs.",
  "Third/Fourth Down Conversions": "How often an offense converts critical downs to keep drives alive.",
  "Red Zone Efficiency": "How often a team turns red zone trips into points and touchdowns.",
  "Turnover Margin": "Difference between takeaways and giveaways.",
  "Penalties / Penalty Yards": "Penalty volume and field-position cost.",
  "Sacks / TFL": "Negative-play pressure created or allowed.",
  "Kick/Punt Returns": "Return-yard context for special teams field position.",
  "Time of Possession": "How long a team controlled the football.",
  "Garbage-Time / Leverage Tags": "Game-state context that separates meaningful competitive possessions from lower-leverage possessions.",
};

function $(id) {
  return document.getElementById(id);
}

async function api(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}`);
  }
  return response.json();
}

function formatNumber(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "-";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setStatus(message, tone = "") {
  const el = $("pageStatus");
  if (!el) return;
  el.textContent = message;
  el.className = `page-status ${tone}`.trim();
}

function storageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn("CFP Advantage localStorage unavailable:", error.message);
    return null;
  }
}

function storageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn("CFP Advantage localStorage write unavailable:", error.message);
  }
}

function ensureTermsGate(message, version) {
  if (document.body.dataset.page === "legal") return;
  const termsVersion = version || DEFAULT_TERMS_VERSION;
  const accepted = storageGet(TERMS_ACCEPTED_KEY) === "true";
  const acceptedVersion = storageGet(TERMS_VERSION_KEY);
  if (accepted && acceptedVersion === termsVersion) return;

  let gate = $("termsBanner");
  if (!gate) {
    gate = document.createElement("section");
    gate.id = "termsBanner";
    gate.className = "terms-banner";
    gate.setAttribute("aria-label", "Terms acknowledgement");
    document.body.appendChild(gate);
  }
  gate.innerHTML = `
    <div class="terms-card">
      <p class="eyebrow">CFP Advantage Terms</p>
      <h2>Accept Terms To Continue</h2>
      <p id="termsBannerText">${escapeHtml(message || TERMS_GATE_MESSAGE)}</p>
      <div class="terms-actions">
        <button id="termsAcceptButton" type="button">Accept And Enter</button>
        <a href="legal.html">Read Legal Terms</a>
      </div>
    </div>
  `;
  gate.classList.remove("is-hidden");
  document.body.classList.add("terms-locked");
  $("termsAcceptButton").addEventListener("click", () => {
    storageSet(TERMS_ACCEPTED_KEY, "true");
    storageSet(TERMS_VERSION_KEY, termsVersion);
    storageSet(TERMS_ACCEPTED_AT_KEY, new Date().toISOString());
    gate.classList.add("is-hidden");
    document.body.classList.remove("terms-locked");
  });
}

async function loadTermsGate() {
  try {
    const legal = await api("/api/legal/acknowledgement");
    ensureTermsGate(TERMS_GATE_MESSAGE, legal.terms_version);
  } catch (error) {
    ensureTermsGate(TERMS_GATE_MESSAGE, DEFAULT_TERMS_VERSION);
  }
}

function renderRows(target, rows, columns) {
  const el = $(target);
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = `<div class="empty-state">No rows available.</div>`;
    return;
  }
  el.innerHTML = `
    <table class="data-table compact-table">
      <thead><tr>${columns.map((col) => `<th>${col.label}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows.map((row) => `
          <tr>${columns.map((col) => `<td>${col.render ? col.render(row) : row[col.key] ?? "-"}</td>`).join("")}</tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderMetricCards(target, rows) {
  const el = $(target);
  if (!el) return;
  el.innerHTML = rows.map((metric) => `
    <article class="metric-guide-card">
      <p class="eyebrow">${escapeHtml(metric.group || "Metric")}</p>
      <h3>${escapeHtml(publicMetricName(metric.name))}</h3>
      <p>${escapeHtml(publicMetricDescription(metric))}</p>
    </article>
  `).join("");
}

function publicMetricName(name) {
  return METRIC_DISPLAY[name]?.[0] || name;
}

function publicMetricDescription(metric) {
  return METRIC_DISPLAY[metric.name]?.[1]
    || COMPARISON_DISPLAY[metric.name]
    || metric.plain_english
    || metric.note
    || "Football context metric used to compare teams and games.";
}

async function loadMetricPage() {
  setStatus("Loading metric catalog...");
  const [metrics, stats] = await Promise.all([
    api("/api/product-a/metric-catalog"),
    api("/api/product-a/comparison-stats"),
  ]);
  renderMetricCards("coreMetricGrid", metrics.metrics || []);
  renderMetricCards("comparisonMetricGrid", stats.stats || []);
  setStatus("Metric catalog loaded.", "ok");
}

async function loadHistoricalPage() {
  setStatus("Loading seasons...");
  const seasonsPayload = await api("/api/seasons");
  const seasons = seasonsPayload.seasons || [];
  const seasonSelect = $("seasonSelect");
  seasonSelect.innerHTML = seasons.map((season) => `<option value="${season}">${season}</option>`).join("");
  seasonSelect.value = String(seasons[0] || "");
  await populateHistoricalTeams();
  seasonSelect.addEventListener("change", populateHistoricalTeams);
  $("buildHistoricalButton").addEventListener("click", buildHistoricalMatchup);
  setStatus("Historical matchup builder ready.", "ok");
}

async function populateHistoricalTeams() {
  const season = $("seasonSelect").value;
  if (!season) return;
  const payload = await api(`/api/product-a/team-board?season=${encodeURIComponent(season)}`);
  const teams = (payload.teams || payload.rows || []).filter((row) => row.team);
  window.__historicalTeams = teams;
  const options = teams.map((team) => `<option value="${team.team}">${team.team}</option>`).join("");
  $("teamASelect").innerHTML = options;
  $("teamBSelect").innerHTML = options;
  if (teams[1]) $("teamBSelect").value = teams[1].team;
}

async function buildHistoricalMatchup() {
  const season = $("seasonSelect").value;
  const teamA = $("teamASelect").value;
  const teamB = $("teamBSelect").value;
  if (!season || !teamA || !teamB || teamA === teamB) {
    setStatus("Pick two different teams.", "warn");
    return;
  }
  setStatus("Building matchup as-of view...");
  let payload;
  try {
    payload = await api(`/api/product-a/matchup-preview?season=${encodeURIComponent(season)}&team_a=${encodeURIComponent(teamA)}&team_b=${encodeURIComponent(teamB)}`);
  } catch (error) {
    $("historicalResult").innerHTML = `
      <div class="insight-panel">
        <p class="eyebrow">${escapeHtml(season)} Historical Matchup</p>
        <h2>${escapeHtml(teamA)} vs ${escapeHtml(teamB)}</h2>
        <p class="interpretation">No matchup preview is available for this pair in the selected season. One or both teams may be outside the qualified season board, or the backend does not have enough retained data for this matchup.</p>
      </div>
    `;
    setStatus(error.message, "warn");
    return;
  }
  const matchup = payload.matchup || payload;
  const teamARow = matchup.team_a || {};
  const teamBRow = matchup.team_b || {};
  const marginTeamA = Number(matchup.projected_margin_team_a ?? matchup.expected_margin ?? matchup.projected_margin);
  const marginText = Number.isFinite(marginTeamA)
    ? `${marginTeamA >= 0 ? teamA : teamB} by ${Math.abs(marginTeamA).toFixed(1)}`
    : "-";
  const gamesPlayed = matchup.games_played || [];
  const playedText = gamesPlayed.length
    ? gamesPlayed.map((game) => {
        const score = game.home_points != null && game.away_points != null
          ? `${game.away_team} ${game.away_points}, ${game.home_team} ${game.home_points}`
          : `${game.away_team} at ${game.home_team}`;
        return `<li><strong>${escapeHtml(game.date || "Date unavailable")}</strong> - ${escapeHtml(score)}${game.has_adv_recap ? " · ADV recap available" : ""}</li>`;
      }).join("")
    : `<li>These teams did not play each other in ${escapeHtml(season)} in the retained schedule data.</li>`;
  const conferenceNote = teamARow.conference && teamBRow.conference
    ? teamARow.conference === teamBRow.conference
      ? `Both teams were listed in ${teamARow.conference} for ${season}.`
      : `${teamA} was listed in ${teamARow.conference}; ${teamB} was listed in ${teamBRow.conference}.`
    : "Conference context is unavailable for one or both teams.";
  const tierNote = teamARow.tier && teamBRow.tier
    ? `${teamA}: ${teamARow.tier} / ${teamB}: ${teamBRow.tier}.`
    : "Tier context is unavailable for one or both teams.";
  $("historicalResult").innerHTML = `
    <div class="insight-panel">
      <p class="eyebrow">${season} Historical Matchup</p>
      <h2>${teamA} vs ${teamB}</h2>
      <div class="summary-grid">
        <div><span>Model Lean</span><strong>${escapeHtml(matchup.projected_winner || matchup.favorite || "-")}</strong></div>
        <div><span>Projected Margin</span><strong>${escapeHtml(marginText)}</strong></div>
        <div><span>Confidence Bucket</span><strong>${escapeHtml(matchup.confidence_bucket?.label || matchup.winner_confidence_bucket || matchup.confidence || "-")}</strong></div>
        <div><span>${escapeHtml(teamA)} ADV SRS</span><strong>${formatNumber(teamARow.adv_srs, 2)}</strong></div>
        <div><span>${escapeHtml(teamB)} ADV SRS</span><strong>${formatNumber(teamBRow.adv_srs, 2)}</strong></div>
        <div><span>ADV SRS Gap</span><strong>${formatNumber(matchup.adv_srs_gap_team_a, 2)}</strong></div>
      </div>
      <p class="interpretation">${escapeHtml(matchup.context || matchup.interpretation || "This page displays football-intelligence context for the selected season.")}</p>
      <div class="context-callout">
        <h3>Season Context</h3>
        <p>${escapeHtml(conferenceNote)} ${escapeHtml(tierNote)}</p>
      </div>
      <div class="context-callout">
        <h3>Did They Play?</h3>
        <ul>${playedText}</ul>
      </div>
      <div class="context-callout">
        <h3>Important Read</h3>
        <p>This is a historical matchup view from the selected season board. If the teams did not play, it is a hypothetical team-strength comparison, not a game recap.</p>
      </div>
    </div>
  `;
  setStatus("Historical matchup loaded.", "ok");
}

async function loadBracketPage() {
  setStatus("Loading Bracket Room shell...");
  const seasonsPayload = await api("/api/seasons");
  const season = (seasonsPayload.seasons || [])[0];
  if (!season) {
    setStatus("No seasons returned by API.", "warn");
    return;
  }
  const payload = await api(`/api/product-a/team-board?season=${encodeURIComponent(season)}`);
  const rows = (payload.teams || payload.rows || []).slice(0, 12);
  renderRows("bracketTable", rows, [
    { label: "Rank", render: (row) => row.adv_srs_rank ?? "-" },
    { label: "Team", key: "team" },
    { label: "Conf", key: "conference" },
    { label: "ADV SRS", render: (row) => formatNumber(row.adv_srs, 2) },
    { label: "SOS", render: (row) => formatNumber(row.adv_sos, 2) },
  ]);
  setStatus("Bracket Room shell loaded. Title-probability endpoint is the next backend exposure step.", "ok");
}

async function loadLegalPage() {
  setStatus("Loading acknowledgement...");
  const legal = await api("/api/legal/acknowledgement");
  $("legalMessage").textContent = legal.message || "";
  $("termsVersion").textContent = legal.terms_version || "-";
  $("acceptTermsButton").addEventListener("click", () => {
    storageSet(TERMS_ACCEPTED_KEY, "true");
    storageSet(TERMS_VERSION_KEY, legal.terms_version || DEFAULT_TERMS_VERSION);
    storageSet(TERMS_ACCEPTED_AT_KEY, new Date().toISOString());
    setStatus("Acknowledgement saved in this browser.", "ok");
  });
  setStatus("Legal acknowledgement loaded.", "ok");
}

async function loadNewsPage() {
  setStatus("News endpoint pending.", "warn");
  $("newsList").innerHTML = `
    <article class="insight-panel">
      <p class="eyebrow">Backend-Cached RSS</p>
      <h2>News Feed Ready For Endpoint</h2>
      <p class="interpretation">The page is ready for <code>/api/news/latest</code>. It should be backend-cached RSS only, refreshed on the server, and never fetched directly from the browser.</p>
    </article>
  `;
}

async function boot() {
  const page = document.body.dataset.page;
  try {
    await loadTermsGate();
    if (page === "metrics") await loadMetricPage();
    if (page === "historical") await loadHistoricalPage();
    if (page === "bracket") await loadBracketPage();
    if (page === "legal") await loadLegalPage();
    if (page === "news") await loadNewsPage();
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
  }
}

boot();

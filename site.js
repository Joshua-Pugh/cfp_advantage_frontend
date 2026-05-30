const CONFIG = window.CFP_ADV_CONFIG || {};
const API_BASE = (CONFIG.API_BASE_URL || "https://cfp-advantage-model-1.onrender.com").replace(/\/$/, "");
const CACHE_PREFIX = "cfp_adv_api_cache:";
const CACHE_TTL_MS = 1000 * 60 * 20;
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
  const key = `${CACHE_PREFIX}${path}`;
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(key) || "null");
    if (cached && Date.now() - cached.stored_at < CACHE_TTL_MS) {
      return cached.data;
    }
  } catch (error) {
    console.warn("CFP Advantage cache read unavailable:", error.message);
  }
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}`);
  }
  const data = await response.json();
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ stored_at: Date.now(), data }));
  } catch (error) {
    console.warn("CFP Advantage cache write unavailable:", error.message);
  }
  return data;
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

function signed(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(2)}`;
}

const teamStatLabels = {
  yards_per_game: "Yards / Game",
  yards_allowed_per_game: "Yards Allowed / Game",
  yards_differential_per_game: "Yard Differential / Game",
  points_per_drive: "Points / Drive",
  points_per_game: "Points / Game",
  opp_points_per_game: "Opp Points / Game",
  red_zone_score_rate: "Red Zone Score Rate",
  third_down_rate: "Third Down Rate",
  turnover_margin: "Turnover Margin",
  scoring_conversion_rate: "ADV Drive Conversion",
  drive_conversion_rate: "Drive Conversion Rate",
  avg_starting_field_position: "Avg Starting Field Position",
  time_of_possession: "Time of Possession",
  completion_rate: "Completion Rate",
  field_goal_rate: "Field Goal Rate",
};

function prettyStatLabel(key) {
  return teamStatLabels[key] || String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (chr) => chr.toUpperCase());
}

function formatTeamStatValue(key, value) {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = Number(value);
  const percentKeys = new Set([
    "third_down_rate",
    "red_zone_score_rate",
    "scoring_conversion_rate",
    "drive_conversion_rate",
    "completion_rate",
    "field_goal_rate",
  ]);
  const signedKeys = new Set([
    "turnover_margin",
    "yards_differential_per_game",
  ]);
  if (percentKeys.has(key)) {
    return `${formatNumber(Number(value) * 100, 1)}%`;
  }
  if (signedKeys.has(key) && Number.isFinite(numeric)) {
    return signed(numeric);
  }
  if (Number.isFinite(numeric)) {
    return Number.isInteger(numeric) ? String(numeric) : formatNumber(numeric, 1);
  }
  return escapeHtml(value);
}

function buildTeamStatRows(stats = {}, conversion = {}) {
  const primaryOrder = [
    "yards_per_game",
    "yards_allowed_per_game",
    "yards_differential_per_game",
    "points_per_game",
    "points_per_drive",
    "scoring_conversion_rate",
    "drive_conversion_rate",
    "red_zone_score_rate",
    "third_down_rate",
    "turnover_margin",
  ];
  const rows = [];
  const added = new Set();

  const addRow = (key, value) => {
    if (value === null || value === undefined || value === "") return;
    added.add(key);
    rows.push(
      `<div><span>${escapeHtml(prettyStatLabel(key))}</span><strong>${escapeHtml(formatTeamStatValue(key, value))}</strong></div>`
    );
  };

  primaryOrder.forEach((key) => {
    if (key in stats) addRow(key, stats[key]);
    else if (key in conversion) addRow(key, conversion[key]);
  });

  Object.entries(stats).forEach(([key, value]) => {
    if (!added.has(key)) addRow(key, value);
  });
  Object.entries(conversion).forEach(([key, value]) => {
    if (!added.has(key)) addRow(key, value);
  });
  return rows.join("");
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
    <article class="guide-card">
      <span>${escapeHtml(metric.group || "Metric")}</span>
      <h4>${escapeHtml(publicMetricName(metric.name))}</h4>
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
  renderMetricCards("metricCatalogGrid", metrics.metrics || []);
  renderMetricCards("comparisonStatsGrid", stats.stats || []);
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
  setStatus("Loading Bracket Room...");
  const seasonsPayload = await api("/api/seasons");
  const season = (seasonsPayload.seasons || [])[0];
  if (!season) {
    setStatus("No seasons returned by API.", "warn");
    return;
  }
  const payload = await api(`/api/product-a/bracket-room?season=${encodeURIComponent(season)}`);
  const summary = payload.summary || {};
  const titleRows = (payload.title_probabilities || []).slice(0, 12);
  const leverageRows = (payload.team_leverage || []).slice(0, 12);
  const upsetRows = (payload.matchup_probabilities || []).slice(0, 8);
  const rows = leverageRows.length ? leverageRows : titleRows;
  $("bracketSummary").innerHTML = `
    <div class="summary-grid">
      <div><span>Season</span><strong>${escapeHtml(season)}</strong></div>
      <div><span>Title Favorite</span><strong>${escapeHtml(summary.title_favorite || titleRows[0]?.team || "-")}</strong></div>
      <div><span>Favorite Probability</span><strong>${formatNumber((summary.title_favorite_probability ?? titleRows[0]?.title_probability) * 100, 1)}%</strong></div>
      <div><span>Actual Champion</span><strong>${escapeHtml(summary.actual_champion || "-")}</strong></div>
      <div><span>Champion Probability Rank</span><strong>${escapeHtml(summary.actual_champion_probability_rank || "-")}</strong></div>
      <div><span>High Upset-Risk Matchups</span><strong>${escapeHtml(summary.high_upset_risk_matchups ?? "-")}</strong></div>
    </div>
  `;
  renderRows("bracketTable", rows, [
    { label: "Title Rank", render: (row) => row.title_probability_rank ?? row.adv_srs_rank ?? "-" },
    { label: "Team", key: "team" },
    { label: "Seed", key: "seed" },
    { label: "ADV SRS", render: (row) => formatNumber(row.adv_srs, 2) },
    { label: "Title Probability", render: (row) => `${formatNumber(Number(row.title_probability) * 100, 1)}%` },
    { label: "Path Leverage", render: (row) => formatNumber(row.path_leverage_index, 3) },
    { label: "Context", render: (row) => escapeHtml(row.risk_notes || row.title_signal_tags || "-") },
  ]);
  renderRows("bracketUpsetTable", upsetRows, [
    { label: "Favorite", key: "favorite" },
    { label: "Opponent", key: "underdog" },
    { label: "Favorite Win %", render: (row) => `${formatNumber(Number(row.favorite_win_probability) * 100, 1)}%` },
    { label: "Upset Risk", render: (row) => `${formatNumber(Number(row.upset_risk) * 100, 1)}%` },
    { label: "Risk Label", key: "upset_risk_label" },
  ]);
  setStatus("Bracket Room loaded.", "ok");
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
  setStatus("Loading news...");
  const payload = await api("/api/news/latest?limit=8");
  const rows = payload.items || [];
  $("newsList").innerHTML = rows.length ? rows.map((item) => `
    <article class="news-item">
      <span>${escapeHtml(item.source || "College Football")}</span>
      <h3><a href="${escapeHtml(item.link)}" rel="noopener noreferrer" target="_blank">${escapeHtml(item.title)}</a></h3>
      <p>${escapeHtml(item.published || "Recent")}</p>
    </article>
  `).join("") : `
    <article class="insight-panel">
      <p class="eyebrow">News Feed</p>
      <h2>No headlines available</h2>
      <p class="interpretation">The backend news cache did not return current headlines.</p>
    </article>
  `;
  setStatus("News loaded.", "ok");
}

async function loadTeamPage() {
  setStatus("Loading teams...");
  const seasonsPayload = await api("/api/seasons");
  const seasons = seasonsPayload.seasons || [];
  const seasonSelect = $("teamSeasonSelect");
  seasonSelect.innerHTML = seasons.map((season) => `<option value="${season}">${season}</option>`).join("");
  seasonSelect.value = String(seasons[0] || "");
  await populateTeamPageTeams();
  seasonSelect.addEventListener("change", populateTeamPageTeams);
  $("loadTeamButton").addEventListener("click", renderTeamPage);
  setStatus("Team page ready.", "ok");
}

async function populateTeamPageTeams() {
  const season = $("teamSeasonSelect").value;
  if (!season) return;
  const payload = await api(`/api/product-a/team-board?season=${encodeURIComponent(season)}&limit=300`);
  const teams = (payload.teams || payload.rows || []).filter((row) => row.team);
  $("teamPageSelect").innerHTML = teams.map((team) => `<option value="${escapeHtml(team.team)}">${escapeHtml(team.team)}</option>`).join("");
}

async function renderTeamPage() {
  const season = $("teamSeasonSelect").value;
  const team = $("teamPageSelect").value;
  if (!season || !team) {
    setStatus("Choose a season and team.", "warn");
    return;
  }
  setStatus("Loading team profile...");
  try {
    const [profile, schedule] = await Promise.all([
      api(`/api/team/${encodeURIComponent(season)}/${encodeURIComponent(team)}`),
      api(`/api/team/${encodeURIComponent(season)}/${encodeURIComponent(team)}/schedule?view=full`),
    ]);
    
    const intel = profile.intelligence || {};
    const stats = profile.comparison_stats || {};
    const record = profile.record || {};
    const games = Array.isArray(schedule.schedule) ? schedule.schedule : [];
    
    // Store data for tab switching
    window.__teamPageData = {
      season,
      team,
      intel,
      stats,
      record,
      games,
    };

    const scheduleHtml = renderTeamScheduleView(season, team, intel, record, games);
    const statsHtml = renderTeamStatsView(intel, stats);

    $("teamPageResult").innerHTML = `
      <div id="teamScheduleView" class="team-view-panel is-active">
        ${scheduleHtml}
      </div>
      <div id="teamStatsView" class="team-view-panel">
        ${statsHtml}
      </div>
    `;

    // Setup tab switching
    $("teamScheduleTab").addEventListener("click", () => switchTeamTab("schedule"));
    $("teamStatsTab").addEventListener("click", () => switchTeamTab("stats"));

    setStatus("Team profile loaded.", "ok");
  } catch (error) {
    console.error("Team page error:", error);
    setStatus(`Error loading team: ${error.message}`, "error");
    $("teamPageResult").innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

function switchTeamTab(tabName) {
  const scheduleView = $("teamScheduleView");
  const statsView = $("teamStatsView");
  const scheduleTab = $("teamScheduleTab");
  const statsTab = $("teamStatsTab");

  if (tabName === "schedule") {
    scheduleView.classList.add("is-active");
    statsView.classList.remove("is-active");
    scheduleTab.classList.add("is-active");
    statsTab.classList.remove("is-active");
  } else {
    statsView.classList.add("is-active");
    scheduleView.classList.remove("is-active");
    statsTab.classList.add("is-active");
    scheduleTab.classList.remove("is-active");
  }
}

function renderTeamScheduleView(season, team, intel, record, games) {
  const recordSummary = [
    `<div class="record-tile"><span>Overall</span><strong>${record.overall_record || "-"}</strong></div>`,
    `<div class="record-tile"><span>Regular</span><strong>${record.regular_record || "-"}</strong></div>`,
    `<div class="record-tile"><span>Conference</span><strong>${record.conference_record || "-"}</strong></div>`,
    `<div class="record-tile"><span>Nonconference</span><strong>${record.nonconference_record || "-"}</strong></div>`,
    `<div class="record-tile"><span>Pre-Playoff</span><strong>${record.pre_playoff_record || "-"}</strong></div>`,
    `<div class="record-tile"><span>Postseason</span><strong>${record.postseason_record || "-"}</strong></div>`,
    ...(intel.yards_per_game !== null && intel.yards_per_game !== undefined
      ? [
          `<div class="record-tile"><span>Yards/Game</span><strong>${formatNumber(intel.yards_per_game)}</strong></div>`,
          `<div class="record-tile"><span>Yards Allowed/Game</span><strong>${formatNumber(intel.yards_allowed_per_game)}</strong></div>`,
          `<div class="record-tile"><span>Yard +/-</span><strong>${signed(intel.yards_differential_per_game)}</strong></div>`,
        ]
      : []),
  ].join("");

  const sections = [
    ["regular_season", "Regular Season"],
    ["conference_championship", "Conference Championship"],
    ["postseason", "Postseason"],
  ];

  const scheduleSections = sections.map(([key, title]) => {
    const items = Array.isArray(games) ? games.filter((row) => row.schedule_section === key) : [];
    if (!items.length) return "";
    const gamesList = items.map((row) => {
      const weekField = row.display_week ?? row.week ?? row.week_number ?? row.week_num ?? "-";
      const resultClass = row.result_w_l === "W" ? "result-win" : row.result_w_l === "L" ? "result-loss" : "";
      const score = `${String(row.team_score || "-")}-${String(row.opponent_score || "-")}`;
      const opponent = String(row.opponent || row.opponent_name || "-");
      const homeAway = row.is_home ? "vs" : "at";
      const dateStr = row.date ? String(row.date) : "";
      const neutralStr = row.is_neutral ? " | Neutral Site" : "";
      const yardsStr = row.team_total_yards != null && row.opponent_total_yards != null 
        ? ` | Yards ${String(row.team_total_yards)}-${String(row.opponent_total_yards)}`
        : "";
      const resultStr = row.result_w_l ? String(row.result_w_l) : "-";
      
      return `
        <article class="schedule-game">
          <div class="schedule-week">${escapeHtml(String(weekField))}</div>
          <div class="schedule-opponent">
            <strong>${homeAway} ${escapeHtml(opponent)}</strong>
            <span>${escapeHtml(dateStr)}${escapeHtml(neutralStr)}${escapeHtml(yardsStr)}</span>
          </div>
          <div class="schedule-score ${resultClass}">${escapeHtml(resultStr)} ${escapeHtml(score)}</div>
        </article>
      `;
    }).join("");
    return `<section class="schedule-group"><h3>${title}</h3>${gamesList}</section>`;
  }).join("") || '<div class="empty-state compact">No games available for this view.</div>';

  return `
    <div class="insight-panel">
      <p class="eyebrow">${escapeHtml(season)} Team Profile</p>
      <h2>${escapeHtml(team)}</h2>
      <div class="record-summary">
        ${recordSummary}
      </div>
    </div>
    <div class="context-callout">
      <h3>Schedule</h3>
      <div class="schedule-sections">
        ${scheduleSections}
      </div>
    </div>
  `;
}

function renderTeamStatsView(intel, stats) {
  // Map of field names to labels and formatting instructions
  const fieldMetadata = {
    // Team Overview & Scoring
    points_per_game: { label: "Points / Game", category: "Team Overview & Scoring" },
    opp_points_per_game: { label: "Opp Points / Game", category: "Team Overview & Scoring" },
    total_points: { label: "Total Points", category: "Team Overview & Scoring" },
    total_touchdowns: { label: "Total Touchdowns", category: "Team Overview & Scoring" },
    passing_touchdowns: { label: "Passing Touchdowns", category: "Team Overview & Scoring" },
    rushing_touchdowns: { label: "Rushing Touchdowns", category: "Team Overview & Scoring" },
    first_downs_per_game: { label: "First Downs / Game", category: "Team Overview & Scoring" },
    rushing_first_downs: { label: "Rushing First Downs", category: "Team Overview & Scoring" },
    passing_first_downs: { label: "Passing First Downs", category: "Team Overview & Scoring" },
    penalty_first_downs: { label: "Penalty First Downs", category: "Team Overview & Scoring" },
    
    // Passing Statistics
    passing_yards_per_game: { label: "Passing Yards / Game", category: "Passing Statistics" },
    completions: { label: "Completions", category: "Passing Statistics" },
    passing_attempts: { label: "Passing Attempts", category: "Passing Statistics" },
    completion_percentage: { label: "Completion %", category: "Passing Statistics", format: "percent" },
    yards_per_attempt: { label: "Yards / Attempt", category: "Passing Statistics" },
    interceptions_thrown: { label: "Interceptions", category: "Passing Statistics" },
    
    // Rushing Statistics
    rushing_yards_per_game: { label: "Rushing Yards / Game", category: "Rushing Statistics" },
    rushing_attempts: { label: "Rushing Attempts", category: "Rushing Statistics" },
    yards_per_rush: { label: "Yards / Rush", category: "Rushing Statistics" },
    
    // Defensive & Line Metrics
    yards_allowed_per_game: { label: "Yards Allowed / Game", category: "Defensive & Line Metrics" },
    passing_yards_allowed: { label: "Passing Yards Allowed", category: "Defensive & Line Metrics" },
    rushing_yards_allowed: { label: "Rushing Yards Allowed", category: "Defensive & Line Metrics" },
    sacks: { label: "Sacks", category: "Defensive & Line Metrics" },
    interceptions: { label: "Interceptions", category: "Defensive & Line Metrics" },
    fumbles_recovered: { label: "Fumbles Recovered", category: "Defensive & Line Metrics" },
    pass_deflections: { label: "Pass Deflections", category: "Defensive & Line Metrics" },
    tackles_for_loss: { label: "Tackles For Loss", category: "Defensive & Line Metrics" },
    
    // Situational & Special Teams
    third_down_rate: { label: "3rd Down Conversion %", category: "Situational & Special Teams", format: "percent" },
    fourth_down_rate: { label: "4th Down Conversion %", category: "Situational & Special Teams", format: "percent" },
    red_zone_score_rate: { label: "Red Zone Score %", category: "Situational & Special Teams", format: "percent" },
    red_zone_td_rate: { label: "Red Zone TD %", category: "Situational & Special Teams", format: "percent" },
    turnover_margin: { label: "Turnover Margin", category: "Situational & Special Teams", format: "signed" },
    field_goal_percentage: { label: "Field Goal %", category: "Situational & Special Teams", format: "percent" },
    field_goals_made: { label: "Field Goals Made", category: "Situational & Special Teams" },
    field_goals_attempted: { label: "Field Goals Attempted", category: "Situational & Special Teams" },
    punting_average: { label: "Punting Average", category: "Situational & Special Teams" },
    kick_return_yards: { label: "Kick Return Yards", category: "Situational & Special Teams" },
    punt_return_yards: { label: "Punt Return Yards", category: "Situational & Special Teams" },
    penalties: { label: "Total Penalties", category: "Situational & Special Teams" },
    penalty_yards: { label: "Penalty Yards", category: "Situational & Special Teams" },
  };

  const allData = { ...intel, ...stats };
  const categoryMap = new Map();

  // Group fields by category, only including fields that have data
  Object.entries(allData).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;

    let meta = fieldMetadata[key];
    if (!meta) {
      // Auto-categorize unknown fields
      let category = "Other Statistics";
      let label = String(key)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (chr) => chr.toUpperCase());
      meta = { label, category };
    }

    if (!categoryMap.has(meta.category)) {
      categoryMap.set(meta.category, []);
    }

    let displayValue = "-";
    if (meta.format === "percent") {
      displayValue = `${formatNumber(Number(value) * 100, 1)}%`;
    } else if (meta.format === "signed") {
      displayValue = signed(value);
    } else if (Number.isFinite(Number(value))) {
      displayValue = Number.isInteger(Number(value)) ? String(value) : formatNumber(value, 1);
    } else {
      displayValue = escapeHtml(String(value));
    }

    categoryMap.get(meta.category).push(
      `<div><span>${escapeHtml(meta.label)}</span><strong>${displayValue}</strong></div>`
    );
  });

  if (categoryMap.size === 0) {
    return '<div class="empty-state">No statistics available for this team.</div>';
  }

  // Order categories as shown
  const categoryOrder = [
    "Team Overview & Scoring",
    "Passing Statistics",
    "Rushing Statistics",
    "Defensive & Line Metrics",
    "Situational & Special Teams",
    "Other Statistics",
  ];

  const sections = categoryOrder
    .filter((cat) => categoryMap.has(cat))
    .map(
      (cat) => `
        <div class="insight-panel">
          <h3>${cat}</h3>
          <div class="summary-grid">
            ${categoryMap.get(cat).join("")}
          </div>
        </div>
      `
    )
    .join("");

  return sections;
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
    if (page === "team") await loadTeamPage();
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
  }
}

boot();

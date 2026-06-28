const CONFIG = window.CFP_ADV_CONFIG || {};
const API_BASE = (CONFIG.API_BASE_URL || "https://cfp-advantage-model-1.onrender.com").replace(/\/$/, "");
const IS_LOCAL_HOST = ["127.0.0.1", "localhost"].includes(window.location.hostname);
const SHOW_DEV_TOOLS = IS_LOCAL_HOST || CONFIG.ENABLE_DEV_TOOLS === true;
const CACHE_PREFIX = `cfp_adv_api_cache:${CONFIG.APP_VERSION || "dev"}:`;
const CACHE_TTL_MS = IS_LOCAL_HOST ? 0 : 1000 * 60 * 20;
const apiMemoryCache = new Map();
const FORCE_REFRESH_KEY = "cfp_adv_force_refresh_until";
const TERMS_ACCEPTED_KEY = "cfp_adv_terms_accepted";
const TERMS_VERSION_KEY = "cfp_adv_terms_version";
const TERMS_ACCEPTED_AT_KEY = "cfp_adv_terms_accepted_at";
const DEFAULT_TERMS_VERSION = "2026-06-01-access-terms-v5";
const TERMS_GATE_MESSAGE = "CFP Advantage provides football intelligence and model-derived context for informational and educational purposes only. CFP Advantage does not guarantee outcomes and is not betting, financial, or professional advice. Free site access is intended for users 13 and older. Purchases, donations, premium content, subscriptions, or other payment transactions are restricted to users 18 or older, or the age of majority in their jurisdiction, whichever is higher. This site uses browser localStorage to remember your terms acknowledgement and display preferences on this device. By selecting Accept And Enter, you agree to the Terms of Use, Privacy Policy, Refund Policy, and Disclaimer.";

function setupSiteChrome() {
  const page = document.body.dataset.page || "";
  const primaryLinks = [
    ["home", "index.html", "Home"],
    ["team", "team.html", "Teams"],
    ["matchups", "matchups.html", "Matchups"],
    ["bracket", "bracket-room.html", "Bracket Room"],
  ];
  const nav = document.querySelector(".page-nav");
  if (nav) {
    nav.classList.add("primary-nav");
    nav.innerHTML = primaryLinks.map(([key, href, label]) => (
      `<a${page === key ? ' class="is-active"' : ""} href="${href}">${label}</a>`
    )).join("");
  }

  const shell = document.querySelector(".app-shell");
  if (!shell) return;
  let footer = shell.querySelector(".site-footer");
  if (!footer) {
    footer = document.createElement("footer");
    footer.className = "site-footer";
    shell.appendChild(footer);
  }
  footer.innerHTML = `
    <div class="footer-brand">
      <strong>CFP Advantage</strong>
      <p>Advantage Through Contextual Football Profiles.</p>
      <small>Independent football intelligence platform. Not affiliated with the CFP, NCAA, conferences, or universities.</small>
    </div>
    <nav class="footer-links" aria-label="Reference and legal pages">
      <a href="about.html">About</a>
      <a href="metrics.html">Metrics Guide</a>
      <a href="news.html">News</a>
      <a href="legal.html#terms">Terms</a>
      <a href="legal.html#privacy">Privacy</a>
      <a href="legal.html#disclaimer">Disclaimer</a>
      <a href="legal.html#refunds">Refund Policy</a>
    </nav>
    <p class="footer-copyright">Copyright 2026 CFP Advantage. All rights reserved.</p>
  `;
  installDeveloperRefreshControl();
}

function installDeveloperRefreshControl() {
  if (!SHOW_DEV_TOOLS || document.querySelector("[data-dev-refresh-data]")) return;
  const control = document.createElement("button");
  control.className = "dev-refresh-control";
  control.type = "button";
  control.dataset.devRefreshData = "true";
  control.title = "Clear the local API cache and request fresh data";
  control.textContent = "Refresh API Cache";
  control.addEventListener("click", refreshPageData);
  document.body.appendChild(control);
}

const METRIC_DISPLAY = {
  "ADV SRS": ["ADV Strength Rating (ADV SRS)", "CFP Advantage's primary team-strength rating. It measures how strong a team has been throughout the season after adjusting for opponent quality."],
  "OFF ADV SRS": ["Offensive ADV Strength Rating (OFF ADV SRS)", "Measures offensive strength through drive control, scoring opportunity creation, and sustained execution."],
  "DEF ADV SRS": ["Defensive ADV Strength Rating (DEF ADV SRS)", "Measures defensive strength by limiting opponent control, drive success, and scoring opportunities."],
  "SP ADV SRS": ["Special Teams ADV", "Special-teams context that captures field-position swings and discrete special-teams events."],
  "SP ADV": ["Special Teams ADV", "Special-teams context that captures field-position swings and discrete special-teams events."],

  "ADV Expected Margin": ["ADV Expected Margin", "The model's projected scoring margin between two teams based on their ADV profiles."],
  "ADV Deserved Margin": ["ADV Deserved Margin", "A postgame measure of how the game was controlled on the field."],
  "Scoreboard vs ADV Gap": ["Scoreboard vs ADV Gap", "Compares the final score to the ADV Deserved Margin."],

  "ADV SOS": ["Schedule Strength", "Measures schedule difficulty using CFP Advantage team-strength ratings. Higher values indicate stronger competition."],
  "Control Rate": ["Control Rate (CR)", "Measures how consistently a team creates meaningful football control from game to game."],
  "CR": ["Control Rate (CR)", "Measures how consistently a team creates meaningful football control from game to game."],
  "DCE": ["Scoreboard Control Gap", "Compares a team's actual average scoring margin with the margin suggested by its underlying ADV control profile. Positive values mean the scoreboard has run ahead of control; negative values mean control has been stronger than the scoreboard results."],
  "Drive Conversion Efficiency (DCE)": ["Scoreboard Control Gap", "Compares a team's actual average scoring margin with the margin suggested by its underlying ADV control profile. Positive values mean the scoreboard has run ahead of control; negative values mean control has been stronger than the scoreboard results."],
  "ADV Drive Conversion": ["Control Finish Rate", "Measures how often meaningful control drives are converted into points."],
  "Control Finish Rate": ["Control Finish Rate", "Measures how often meaningful control drives are converted into points."],
  "Velocity / Trend Pressure": ["Recent Form", "Shows whether a team's recent efficiency is improving, declining, or staying stable compared with its earlier-season form."],
  "Trend Pressure": ["Recent Form", "Shows whether a team's recent efficiency is improving, declining, or staying stable compared with its earlier-season form."],
  "Talent Yield Index": ["Talent Yield Index (TYI)", "Compares a team's on-field performance to its roster expectations."],
  "Talent Yield / TYI": ["Talent Yield Index (TYI)", "Compares a team's on-field performance to its roster expectations."],
  "Rolling Talent Yield (TYI)": ["Rolling Talent Yield (TYI)", "Compares current on-field performance to roster expectation as the season develops."],
  "Weak-Side Profile": ["Weak-Side Profile", "Shows whether a team has enough strength on its weaker side of the ball to avoid being one-dimensional."],

  "Bracket Path Probability": ["Title Probability", "The probability of reaching or winning through the playoff path based on CFP Advantage simulations."],
  "Projected Path": ["Projected Path", "Shows whether a team's playoff route appears easier, balanced, or tougher compared with other contenders."],
  "Close Matchup Risk": ["Projection Closeness", "Shows how narrow the expected-margin projection is. It is a closeness index, not an upset probability."],
};

const COMPARISON_DISPLAY = {
  "Total Yards": "Total offensive yardage gained.",
  "Yards Per Play": "Average yards gained per offensive play.",
  "Passing Yards": "Yards gained through the passing game.",
  "Rushing Yards": "Yards gained through the running game.",
  "Explosive Plays": "High-impact plays that create large chunks of field position or scoring opportunity.",
  "Points Per Drive": "Average points produced per offensive drive.",
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

function forceRefreshActive() {
  try {
    return Number(window.sessionStorage.getItem(FORCE_REFRESH_KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}

function clearApiCache() {
  apiMemoryCache.clear();
  try {
    Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith("cfp_adv_api_cache:"))
      .forEach((key) => window.sessionStorage.removeItem(key));
  } catch (error) {
    console.warn("CFP Advantage cache clear unavailable:", error.message);
  }
}

function refreshPageData() {
  clearApiCache();
  try {
    window.sessionStorage.setItem(FORCE_REFRESH_KEY, String(Date.now() + 30000));
  } catch (error) {
    console.warn("CFP Advantage refresh flag unavailable:", error.message);
  }
  window.location.reload();
}

async function api(path) {
  const forceRefresh = forceRefreshActive();
  const key = `${CACHE_PREFIX}${path}`;
  if (!forceRefresh) {
    const memory = apiMemoryCache.get(key);
    if (memory && Date.now() - memory.stored_at < CACHE_TTL_MS) {
      return memory.data;
    }
    try {
      const cached = JSON.parse(window.sessionStorage.getItem(key) || "null");
      if (cached && Date.now() - cached.stored_at < CACHE_TTL_MS) {
        apiMemoryCache.set(key, cached);
        return cached.data;
      }
    } catch (error) {
      console.warn("CFP Advantage cache read unavailable:", error.message);
    }
  }
  const separator = path.includes("?") ? "&" : "?";
  const requestPath = forceRefresh ? `${path}${separator}_refresh=${Date.now()}` : path;
  const response = await fetch(`${API_BASE}${requestPath}`, { cache: forceRefresh ? "reload" : "default" });
  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}`);
  }
  const data = await response.json();
  apiMemoryCache.set(key, { stored_at: Date.now(), data });
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ stored_at: Date.now(), data }));
  } catch (error) {
    console.warn("CFP Advantage cache write unavailable:", error.message);
  }
  return data;
}

function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "-";
}


function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  const pct = Math.abs(number) <= 1 ? number * 100 : number;
  return `${pct.toFixed(digits)}%`;
}

function formatOptionalNumber(value, digits = 1) {
  return value === null || value === undefined || value === "" ? "" : formatNumber(value, digits);
}

function talentYieldDisplay(talentYield = {}) {
  const label = String(talentYield.label || "-");
  const unavailable = label.toLowerCase() === "not available";
  return {
    label,
    value: unavailable ? "" : formatOptionalNumber(talentYield.value, 2),
  };
}

function completeControlContext(context = {}) {
  const view = { ...context };
  const finite = (value) => value === null || value === undefined || value === "" ? null : Number(value);
  const creation = finite(view.rolling_control_creation_rate);
  const finish = finite(view.rolling_control_finish_rate);
  const denial = finite(view.rolling_control_denial_rate);
  const pointsPerControl = finite(view.rolling_points_per_control_drive);
  const opponentPointsPerControl = finite(view.rolling_opp_points_per_control_allowed);
  if (!Number.isFinite(finite(view.rolling_control_production_rate))
      && Number.isFinite(creation) && Number.isFinite(pointsPerControl)) {
    view.rolling_control_production_rate = creation * pointsPerControl;
  }
  if (!Number.isFinite(finite(view.rolling_defensive_control_production_allowed))
      && Number.isFinite(denial) && Number.isFinite(opponentPointsPerControl)) {
    view.rolling_defensive_control_production_allowed = (1 - denial) * opponentPointsPerControl;
  }
  if (!Number.isFinite(finite(view.rolling_creation_waste_rate)) && Number.isFinite(creation)) {
    view.rolling_creation_waste_rate = 1 - creation;
  }
  if (!Number.isFinite(finite(view.rolling_finish_waste_rate)) && Number.isFinite(finish)) {
    view.rolling_finish_waste_rate = 1 - finish;
  }
  return view;
}

function metricHelpButton() {
  return `<button class="metric-help-toggle" type="button" aria-expanded="false">What do these mean?</button>`;
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
  scoring_conversion_rate: "Control Finish Rate",
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
      <h2>Age & Terms Acknowledgement</h2>
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

function renderComparisonStats(target, rows) {
  const hiddenStats = new Set(["ADV Drive Conversion", "Control Finish Rate"]);
  const visibleRows = rows.filter((stat) => !hiddenStats.has(stat.name));

  const el = $(target);
  if (!el) return;

  el.innerHTML = visibleRows.map((stat) => `
    <article class="guide-card compact">
      <span>${escapeHtml(stat.group || "Stat")}</span>
      <h4>${escapeHtml(publicMetricName(stat.name))}</h4>
      <p>${escapeHtml(publicMetricDescription(stat))}</p>
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
  renderComparisonStats("comparisonStatsGrid", stats.stats || []);
  setStatus("Metric catalog loaded.", "ok");
}

async function loadHistoricalPage() {
  setStatus("Loading seasons...");
  const seasonsPayload = await api("/api/seasons");
  const seasons = (seasonsPayload.seasons || []).filter((season) => Number(season) >= 2016 && Number(season) <= 2025);
  const seasonSelect = $("seasonSelect");
  seasonSelect.innerHTML = seasons.map((season) => `<option value="${season}">${season}</option>`).join("");
  seasonSelect.value = String(seasons[0] || "");
  await populateHistoricalTeams();
  seasonSelect.addEventListener("change", populateHistoricalTeams);
  $("teamASelect").addEventListener("change", populateHistoricalGames);
  $("buildHistoricalButton").addEventListener("click", buildHistoricalMatchup);
  setStatus("Historical matchup builder ready.", "ok");
}

async function populateHistoricalTeams() {
  const season = $("seasonSelect").value;
  if (!season) return;
  const payload = await api(`/api/product-a/team-board?season=${encodeURIComponent(season)}`);
  const teams = (payload.teams || payload.rows || [])
    .filter((row) => row.team)
    .sort((left, right) => String(left.team).localeCompare(String(right.team)));
  window.__historicalTeams = teams;
  const options = teams.map((team) => `<option value="${team.team}">${team.team}</option>`).join("");
  $("teamASelect").innerHTML = options;
  await populateHistoricalGames();
}

function presentScore(value) {
  if (value === 0 || value === "0") return "0";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function historicalGameLabel(row) {
  const week = row.display_week || row.week || "Game";
  const opponent = row.opponent || "-";
  const homeAway = row.is_neutral ? "vs" : row.is_home ? "vs" : "at";
  const result = row.result_w_l ? `${row.result_w_l} ` : "";
  const score = `${presentScore(row.team_score)}-${presentScore(row.opponent_score)}`;
  const date = row.date ? ` | ${row.date}` : "";
  return `${week} | ${homeAway} ${opponent} | ${result}${score}${date}`;
}

async function populateHistoricalGames() {
  const season = $("seasonSelect").value;
  const team = $("teamASelect").value;
  const gameSelect = $("historicalGameSelect");
  if (!season || !team || !gameSelect) return;
  setStatus(`Loading ${team} ${season} schedule...`);
  const payload = await api(`/api/team/${encodeURIComponent(season)}/${encodeURIComponent(team)}/schedule?view=full`);
  const games = (payload.schedule || [])
    .filter((row) => row.opponent)
    .sort((left, right) => Number(left.game_order || 999) - Number(right.game_order || 999));
  window.__historicalGames = games;
  gameSelect.innerHTML = games.length
    ? games.map((row, index) => `<option value="${index}">${escapeHtml(historicalGameLabel(row))}</option>`).join("")
    : '<option value="">No games available</option>';
  setStatus(games.length ? "Choose an actual game from this team's schedule." : "No games available for this team.", games.length ? "ok" : "warn");
}

async function buildHistoricalMatchup() {
  const season = $("seasonSelect").value;
  const teamA = $("teamASelect").value;
  const selectedGame = (window.__historicalGames || [])[Number($("historicalGameSelect").value)];
  const teamB = selectedGame?.opponent;
  if (!season || !teamA || !teamB || teamA === teamB) {
    setStatus("Choose a season, team, and actual game.", "warn");
    return;
  }
  setStatus("Building pregame snapshot...");
  try {
    const payload = await api(`/api/product-a/historical-matchup?season=${encodeURIComponent(season)}&team=${encodeURIComponent(teamA)}&game_id=${encodeURIComponent(selectedGame.game_id)}`);
    renderHistoricalSnapshot(payload, selectedGame);
    setStatus("Historical pregame snapshot loaded.", "ok");
  } catch (error) {
    const recapButton = selectedGame?.game_id && truthyValue(selectedGame?.has_adv_recap)
      ? `<button class="secondary-button compact-action" type="button" data-recap-game="${escapeHtml(String(selectedGame.game_id))}">View Recap</button>`
      : "";
    $("historicalResult").innerHTML = `
      <div class="insight-panel">
        <p class="eyebrow">${escapeHtml(season)} Historical Game</p>
        <h2>${escapeHtml(teamA)} vs ${escapeHtml(teamB)}</h2>
        <p class="interpretation">A rolling pregame snapshot is not available for this selected game yet.</p>
        ${recapButton}
      </div>
    `;
    setStatus(error.message, "warn");
  }
}

function historicalContextCard(title, context) {
  if (!context) {
    return `
      <div class="context-callout">
        <h3>${escapeHtml(title)}</h3>
        <p>Qualified rolling pregame context is not available for this side of the matchup.</p>
      </div>
    `;
  }
  context = completeControlContext(context);
  const hasPriorGames = Number(context.games_before_target) > 0;
  if (!hasPriorGames) {
    return `
      <div class="context-callout">
        <h3>${escapeHtml(title)}</h3>
        <p class="interpretation">This was the team's first game. The pregame rating uses the frozen Week 0 anchor built from reliable prior-season ADV strength and talent-implied ADV. Current-season Control Framework, TYI, and Recent Form metrics are intentionally unavailable before a team has played.</p>
        <div class="summary-grid">
          <div><span>Week 0 ADV Rating</span><strong>${formatNumber(context.pregame_adv_rating, 2)}</strong><small>Frozen preseason anchor</small></div>
          <div><span>Anchor Inputs</span><strong>Prior ADV + Roster Talent</strong></div>
          <div><span>Current-Season Context</span><strong>Not Yet Available</strong></div>
          <div><span>Current-Season Games Before Target</span><strong>0</strong></div>
        </div>
      </div>
    `;
  }
  return `
    <div class="context-callout">
      <h3>${escapeHtml(title)}</h3>
      <div class="summary-grid">
        <div><span>Pregame ADV Rating</span><strong>${formatNumber(context.pregame_adv_rating, 2)}</strong><small>${escapeHtml(pregameRatingSourceLabel(context))}</small></div>
        <div><span>Weekly ADV SRS</span><strong>${formatNumber(context.rolling_adv_srs, 2)}</strong></div>
        <div><span>Control Rate (CR)</span><strong>${formatPercent(context.rolling_cr, 2)}</strong></div>
        <div><span>Control Creation</span><strong>${formatPercent(context.rolling_control_creation_rate, 2)}</strong></div>
        <div><span>Control Denial</span><strong>${formatPercent(context.rolling_control_denial_rate, 2)}</strong></div>
        <div><span>Control Finish Rate</span><strong>${formatPercent(context.rolling_control_finish_rate, 2)}</strong></div>
        <div><span>Control Drive Shutout Rate</span><strong>${formatPercent(context.rolling_finishing_resistance, 2)}</strong><small>Share of opponent control drives held scoreless</small></div>
        <div><span>Control Production Per Offensive Drive</span><strong>${formatNumber(context.rolling_control_production_rate, 2)}</strong><small>${formatNumber(context.rolling_offensive_drives, 0)} offensive drives</small></div>
        <div><span>Defensive Control Production Allowed Per Defensive Drive</span><strong>${formatNumber(context.rolling_defensive_control_production_allowed, 2)}</strong><small>${formatNumber(context.rolling_defensive_drives, 0)} defensive drives · Lower is better</small></div>
        <div><span>Creation Waste</span><strong>${formatPercent(context.rolling_creation_waste_rate, 2)}</strong></div>
        <div><span>Finish Waste</span><strong>${formatPercent(context.rolling_finish_waste_rate, 2)}</strong></div>
        <div><span>Scoreboard Control Gap</span><strong>${formatNumber(context.rolling_dce, 2)}</strong></div>
        <div><span>ADV Schedule Rating</span><strong>${formatNumber(context.rolling_adv_sos, 2)}</strong></div>
        <div><span>Recent Form</span><strong>${escapeHtml(trajectoryPublicLabel(context.isolated_block_velocity_label || context.trajectory_bucket))}</strong></div>
        <div><span>Talent Yield Index (TYI)</span><strong>${formatNumber(context.talent_yield_index, 2)}</strong></div>
        <div><span>Games Before Target</span><strong>${escapeHtml(context.games_before_target ?? "-")}</strong></div>
      </div>
    </div>
  `;
}

function renderHistoricalSnapshot(payload, selectedGame) {
  const season = payload.season || $("seasonSelect").value;
  const teamA = payload.selected_team || $("teamASelect").value;
  const teamB = payload.opponent || selectedGame?.opponent || "-";
  const teamContext = payload.team_context;
  const opponentContext = payload.opponent_context;
  const marginTeamA = Number(payload.projected_margin_team);
  const marginText = Number.isFinite(marginTeamA)
    ? `${marginTeamA >= 0 ? teamA : teamB} by ${Math.abs(marginTeamA).toFixed(1)}`
    : "-";
  const homeFieldContext = Number(teamContext?.home_field_adjustment_team);
  const marginContextNote = Number.isFinite(homeFieldContext) && Math.abs(homeFieldContext) > 0
    ? ` The expected margin includes ${Math.abs(homeFieldContext).toFixed(1)} points of home-field context.`
    : "";
  const recapButton = selectedGame?.game_id && truthyValue(selectedGame?.has_adv_recap)
    ? `<button class="secondary-button compact-action" type="button" data-recap-game="${escapeHtml(String(selectedGame.game_id))}">View Recap</button>`
    : "";
  $("historicalResult").innerHTML = `
    <div class="insight-panel">
      <p class="eyebrow">Pregame Model Snapshot</p>
      <h2>${escapeHtml(teamA)} vs ${escapeHtml(teamB)}</h2>
      <div class="summary-grid">
        <div><span>Actual Game</span><strong>${escapeHtml(historicalGameLabel(selectedGame))}</strong></div>
        <div><span>Model Lean</span><strong>${escapeHtml(payload.projected_winner || "-")}</strong></div>
        <div><span>Projected Margin</span><strong>${escapeHtml(marginText)}</strong></div>
        <div><span>Confidence Bucket</span><strong>${escapeHtml(payload.confidence_bucket || "-")}</strong></div>
        <div><span>Context Coverage</span><strong>${payload.qualified_context_available ? "Both Teams" : payload.partial_context_available ? "Partial" : "Limited"}</strong></div>
      </div>
      <p class="interpretation">${escapeHtml(payload.context_note || "This snapshot uses rolling pregame context where available.")}${escapeHtml(marginContextNote)}</p>
      ${historicalContextCard(`${teamA} Pregame Context`, teamContext)}
      ${historicalContextCard(`${teamB} Pregame Context`, opponentContext)}
      <div class="context-callout">
        <h3>Game Recap</h3>
        <p>Open the recap to compare the pregame snapshot with what happened on the field.</p>
        ${recapButton || "<p>No ADV recap is available for this game.</p>"}
      </div>
    </div>
  `;
}
async function loadBracketPage() {
  setStatus("Loading Bracket Room...");
  let seasonsPayload;
  try {
    seasonsPayload = await api("/api/product-a/bracket-room/seasons");
  } catch (error) {
    seasonsPayload = await api("/api/seasons");
  }
  const seasons = (seasonsPayload.seasons || []).slice().sort((a, b) => Number(b) - Number(a));
  const select = $("bracketSeasonSelect");
  if (select) {
    select.innerHTML = seasons.map((season) => `<option value="${escapeHtml(season)}">${escapeHtml(season)}</option>`).join("");
    if (!select.dataset.bound) {
      select.addEventListener("change", () => renderBracketSeason(select.value));
      select.dataset.bound = "true";
    }
  }
  const season = select?.value || seasons[0];
  if (!season) {
    setStatus("No seasons returned by API.", "warn");
    return;
  }
  await renderBracketSeason(season);
}

function pathContextLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  if (number >= 0.10) return "Clear Path Edge";
  if (number >= 0.03) return "Slight Path Edge";
  if (number > -0.03) return "Balanced Path";
  if (number > -0.07) return "Tough Path";
  return "Very Tough Path";
}

async function renderBracketSeason(season) {
  setStatus(`Loading ${season} Bracket Room...`);
  const payload = await api(`/api/product-a/bracket-room?season=${encodeURIComponent(season)}`);
  let treePayload = { tree: [] };
  try {
    treePayload = await api(`/api/product-a/bracket-room/tree?season=${encodeURIComponent(season)}`);
  } catch (error) {
    console.warn("Bracket tree unavailable:", error.message);
  }
  const summary = payload.summary || {};
  const titleRows = (payload.title_probabilities || []).slice(0, 12);
  const leverageRows = (payload.team_leverage || []).slice(0, 12);
  const treeRows = treePayload.tree || [];
  const frameworkRows = treeRows.filter((row) => row.diagnostic?.framework_read?.label && row.diagnostic.framework_read.label !== "Framework Unavailable").length;
  const rows = leverageRows.length ? leverageRows : titleRows;
  $("bracketSummary").innerHTML = `
    <div class="summary-grid">
      <div><span>Season</span><strong>${escapeHtml(season)}</strong></div>
      <div><span>Title Favorite</span><strong>${escapeHtml(summary.title_favorite || titleRows[0]?.team || "-")}</strong></div>
      <div><span>Favorite Probability</span><strong>${formatNumber((summary.title_favorite_probability ?? titleRows[0]?.title_probability) * 100, 1)}%</strong></div>
      <div><span>Actual Champion</span><strong>${escapeHtml(summary.actual_champion || "-")}</strong></div>
      <div><span>Champion Probability Rank</span><strong>${escapeHtml(summary.actual_champion_probability_rank || "-")}</strong></div>
      <div><span>Bracket Diagnostics</span><strong>${escapeHtml(`${frameworkRows}/${treeRows.length}`)}</strong><small>Official-path matchups with framework reads</small></div>
    </div>
  `;
  renderRows("bracketTable", rows, [
    { label: "Title Rank", render: (row) => row.title_probability_rank ?? row.adv_srs_rank ?? "-" },
    { label: "Team", key: "team" },
    { label: "Seed", key: "seed" },
    { label: "ADV SRS", render: (row) => formatNumber(row.adv_srs, 2) },
    { label: "Title Probability", render: (row) => `${formatNumber(Number(row.title_probability) * 100, 1)}%` },
    { label: "Projected Path", render: (row) => pathContextLabel(row.path_leverage_index) },
    { label: "Control Profile", render: (row) => bracketControlProfileLabel(row.control_profile) },
  ]);
  renderBracketTree(treeRows);
  setStatus(`${season} Bracket Room loaded.`, "ok");
}

function renderBracketTree(rows) {
  const target = $("bracketTree");
  if (!target) return;
  if (!rows.length) {
    target.innerHTML = '<div class="empty-state compact">No bracket tree available for this season.</div>';
    return;
  }
  const roundLabels = {
    cfp_first_round: "First Round",
    cfp_quarterfinal: "Quarterfinals",
    cfp_semifinal: "Semifinals",
    cfp_semifinal_four_team: "Semifinals",
    national_championship: "Championship",
    national_championship_four_team: "Championship",
  };
  const byRound = rows.reduce((acc, row) => {
    const key = row.round_name || "round";
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {});
  target.innerHTML = Object.entries(byRound).map(([round, games]) => `
    <section class="bracket-round">
      <h3>${escapeHtml(roundLabels[round] || round)}</h3>
      ${games.map((game) => bracketGameCard(game)).join("")}
    </section>
  `).join("");
  target.querySelectorAll("[data-bracket-game]").forEach((button) => {
    button.addEventListener("click", () => {
      const game = rows.find((row) => row.game_key === button.dataset.bracketGame);
      if (game) openBracketDiagnostic(game);
    });
  });
}

function bracketTeamLabel(side) {
  const seed = side.seed ? `${side.seed} ` : "";
  const display = String(side.display || "");
  const team = String(side.team || "");
  const name = team && display.startsWith("Winner of ") ? team : display || team || "-";
  return `${seed}${name}`;
}

function bracketGameCard(game) {
  const prob = game.probability || {};
  const favorite = prob.favorite || "-";
  const winPct = prob.favorite_win_probability ? `${formatNumber(Number(prob.favorite_win_probability) * 100, 1)}%` : "-";
  const frameworkRead = game.diagnostic?.framework_read?.label || "Framework Unavailable";
  return `
    <button class="bracket-game-card" type="button" data-bracket-game="${escapeHtml(game.game_key)}">
      <span>${escapeHtml(bracketTeamLabel(game.team_a || {}))}</span>
      <span>${escapeHtml(bracketTeamLabel(game.team_b || {}))}</span>
      <small>Model lean: ${escapeHtml(favorite)} (${escapeHtml(winPct)})</small>
      <em>${escapeHtml(frameworkRead)}</em>
    </button>
  `;
}

function openBracketDiagnostic(game) {
  const modal = $("bracketModal");
  const content = $("bracketModalContent");
  if (!modal || !content) return;
  const prob = game.probability || {};
  const teamA = game.diagnostic?.team_a || {};
  const teamB = game.diagnostic?.team_b || {};
  const frameworkRead = game.diagnostic?.framework_read || {};
  content.innerHTML = `
    <p class="eyebrow">Matchup Diagnostic</p>
    <h2>${escapeHtml(bracketTeamLabel(game.team_a || {}))} vs ${escapeHtml(bracketTeamLabel(game.team_b || {}))}</h2>
    <div class="summary-grid">
      <div><span>Model Lean</span><strong>${escapeHtml(prob.favorite || "-")}</strong></div>
      <div><span>Projected Margin</span><strong>${formatNumber(prob.projected_margin_team_a, 1)}</strong></div>
      <div><span>Favorite Win Probability</span><strong>${prob.favorite_win_probability ? `${formatNumber(Number(prob.favorite_win_probability) * 100, 1)}%` : "-"}</strong></div>
      <div><span>Opponent Chance</span><strong>${prob.upset_risk ? `${formatNumber(Number(prob.upset_risk) * 100, 1)}%` : "-"}</strong></div>
    </div>
    <div class="insight-panel bracket-framework-read">
      <p class="eyebrow">Full Control Framework</p>
      <h3>${escapeHtml(frameworkRead.label || "Framework Unavailable")}</h3>
      <p class="interpretation">${escapeHtml(frameworkRead.note || "The full Control Framework is not available for both teams in this matchup.")}</p>
      ${bracketFrameworkAdvantages(frameworkRead, teamA.team, teamB.team)}
      <p class="guide-note">This read explains matchup mechanics. It does not change the displayed title or game probabilities.</p>
    </div>
    <div class="diagnostic-grid">
      ${diagnosticProfile(teamA)}
      ${diagnosticProfile(teamB)}
    </div>
    <p class="interpretation">This matchup view highlights team strength, schedule path, control consistency, and finishing profile through the CFP Advantage model lens.</p>
  `;
  modal.classList.remove("is-hidden");
  content.querySelectorAll(".metric-help-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const panel = button.nextElementSibling;
    const isHidden = panel.classList.toggle("is-hidden");
    button.setAttribute("aria-expanded", String(!isHidden));
  });
});
  const close = $("bracketModalClose");
  if (close && !close.dataset.bound) {
    close.addEventListener("click", closeBracketDiagnostic);
    close.dataset.bound = "true";
  }
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeBracketDiagnostic();
  }, { once: true });
}

function diagnosticProfile(team) {
  const profile = team.control_profile || {};
  const metrics = profile.metrics || {};
  const talentYield = talentYieldDisplay(profile.talent_yield);
  return `
    <article class="insight-panel compact bracket-diagnostic-card">
      <h3>${escapeHtml(team.seed ? `${team.seed} ${team.team}` : team.team || "-")}</h3>
      <div class="bracket-profile-identity">
        <strong>${escapeHtml(profile.identity || "Framework Unavailable")}</strong>
        <small>${escapeHtml(profile.summary || profile.note || "")}</small>
      </div>
      ${bracketFrameworkGrid(profile)}
      <div class="summary-grid mini bracket-context-grid">
        <div><span>Frozen Pregame ADV</span><strong>${formatNumber(team.adv_srs, 1)}</strong><small>Opponent-adjusted strength before the CFP</small></div>
        <div><span>ADV Rank</span><strong>${escapeHtml(team.adv_srs_rank ?? "-")}</strong></div>
        <div><span>Control Rate (CR)</span><strong>${formatPercent(profile.control_rate ?? team.cr)}</strong></div>
        <div><span>ADV Schedule Rating</span><strong>${formatNumber(team.adv_schedule_rating, 1)}</strong></div>
        <div><span>Control Foundation</span><strong>${escapeHtml(profile.foundation?.label || "-")}</strong><small>${escapeHtml(percentileLabel(profile.foundation?.percentile) || "")}</small></div>
        <div><span>Conversion Profile</span><strong>${escapeHtml(profile.conversion?.label || "-")}</strong><small>${escapeHtml(percentileLabel(profile.conversion?.percentile) || "")}</small></div>
        <div><span>Control Points Per Offensive Drive</span><strong>${formatNumber(metrics.control_production?.value, 2)}</strong><small>Control scoring value across ${formatNumber(profile.offensive_drives, 0)} offensive drives</small></div>
        <div><span>Control Points Allowed Per Defensive Drive</span><strong>${formatNumber(metrics.defensive_control_production_allowed?.value, 2)}</strong><small>Allowed control scoring value across ${formatNumber(profile.defensive_drives, 0)} defensive drives · Lower is better</small></div>
        <div><span>Creation Waste</span><strong>${formatPercent(profile.creation_waste)}</strong></div>
        <div><span>Finish Waste</span><strong>${formatPercent(profile.finish_waste)}</strong></div>
        <div><span>Talent Yield</span><strong>${escapeHtml(talentYield.label)}</strong><small>${escapeHtml(talentYield.value)}</small></div>
        <div><span>Recent Form</span><strong>${escapeHtml(profile.recent_form?.label || "Not Enough Games")}</strong><small>${escapeHtml(profile.recent_form?.note || "")}</small></div>
      </div>

      <button class="metric-help-toggle" type="button" aria-expanded="false">What do these mean?</button>

      <div class="metric-help-panel is-hidden">
        <p><strong>Frozen Pregame ADV:</strong> Opponent-adjusted team strength available before the first CFP game.</p>
        <p><strong>ADV Rank:</strong> National rank by ADV SRS.</p>
        <p><strong>Control Rate:</strong> How consistently the team creates useful control opportunities.</p>
        <p><strong>ADV Schedule Rating:</strong> Raw opponent-strength context available at the frozen snapshot.</p>
        <p><strong>Control Foundation:</strong> Combined view of Control Creation and Control Denial.</p>
        <p><strong>Conversion Profile:</strong> Combined view of Control Finish and Control Drive Shutout Rate.</p>
        <p><strong>Control Points Per Offensive Drive:</strong> A control-scoring estimate spread across every offensive drive. It combines how often a team creates meaningful control with how many points those control drives produce.</p>
        <p><strong>Control Points Allowed Per Defensive Drive:</strong> The defensive mirror of Control Points Per Offensive Drive. It estimates opponent control-scoring value allowed across every defensive drive. Lower is better.</p>
        <p><strong>Creation Waste:</strong> Offensive drives that never become meaningful control.</p>
        <p><strong>Finish Waste:</strong> Meaningful control drives that do not produce points.</p>
        <p><strong>Talent Yield:</strong> Performance compared with roster expectation.</p>
        <p><strong>Recent Form:</strong> Recent direction compared with the team's own season baseline.</p>
      </div>
    </article>
  `;
}

function bracketControlProfileLabel(profile) {
  if (!profile?.available) return "Framework Unavailable";
  const foundation = profile.foundation?.label ? `${profile.foundation.label} Foundation` : "";
  return escapeHtml(profile.identity || foundation || "Contextual Football Profile");
}

function bracketFrameworkAdvantages(read, teamA, teamB) {
  const advantages = read?.advantages || {};
  const list = (team) => {
    const rows = advantages[team] || [];
    return rows.length ? rows.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li>No material framework edge</li>";
  };
  if (!teamA || !teamB || !read?.advantages) return "";
  return `
    <div class="matchup-advantages-grid">
      <article>
        <span>${escapeHtml(teamA)} Advantages</span>
        <ul>${list(teamA)}</ul>
      </article>
      <article>
        <span>${escapeHtml(teamB)} Advantages</span>
        <ul>${list(teamB)}</ul>
      </article>
    </div>
  `;
}

function bracketFrameworkGrid(profile) {
  if (!profile?.available) {
    return `<div class="empty-state compact">${escapeHtml(profile?.note || "Full Control Framework unavailable for this season.")}</div>`;
  }
  const order = [
    "control_creation",
    "control_denial",
    "control_finish",
    "control_drive_shutout",
    "control_production",
    "defensive_control_production_allowed",
  ];
  return `
    <div class="bracket-framework-grid">
      ${order.map((key) => {
        const metric = profile.metrics?.[key] || {};
        const percentile = percentileLabel(metric.percentile);
        const sample = key === "control_creation" || key === "control_finish" || key === "control_production"
          ? profile.offensive_drives
          : profile.defensive_drives;
        return `
          <div>
            <span>${escapeHtml(metric.name || key)}</span>
            <strong>${escapeHtml(metric.label || "-")}</strong>
            <small>${escapeHtml([percentile || "Sample developing", sample ? `${Math.round(sample)} drives` : ""].filter(Boolean).join(" · "))}</small>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function closeBracketDiagnostic() {
  $("bracketModal")?.classList.add("is-hidden");
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

async function loadNewsPage(targetId = "newsList", limit = 8, sliceResults = true) {
  setStatus("Loading news...");
  const payload = await api(`/api/news/latest?limit=${limit}`);
  const rows = payload.items || [];
  const container = $(targetId);
  if (!container) {
    setStatus("No news container found.", "warn");
    return;
  }
  const itemsToShow = sliceResults ? rows.slice(0, limit) : rows;
  container.innerHTML = itemsToShow.length
    ? itemsToShow
        .map((item) => `
    <article class="news-item">
      <span>${escapeHtml(item.source || "College Football")}</span>
      <h3><a href="${escapeHtml(item.link)}" rel="noopener noreferrer" target="_blank">${escapeHtml(item.title)}</a></h3>
      <p>${escapeHtml(item.published || "Recent")}</p>
    </article>
  `).join("")
   
    : `
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
  const teams = (payload.teams || payload.rows || [])
    .filter((row) => row.team)
    .sort((left, right) => String(left.team).localeCompare(String(right.team)));
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
    const statsHtml = renderTeamStatsView(intel, stats, games);
    const advProfileHtml = renderTeamAdvProfileView(intel, profile.drive_conversion || profile.drive_conversion_context || {});

    $("teamPageResult").innerHTML = `
      <div id="teamScheduleView" class="team-view-panel is-active">
        ${scheduleHtml}
      </div>
      <div id="teamStatsView" class="team-view-panel">
        ${statsHtml}
      </div>
      <div id="teamAdvProfileView" class="team-view-panel">
        ${advProfileHtml}
      </div>
    `;

    // Setup tab switching
    $("teamScheduleTab").addEventListener("click", () => switchTeamTab("schedule"));
    $("teamStatsTab").addEventListener("click", () => switchTeamTab("stats"));
    $("teamAdvProfileTab").addEventListener("click", () => switchTeamTab("adv"));

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
  const advProfileView = $("teamAdvProfileView");
  const scheduleTab = $("teamScheduleTab");
  const statsTab = $("teamStatsTab");
  const advProfileTab = $("teamAdvProfileTab");

  if (tabName === "schedule") {
    scheduleView.classList.add("is-active");
    statsView.classList.remove("is-active");
    advProfileView.classList.remove("is-active");
    scheduleTab.classList.add("is-active");
    statsTab.classList.remove("is-active");
    advProfileTab.classList.remove("is-active");
  } else if (tabName === "stats") {
    statsView.classList.add("is-active");
    scheduleView.classList.remove("is-active");
    advProfileView.classList.remove("is-active");
    statsTab.classList.add("is-active");
    scheduleTab.classList.remove("is-active");
    advProfileTab.classList.remove("is-active");
  } else {
    advProfileView.classList.add("is-active");
    scheduleView.classList.remove("is-active");
    statsView.classList.remove("is-active");
    advProfileTab.classList.add("is-active");
    scheduleTab.classList.remove("is-active");
    statsTab.classList.remove("is-active");
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
      const score = `${presentScore(row.team_score)}-${presentScore(row.opponent_score)}`;
      const opponent = String(row.opponent || row.opponent_name || "-");
      const homeAway = row.is_home ? "vs" : "at";
      const dateStr = row.date ? String(row.date) : "";
      const neutralStr = row.is_neutral ? " | Neutral Site" : "";
      const rowStats = row.comparison_stats || {};
      const comparisonOpponentYards = numberOrNull(rowStats.def_pass_yards_allowed) !== null || numberOrNull(rowStats.def_rush_yards_allowed) !== null
        ? (numberOrNull(rowStats.def_pass_yards_allowed) || 0) + (numberOrNull(rowStats.def_rush_yards_allowed) || 0)
        : null;
      const teamYards = row.team_total_yards ?? rowStats.total_yards;
      const opponentYards = row.opponent_total_yards ?? comparisonOpponentYards;
      const yardsStr = teamYards != null && opponentYards != null 
        ? ` | Yards ${String(Math.round(Number(teamYards)))}-${String(Math.round(Number(opponentYards)))}`
        : "";
      const resultStr = row.result_w_l ? String(row.result_w_l) : "-";
      const recapButton = row.game_id && truthyValue(row.has_adv_recap)
        ? `<button class="secondary-button compact-action" type="button" data-recap-game="${escapeHtml(String(row.game_id))}">View Recap</button>`
        : "";
      
      return `
        <article class="schedule-game">
          <div class="schedule-week">${escapeHtml(String(weekField))}</div>
          <div class="schedule-opponent">
            <strong>${homeAway} ${escapeHtml(opponent)}</strong>
            <span>${escapeHtml(dateStr)}${escapeHtml(neutralStr)}${escapeHtml(yardsStr)}</span>
          </div>
          <div class="schedule-score ${resultClass}">${escapeHtml(resultStr)} ${escapeHtml(score)}</div>
          <div class="schedule-actions">${recapButton}</div>
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

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-recap-game]");
  if (!button) return;
  event.preventDefault();
  await openRecapModal(button.dataset.recapGame);
});

async function openRecapModal(gameId) {
  const modal = $("recapModal");
  const content = $("recapModalContent");
  if (!modal || !content || !gameId) return;
  content.innerHTML = '<div class="empty-state compact">Loading recap...</div>';
  modal.classList.remove("is-hidden");
  try {
    const recap = await api(`/api/game/${encodeURIComponent(gameId)}/recap`);
    content.innerHTML = renderGameRecap(recap, true);
  } catch (error) {
    content.innerHTML = `<div class="empty-state compact">${escapeHtml(error.message)}</div>`;
  }
  const close = $("recapModalClose");
  if (close && !close.dataset.bound) {
    close.addEventListener("click", closeRecapModal);
    close.dataset.bound = "true";
  }
  modal.addEventListener("click", (clickEvent) => {
    if (clickEvent.target === modal) closeRecapModal();
  }, { once: true });
}

function closeRecapModal() {
  const modal = $("recapModal");
  if (modal) modal.classList.add("is-hidden");
}

async function loadStandaloneRecapPage() {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get("game_id");
  const target = $("standaloneRecap");
  if (!gameId) {
    setStatus("No game selected.", "warn");
    return;
  }
  setStatus("Loading game recap...");
  try {
    const recap = await api(`/api/game/${encodeURIComponent(gameId)}/recap`);
    target.innerHTML = renderGameRecap(recap, false);
    setStatus("Game recap loaded.", "ok");
  } catch (error) {
    target.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    setStatus(error.message, "error");
  }
}

function renderGameRecap(payload, compact = false) {
  const game = payload.game || {};
  const control = payload.postgame_control || {};
  const yards = payload.yards_context || {};
  const boxScore = payload.box_score || {};
  const conversion = payload.adv_drive_conversion || {};
  const title = `${game.away_team || "Away"} at ${game.home_team || "Home"}`;
  const score = `${presentScore(game.away_points)}-${presentScore(game.home_points)}`;
  return `
    <article class="recap-detail ${compact ? "compact-recap" : ""}">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">${escapeHtml(game.season || "-")} Week ${escapeHtml(game.week || "-")}</p>
          <h2>${escapeHtml(title)}</h2>
        </div>
        <span class="panel-note">${escapeHtml(game.date || "")}</span>
      </div>
      <div class="summary-grid recap-summary-grid">
        <div><span>Final Score</span><strong>${escapeHtml(score)}</strong></div>
        <div><span>Actual Winner</span><strong>${escapeHtml(control.actual_winner || "-")}</strong></div>
        <div><span>ADV Control Winner</span><strong>${escapeHtml(control.adv_control_winner || "-")}</strong></div>
        <div><span>ADV Deserved Margin</span><strong>${decimal(control.adv_deserved_margin_home, 1)}</strong></div>
        <div><span>Actual Margin</span><strong>${decimal(control.actual_margin_home, 1)}</strong></div>
        <div><span>Scoreboard vs ADV Gap</span><strong>${decimal(control.scoreboard_gap_home, 1)}</strong></div>
      </div>
      <p class="interpretation">${escapeHtml(control.summary || "Postgame control recap unavailable.")}</p>
      ${renderModelMetricRecap(control, conversion)}
      ${renderRecapBoxScore(game, yards, boxScore)}
    </article>
  `;
}

function renderModelMetricRecap(control, conversion = {}) {
  const homeConversion = conversion.home || {};
  const awayConversion = conversion.away || {};
  const rows = [
    ["Net ADV", signedDecimal(control.net_adv_home, 1), "Home perspective"],
    ["ADV Deserved Margin", decimal(control.adv_deserved_margin_home, 1), "Home perspective"],
    ["Scoreboard vs ADV Gap", signedDecimal(control.scoreboard_gap_home, 1), "Home perspective"],
    ["Home Control Rate (CR)", rate(homeConversion.game_control_rate), "Game-level control"],
    ["Away Control Rate (CR)", rate(awayConversion.game_control_rate), "Game-level control"],
    ["Home Control Finish Rate", conversionRateWithSample(homeConversion), "Scoring control drives / meaningful control drives"],
    ["Away Control Finish Rate", conversionRateWithSample(awayConversion), "Scoring control drives / meaningful control drives"],
  ];
  return `
    <section class="box-score-panel">
      <h3>Model Control Metrics</h3>
      <div class="recap-metric-grid">
        ${rows.map(([label, value, note]) => `
          <div>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
            <small>${escapeHtml(note)}</small>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderRecapBoxScore(game, yards, boxScore = {}) {
  const away = boxScore.away || {};
  const home = boxScore.home || {};
  const rows = [
    ["Points", game.away_points, game.home_points],
    ["Total Yards", valueOrFallback(away.total_yards, yards.away_total_yards), valueOrFallback(home.total_yards, yards.home_total_yards)],
    ["Yards / Play", decimal(valueOrFallback(away.yards_per_play, yards.away_yards_per_play), 2), decimal(valueOrFallback(home.yards_per_play, yards.home_yards_per_play), 2)],
    ["Passing", `${whole(away.pass_completions)} / ${whole(away.pass_attempts)}, ${whole(away.pass_yards)} yds`, `${whole(home.pass_completions)} / ${whole(home.pass_attempts)}, ${whole(home.pass_yards)} yds`],
    ["Rushing", `${whole(away.rush_attempts)} att, ${whole(away.rush_yards)} yds`, `${whole(home.rush_attempts)} att, ${whole(home.rush_yards)} yds`],
    ["First Downs", away.first_downs, home.first_downs],
    ["3rd Down", conversion(away.third_down_conversions, away.third_down_attempts, away.third_down_rate), conversion(home.third_down_conversions, home.third_down_attempts, home.third_down_rate)],
    ["4th Down", conversion(away.fourth_down_conversions, away.fourth_down_attempts, away.fourth_down_rate), conversion(home.fourth_down_conversions, home.fourth_down_attempts, home.fourth_down_rate)],
    ["Red Zone", redZoneLine(away), redZoneLine(home)],
    ["Turnovers", away.turnovers, home.turnovers],
    ["Penalties", `${whole(away.penalties)} / ${whole(away.penalty_yards)} yds`, `${whole(home.penalties)} / ${whole(home.penalty_yards)} yds`],
    ["Sacks / TFL", `${whole(away.sacks_made)} / ${whole(away.tfl_made)}`, `${whole(home.sacks_made)} / ${whole(home.tfl_made)}`],
    ["Field Goals", fieldGoalLine(away), fieldGoalLine(home)],
    ["Punts", `${whole(away.punts)} for ${whole(away.punt_yards)} yds`, `${whole(home.punts)} for ${whole(home.punt_yards)} yds`],
    ["Returns", `Kick ${whole(away.kick_return_yards)} | Punt ${whole(away.punt_return_yards)}`, `Kick ${whole(home.kick_return_yards)} | Punt ${whole(home.punt_return_yards)}`],
  ];
  return `
    <section class="box-score-panel">
      <h3>Box Score</h3>
      <table class="data-table compact-table box-score-table">
        <thead>
          <tr><th>Stat</th><th>${escapeHtml(game.away_team || "Away")}</th><th>${escapeHtml(game.home_team || "Home")}</th></tr>
        </thead>
        <tbody>
          ${rows.map(([label, awayValue, homeValue]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(cleanDash(awayValue))}</td><td>${escapeHtml(cleanDash(homeValue))}</td></tr>`).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function valueOrFallback(value, fallback) {
  return value === null || value === undefined || value === "" ? fallback : value;
}

function cleanDash(value) {
  return value === null || value === undefined || value === "" || value === "null / null" ? "-" : value;
}

function signedDecimal(value, digits = 1) {
  const number = numberOrNull(value);
  if (number === null) return "-";
  return `${number >= 0 ? "+" : ""}${number.toFixed(digits)}`;
}

function redZoneLine(stats) {
  const trips = whole(stats.red_zone_trips);
  const scores = whole(stats.red_zone_scores);
  const tds = whole(stats.red_zone_tds);
  const fgs = whole(stats.red_zone_fgs);
  return `${scores}/${trips} score | TD ${tds} | FG ${fgs}`;
}

function renderTeamStatsView(intel, stats, games = []) {
  const scoredGames = (Array.isArray(games) ? games : []).filter((game) => isFiniteNumber(game.team_score) && isFiniteNumber(game.opponent_score));
  const gamesPlayed = numberOrNull(stats.games) || numberOrNull(intel.games) || scoredGames.length || null;
  const pointsFor = scoredGames.length ? scoredGames.reduce((sum, game) => sum + Number(game.team_score), 0) : numberOrNull(stats.drive_points);
  const pointsAgainst = scoredGames.length ? scoredGames.reduce((sum, game) => sum + Number(game.opponent_score), 0) : null;
  const passCompletions = numberOrNull(stats.pass_completions);
  const passAttempts = numberOrNull(stats.pass_attempts);
  const passCompletionPct = passCompletions !== null && passAttempts ? (passCompletions / passAttempts) * 100 : null;
  const passingTds = numberOrNull(stats.pass_tds);
  const rushingTds = numberOrNull(stats.rush_tds);
  const totalTds = [passingTds, rushingTds].every((value) => value === null) ? null : (passingTds || 0) + (rushingTds || 0);
  const giveawayCount = numberOrNull(stats.turnovers);
  const takeaways = numberOrNull(stats.takeaways);
  const turnoverMargin = numberOrNull(stats.turnover_margin);
  const defPassAllowed = numberOrNull(stats.def_pass_yards_allowed_per_game);
  const defRushAllowed = numberOrNull(stats.def_rush_yards_allowed_per_game);
  const defPassAllowedTotal = numberOrNull(stats.def_pass_yards_allowed);
  const defRushAllowedTotal = numberOrNull(stats.def_rush_yards_allowed);
  const totalAllowed = defPassAllowed !== null || defRushAllowed !== null
    ? decimal((defPassAllowed || 0) + (defRushAllowed || 0), 1)
    : decimal(intel.yards_allowed_per_game, 1);
  const totalDefensiveYardsAllowed = defPassAllowedTotal !== null || defRushAllowedTotal !== null
    ? whole((defPassAllowedTotal || 0) + (defRushAllowedTotal || 0))
    : whole(intel.total_yards_allowed);

  const categories = [
    {
      name: "Team Overview & Scoring",
      rows: [
        ["Points Per Game (PPG)", `${pointsPerGame(pointsFor, gamesPlayed)} scored / ${pointsPerGame(pointsAgainst, gamesPlayed)} allowed`],
        ["Total Points", whole(pointsFor)],
        ["Total Offensive Yards", whole(stats.total_yards ?? intel.total_yards_for)],
        ["Total Defensive Yards Allowed", totalDefensiveYardsAllowed],
        ["Touchdowns", `Total ${whole(totalTds)} | Pass ${whole(passingTds)} | Rush ${whole(rushingTds)}`],
        ["First Downs per Game", `Total ${decimal(stats.first_downs_per_game, 1)} | Rush ${decimal(stats.rush_first_downs_per_game, 1)} | Pass ${decimal(stats.pass_first_downs_per_game, 1)}`],
      ],
    },
    {
      name: "Passing Statistics",
      rows: [
        ["Passing Yards Per Game", decimal(stats.pass_yards_per_game, 1)],
        ["Completions / Attempts (COMP/ATT)", `${whole(passCompletions)} / ${whole(passAttempts)}`],
        ["Completion Percentage (COMP%)", percentWhole(passCompletionPct)],
        ["Yards Per Pass Attempt (Y/A or YPA)", decimal(stats.yards_per_pass_attempt, 2)],
        ["Passing Touchdowns (TD)", whole(passingTds)],
        ["Interceptions (INT)", whole(stats.interceptions_thrown)],
      ],
    },
    {
      name: "Rushing Statistics",
      rows: [
        ["Rushing Yards Per Game", decimal(stats.rush_yards_per_game, 1)],
        ["Rushing Attempts (ATT)", whole(stats.rush_attempts)],
        ["Yards Per Rush Attempt (Y/A or Avg)", decimal(stats.yards_per_rush, 2)],
        ["Rushing Touchdowns (TD)", whole(rushingTds)],
      ],
    },
    {
      name: "Defensive & Line Metrics",
      rows: [
        ["Yards Allowed Per Game", `Total ${totalAllowed} | Pass ${decimal(stats.def_pass_yards_allowed_per_game, 1)} | Rush ${decimal(stats.def_rush_yards_allowed_per_game, 1)}`],
        ["Sacks", whole(stats.sacks_made)],
        ["Interceptions & Fumbles Recovered", `INT ${whole(stats.interceptions_made)} | Fumbles ${whole(stats.fumbles_recovered)}`],
        ["Tackles For Loss (TFL)", whole(stats.tfl_made)],
      ],
    },
    {
      name: "Situational & Special Teams",
      rows: [
        ["3rd Down Conversions", conversion(stats.third_down_conversions, stats.third_down_attempts, stats.third_down_rate)],
        ["4th Down Conversions", conversion(stats.fourth_down_conversions, stats.fourth_down_attempts, stats.fourth_down_rate)],
        ["Red Zone Efficiency", `Score ${rate(stats.red_zone_score_rate)} | TD ${rate(stats.red_zone_td_rate)} | FG ${rate(stats.red_zone_fg_rate)} | Pts/Trip ${decimal(stats.red_zone_points_per_trip, 2)}`],
        ["Turnover Margin", `Takeaways ${whole(takeaways)} | Giveaways ${whole(giveawayCount)} | Margin ${signed(turnoverMargin)}`],
        ["Field Goal Percentage (FG%)", fieldGoalLine(stats)],
        ["Punting Average", decimal(stats.punting_average, 1)],
        ["Kick/Punt Return Yards", `Kick ${decimal(stats.kick_return_yards_per_game, 1)} / game | Punt ${decimal(stats.punt_return_yards_per_game, 1)} / game`],
        ["Penalties / Penalty Yards", `${whole(stats.penalties)} penalties / ${whole(stats.penalty_yards)} yards`],
      ],
    },
  ];

  return categories.map((category) => `
    <div class="insight-panel stat-category">
      <h3>${escapeHtml(category.name)}</h3>
      ${category.rows.map(([label, value]) => `
        <div class="stat-row compact-stat-row">
          <strong>${escapeHtml(label)}</strong>
          <div class="stat-value">${escapeHtml(value)}</div>
        </div>
      `).join("")}
    </div>
  `).join("");
}

function renderTeamAdvProfileView(intel = {}, driveConversion = {}) {
  const profile = contextualProfileValues(intel);
  const view = { ...intel, ...profile };
  if (numberOrNull(view.points_per_control_drive) === null) {
    view.points_per_control_drive = driveConversion.points_per_control_drive;
  }
  if (numberOrNull(view.offensive_drives) === null) {
    view.offensive_drives = driveConversion.drives;
  }
  if (
    numberOrNull(view.control_production_rate) === null
    && numberOrNull(view.control_creation_rate) !== null
    && numberOrNull(view.points_per_control_drive) !== null
  ) {
    view.control_production_rate = Number(view.control_creation_rate) * Number(view.points_per_control_drive);
  }
  const specialTeamsAdv = view.sp_adv_srs ?? view.sp_adv ?? view.special_teams_adv ?? view.raw_sp_adv_margin_avg;
  const dce = view.team_season_dce ?? view.dce ?? view.drive_conversion_efficiency;
  const outcomeRows = [
    ["ADV Strength Rating (ADV SRS)", decimal(view.adv_srs, 1)],
    ["ADV Rank", view.adv_srs_rank ? `#${view.adv_srs_rank}` : "-"],
    ["Offensive ADV Strength", decimal(view.off_adv_srs, 1)],
    ["Defensive ADV Strength", decimal(view.def_adv_srs, 1)],
    ["Special Teams ADV", decimal(specialTeamsAdv, 1)],
    ["Weak-Side Profile", decimal(view.weaker_side_srs ?? view.weak_side_srs, 1)],
    ["Schedule Strength", `${decimal(view.adv_sos_percentile, 1)} percentile`],
    ["Control Rate (CR)", rate(view.cr ?? view.control_rate ?? (numberOrNull(view.control_rate_pct) !== null ? Number(view.control_rate_pct) / 100 : null))],
    ["Scoreboard Control Gap", decimal(dce, 2)],
  ];
  const frameworkRows = [
    ["Control Creation", view.control_creation_tier || "-", percentileLabel(view.control_creation_percentile)],
    ["Control Denial", view.control_denial_tier || "-", percentileLabel(view.control_denial_percentile)],
    [
      "Control Finish Rate",
      view.control_finish_tier || rate(driveConversion.scoring_conversion_rate),
      [percentileLabel(view.control_finish_percentile), conversionSampleLabel(driveConversion)].filter(Boolean).join(" · "),
    ],
    ["Control Drive Shutout Rate", view.finishing_resistance_tier || "-", percentileLabel(view.finishing_resistance_percentile)],
    [
      "Control Production Per Offensive Drive",
      view.control_production_tier || decimal(view.control_production_rate, 2),
      [
        percentileLabel(view.control_production_percentile),
        productionSampleLabel(view.control_production_rate, view.offensive_drives, "offensive drives"),
      ].filter(Boolean).join(" · "),
    ],
    [
      "Defensive Control Production Allowed Per Defensive Drive",
      view.defensive_control_production_allowed_tier || decimal(view.defensive_control_production_allowed, 2),
      [
        percentileLabel(view.defensive_control_production_allowed_percentile),
        productionSampleLabel(view.defensive_control_production_allowed, view.defensive_drives, "defensive drives"),
        "Lower is better",
      ].filter(Boolean).join(" · "),
    ],
  ];
  const conversionRows = [
    ["Control Foundation", view.control_foundation_tier || "-", percentileLabel(view.control_foundation_percentile)],
    ["Conversion Profile", view.control_conversion_tier || "-", percentileLabel(view.control_conversion_percentile)],
    ["TD Control Conversion", rate(driveConversion.td_conversion_rate), ""],
    ["Points Per Control Drive", decimal(driveConversion.points_per_control_drive, 2), ""],
    ["Creation Waste", rate(view.creation_waste_rate), "Possessions that do not become meaningful control"],
    ["Finish Waste", rate(view.finish_waste_rate), "Control drives that produce no points"],
  ];
  const summary = publicProfileSummary(view.contextual_profile_summary)
    || "This profile explains how the team creates control, finishes control, denies control, and produces complete stops after control forms.";
  return `
    <div class="insight-panel">
      <p class="eyebrow">Contextual Football Profile</p>
      <h3>${escapeHtml(view.contextual_profile_label || "Season Identity")}</h3>
      <p class="interpretation">${escapeHtml(summary)}</p>
      <a class="text-link" href="metrics.html">How CFP Advantage metrics work</a>
    </div>
    <div class="insight-panel">
      <p class="eyebrow">Football Mechanics</p>
      <h3>Control Framework</h3>
      <div class="summary-grid">
        ${frameworkRows.map(([label, value, note]) => `
          <div>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
            ${note ? `<small>${escapeHtml(note)}</small>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
    <div class="insight-panel">
      <p class="eyebrow">Profile Shape</p>
      <h3>Foundation & Conversion</h3>
      <div class="summary-grid">
        ${conversionRows.map(([label, value, note]) => `
          <div>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
            ${note ? `<small>${escapeHtml(note)}</small>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
    <div class="insight-panel">
      <p class="eyebrow">Outcome & Context</p>
      <h3>ADV Season View</h3>
      <div class="summary-grid">
        ${outcomeRows.map(([label, value]) => `
          <div>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `).join("")}
      </div>
      <p class="interpretation">${escapeHtml(scoreboardControlGapRead(dce))}</p>
    </div>
  `;
}

function contextualProfileValues(intel = {}) {
  const nested = intel.contextual_profile_json;
  let parsed = {};
  if (nested && typeof nested === "object" && !Array.isArray(nested)) parsed = nested;
  if (typeof nested === "string" && nested.trim()) {
    try {
      const value = JSON.parse(nested);
      parsed = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (error) {
      console.warn("Contextual Football Profile payload could not be parsed:", error.message);
    }
  }
  const view = { ...parsed };
  const copyFields = [
    "control_production_rate",
    "control_production_percentile",
    "control_production_tier",
    "defensive_control_production_allowed",
    "defensive_control_production_allowed_percentile",
    "defensive_control_production_allowed_tier",
    "creation_waste_rate",
    "finish_waste_rate",
    "offensive_drives",
    "defensive_drives",
  ];
  copyFields.forEach((field) => {
    if ((view[field] === null || view[field] === undefined || view[field] === "") && intel[field] !== undefined) {
      view[field] = intel[field];
    }
  });
  const creation = numberOrNull(view.control_creation_rate);
  const finish = numberOrNull(view.control_finish_rate);
  const denial = numberOrNull(view.control_denial_rate);
  const pointsPerControl = numberOrNull(view.points_per_control_drive);
  const opponentPointsPerControl = numberOrNull(view.opp_points_per_control_allowed);
  if (numberOrNull(view.control_production_rate) === null && creation !== null && pointsPerControl !== null) {
    view.control_production_rate = creation * pointsPerControl;
  }
  if (
    numberOrNull(view.defensive_control_production_allowed) === null
    && denial !== null
    && opponentPointsPerControl !== null
  ) {
    view.defensive_control_production_allowed = (1 - denial) * opponentPointsPerControl;
  }
  if (numberOrNull(view.creation_waste_rate) === null && creation !== null) view.creation_waste_rate = 1 - creation;
  if (numberOrNull(view.finish_waste_rate) === null && finish !== null) view.finish_waste_rate = 1 - finish;
  return view;
}

function productionSampleLabel(value, drives, denominator) {
  const production = numberOrNull(value);
  const sample = numberOrNull(drives);
  if (production === null) return "";
  const valueLabel = `${production.toFixed(2)} per drive`;
  return sample === null ? valueLabel : `${valueLabel} across ${Math.round(sample)} ${denominator}`;
}

function publicProfileSummary(value) {
  return String(value || "").replaceAll("Finishing Resistance", "Control Drive Shutout Rate");
}

function scoreboardControlGapRead(value) {
  const gap = numberOrNull(value);
  if (gap === null) return "Scoreboard Control Gap is unavailable for this team-season.";
  if (Math.abs(gap) < 1) {
    return "The scoreboard has closely matched the team's underlying ADV control profile.";
  }
  if (gap > 0) {
    return `The team's average scoring margin has run ${gap.toFixed(2)} points ahead of its underlying ADV control profile.`;
  }
  return `The team's underlying ADV control profile has run ${Math.abs(gap).toFixed(2)} points stronger than its average scoring margin.`;
}

function percentileLabel(value) {
  const number = numberOrNull(value);
  if (number === null) return "";
  const rounded = Math.round(number);
  const suffix = rounded % 100 >= 11 && rounded % 100 <= 13
    ? "th"
    : ({ 1: "st", 2: "nd", 3: "rd" }[rounded % 10] || "th");
  return `${rounded}${suffix} percentile`;
}

function isFiniteNumber(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function truthyValue(value) {
  return value === true || String(value).toLowerCase() === "true" || String(value) === "1";
}

function numberOrNull(value) {
  return isFiniteNumber(value) ? Number(value) : null;
}

function whole(value) {
  const number = numberOrNull(value);
  return number === null ? "-" : String(Math.round(number));
}

function decimal(value, digits = 1) {
  const number = numberOrNull(value);
  return number === null ? "-" : number.toFixed(digits);
}

function rate(value) {
  const number = numberOrNull(value);
  return number === null ? "-" : `${(number * 100).toFixed(2)}%`;
}

function conversionSampleLabel(values = {}) {
  const scored = numberOrNull(values.scoring_control_drives);
  const control = numberOrNull(values.control_drives);
  if (scored === null || control === null) return "";
  return `${Math.round(scored)} of ${Math.round(control)} control drives`;
}

function conversionRateWithSample(values = {}) {
  const value = rate(values.scoring_conversion_rate);
  const sample = conversionSampleLabel(values);
  return sample ? `${value} (${sample.replace(" control drives", "")})` : value;
}

function trajectoryPublicLabel(value) {
  const labels = {
    upward_trend_micro_surging: "Improving",
    upward_trend_improving_efficiency: "Improving",
    upward_trend_strong_improvement: "Surging",
    neutral_trend: "Stable",
    stable_profile: "Stable",
    downward_trend_degrading_efficiency: "Declining",
    downward_trend_sharp_degradation: "Falling Fast",
    insufficient_sample: "Not Enough Games",
  };
  const raw = String(value || "").trim();
  if (!raw) return "-";
  return labels[raw] || raw.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function pregameRatingSourceLabel(context = {}) {
  const labels = {
    anchor_only: "Frozen preseason anchor",
    anchor_live_blend: `Anchor/live blend · ${formatNumber(Number(context.pregame_anchor_weight) * 100, 0)}% anchor`,
    live_only: "Live prior-game ADV",
    anchor_fallback_live_unavailable: "Frozen preseason anchor · live data unavailable",
    live_fallback_anchor_unavailable: "Live prior-game ADV · anchor unavailable",
    unavailable: "Unavailable",
  };
  return labels[context.pregame_adv_rating_source] || "Frozen prior-game snapshot";
}

function percentWhole(value) {
  const number = numberOrNull(value);
  return number === null ? "-" : `${number.toFixed(2)}%`;
}

function signed(value) {
  const number = numberOrNull(value);
  if (number === null) return "-";
  return number > 0 ? `+${Math.round(number)}` : String(Math.round(number));
}

function fieldGoalLine(stats) {
  const made = numberOrNull(stats.field_goals_made);
  const attempts = numberOrNull(stats.field_goals_attempted);
  if (made === null && attempts === null) return "-";
  return `${whole(made)} / ${whole(attempts)} (${rate(stats.field_goal_rate)})`;
}

function conversion(made, attempts, storedRate) {
  const madeNumber = numberOrNull(made);
  const attemptsNumber = numberOrNull(attempts);
  const pct = attemptsNumber ? (madeNumber || 0) / attemptsNumber : numberOrNull(storedRate);
  const pctText = pct === null ? "-" : `${(pct * 100).toFixed(2)}%`;
  return `${whole(madeNumber)} / ${whole(attemptsNumber)} (${pctText})`;
}

function pointsPerGame(points, gamesPlayed) {
  const pointsNumber = numberOrNull(points);
  const gamesNumber = numberOrNull(gamesPlayed);
  return pointsNumber === null || !gamesNumber ? "-" : (pointsNumber / gamesNumber).toFixed(1);
}

function perGame(total, gamesPlayed) {
  const totalNumber = numberOrNull(total);
  const gamesNumber = numberOrNull(gamesPlayed);
  return totalNumber === null || !gamesNumber ? "-" : (totalNumber / gamesNumber).toFixed(1);
}

async function loadRankingsPage() {
  setStatus("Loading ranking seasons...");
  const seasonsPayload = await api("/api/seasons");
  const seasons = seasonsPayload.seasons || [];
  const seasonSelect = $("rankSeasonSelect");
  seasonSelect.innerHTML = seasons.map((season) => `<option value="${season}">${season}</option>`).join("");
  seasonSelect.value = String(seasons[0] || "");
  seasonSelect.addEventListener("change", populateRankWeeks);
  $("loadRankingsButton").addEventListener("click", renderRankingsCompare);
  await populateRankWeeks();
  setStatus("Rankings comparison ready.", "ok");
}

async function populateRankWeeks() {
  const season = $("rankSeasonSelect").value;
  if (!season) return;
  const weekSelect = $("rankWeekSelect");
  weekSelect.innerHTML = '<option value="">Latest available</option>';
  try {
    const payload = await api(`/api/product-a/rankings-compare?season=${encodeURIComponent(season)}`);
    const weeks = payload.available_weeks || [];
    weekSelect.innerHTML = weeks.map((week) => `<option value="${week}">Week ${week}</option>`).join("");
    weekSelect.value = String(payload.week || weeks[weeks.length - 1] || "");
    renderRankingsPayload(payload);
  } catch (error) {
    $("rankingsSummary").innerHTML = `<div class="empty-state">AP poll comparison is not available for this season yet.</div>`;
    $("advTop25Table").innerHTML = "";
    $("apTop25Table").innerHTML = "";
    $("rankCompareTable").innerHTML = "";
  }
}

async function renderRankingsCompare() {
  const season = $("rankSeasonSelect").value;
  const week = $("rankWeekSelect").value;
  if (!season) return;
  setStatus("Loading rankings comparison...");
  const path = `/api/product-a/rankings-compare?season=${encodeURIComponent(season)}${week ? `&week=${encodeURIComponent(week)}` : ""}`;
  try {
    renderRankingsPayload(await api(path));
    setStatus("Rankings comparison loaded.", "ok");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function renderRankingsPayload(payload) {
  const summary = payload.summary || {};
  $("rankingsSummary").innerHTML = `
    <div class="summary-grid">
      <div><span>Season</span><strong>${escapeHtml(payload.season || "-")}</strong></div>
      <div><span>Poll Week</span><strong>${escapeHtml(payload.week || "-")}</strong></div>
      <div><span>Model-Only Strength Board</span><strong>${escapeHtml(summary.adv_only_top_25 ?? "-")}</strong></div>
      <div><span>AP-Only Poll Board</span><strong>${escapeHtml(summary.ap_only_top_25 ?? "-")}</strong></div>
      <div><span>Model Higher</span><strong>${escapeHtml(summary.model_higher ?? "-")}</strong></div>
      <div><span>Poll Higher</span><strong>${escapeHtml(summary.poll_higher ?? "-")}</strong></div>
    </div>
    <p class="interpretation">${escapeHtml(payload.poll_timing_note || "Poll comparison is perception context.")}</p>
  `;
  renderRows("advTop25Table", payload.adv_top_25 || [], [
    { label: "Strength Rank", key: "adv_rank" },
    { label: "Team", key: "team" },
    { label: "Conference", key: "conference" },
    { label: "Strength Rating", render: (row) => formatNumber(row.adv_srs, 2) },
  ]);
  renderRows("apTop25Table", payload.ap_top_25 || [], [
    { label: "AP Rank", key: "ap_rank" },
    { label: "Team", key: "team" },
    { label: "Conference", key: "conference" },
    { label: "Points", key: "points" },
  ]);
  renderRows("rankCompareTable", payload.comparison || [], [
    { label: "Team", key: "team" },
    { label: "Model Strength", render: (row) => row.adv_rank ?? "-" },
    { label: "AP", render: (row) => row.ap_rank ?? "-" },
    { label: "Rank Gap", render: (row) => row.rank_gap ?? "-" },
    { label: "Read", key: "label" },
  ]);
}

async function boot() {
  const page = document.body.dataset.page;
  try {
    setupSiteChrome();
    await loadTermsGate();
    if (page === "metrics") await loadMetricPage();
    if (page === "historical") await loadHistoricalPage();
    if (page === "bracket") await loadBracketPage();
    if (page === "legal") await loadLegalPage();
    if (page === "news") await loadNewsPage("newsList", 20, false);
    if (page === "home") await loadNewsPage("homeNewsList", 3, true);
    if (page === "team") await loadTeamPage();
    if (page === "recap") await loadStandaloneRecapPage();
    if (page === "rankings") await loadRankingsPage();
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
  }
}

boot();

const IS_LOCAL_HOST = ["127.0.0.1", "localhost"].includes(window.location.hostname);
const LOCAL_API_OVERRIDE = IS_LOCAL_HOST ? new URLSearchParams(window.location.search).get("api") : "";
const API_BASE = (
  LOCAL_API_OVERRIDE ||
  (window.CFP_ADV_CONFIG && window.CFP_ADV_CONFIG.API_BASE_URL) ||
  window.CFP_API_BASE ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");
const APP_CONFIG = window.CFP_ADV_CONFIG || {};
const USE_STATIC_FALLBACK = APP_CONFIG.USE_STATIC_FALLBACK === true;
const APP_ENVIRONMENT = APP_CONFIG.ENVIRONMENT || "local";
const CACHE_PREFIX = "cfp_adv_api_cache:";
const CACHE_TTL_MS = 1000 * 60 * 20;
const apiMemoryCache = new Map();
const TERMS_ACCEPTED_KEY = "cfp_adv_terms_accepted";
const TERMS_VERSION_KEY = "cfp_adv_terms_version";
const TERMS_ACCEPTED_AT_KEY = "cfp_adv_terms_accepted_at";
const DEFAULT_TERMS_VERSION = "2026-06-01-access-terms-v5";
const TERMS_GATE_MESSAGE = "Before entering CFP Advantage, please review and accept the Terms of Use. CFP Advantage provides football intelligence and model-derived context for informational and educational purposes. It does not guarantee outcomes and is not betting, financial, or professional advice. To access this free site, you must be at least 13 years old. Purchases of premium content or subscriptions are restricted to individuals 18 years of age or older, or the age of majority in their jurisdiction. This site uses browser localStorage to remember your terms acknowledgement and display preferences on this device. By accepting, you agree to the Terms, Privacy Policy, Refund Policy, and Disclaimer.";
const METRIC_DISPLAY = {
  "ADV SRS": ["ADV Strength Rating (ADV SRS)", "Measures a team's overall football-control strength after accounting for schedule context. Higher values indicate stronger season-level team quality."],
  "OFF ADV SRS": ["Offensive ADV Strength Rating (OFF ADV SRS)", "Measures how much value a team's offense creates through sustained, useful football control."],
  "DEF ADV SRS": ["Defensive ADV Strength Rating (DEF ADV SRS)", "Measures how much a team's defense suppresses opponent control and scoring opportunity."],
  "ADV SOS": ["ADV Strength of Schedule (ADV SOS)", "Measures the quality of opponents a team faced through the ADV lens."],
  "Control Rate": ["Control Rate (CR)", "Measures how often a team creates useful control opportunities across its games. It is a consistency signal, not a final score measure."],
  "DCE": ["Drive Conversion Efficiency (DCE)", "Measures how efficiently a team's scoreboard output lines up with its underlying drive control."],
  "Weak-Side Profile": ["Weak-Side Profile", "Shows the weaker side of a team's offense/defense profile so users can spot balance or fragility."],
  "ADV Expected Margin": ["ADV Expected Margin", "A matchup margin estimate created from the difference between two teams' ADV strength profiles."],
  "ADV Deserved Margin": ["ADV Deserved Margin", "A postgame control recap that compares how the game was played to the final scoreboard result."],
  "Scoreboard vs ADV Gap": ["Scoreboard vs ADV Gap", "Shows when the final score looked stronger or weaker than the underlying football-control profile."],
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
};

const DEVELOPER_MODE = false;

const HELP_CONTENT = {
  "expected-margin": {
    title: "ADV Expected Margin",
    body: "Estimated scoreboard margin based on the model's pregame team-strength view. Use this as a football-intelligence outlook.",
  },
  "deserved-margin": {
    title: "ADV Deserved Margin",
    body: "Postgame control margin based on how the game was actually played. This is descriptive, not a pregame prediction.",
  },
  "scoreboard-gap": {
    title: "Scoreboard vs ADV Gap",
    body: "Difference between the actual final margin and the ADV deserved margin. Positive values mean the scoreboard was better than the control profile; negative values mean it was lower.",
  },
  "adv-srs": {
    title: "ADV SRS",
    body: "Schedule-adjusted team strength based on ADV control performance.",
  },
  cr: {
    title: "Control Rate",
    body: "Measures how consistently a team creates useful control across plays and drives.",
  },
  sos: {
    title: "SOS Percentile",
    body: "Schedule-strength context compared with other qualified teams in the same season.",
  },
  "weak-side": {
    title: "Weak-Side Profile",
    body: "Shows whether a team has enough strength on its weaker side of the ball to avoid being one-dimensional.",
  },
};

const state = {
  seasons: [],
  matchupRows: [],
  boardRows: [],
  filteredRows: [],
  explorerTeams: [],
  games: [],
  metricCatalog: [],
  comparisonStats: [],
  termsVersion: DEFAULT_TERMS_VERSION,
  selectedActualGame: null,
  hasRecap: false,
  activeView: "pregame",
  explorerLoaded: false,
};

const $ = (id) => document.getElementById(id);

const els = {
  season: $("seasonSelect"),
  tierFilter: $("tierFilter"),
  conferenceFilter: $("conferenceFilter"),
  rankFilter: $("rankFilter"),
  previewSearchA: $("previewSearchA"),
  previewSearchB: $("previewSearchB"),
  previewTeamA: $("previewTeamA"),
  previewTeamB: $("previewTeamB"),
  previewButton: $("previewButton"),
  matchupEmpty: $("matchupEmpty"),
  matchupCard: $("matchupCard"),
  previewWinner: $("previewWinner"),
  previewMargin: $("previewMargin"),
  previewConfidence: $("previewConfidence"),
  previewInterpretation: $("previewInterpretation"),
  previewComparison: $("previewComparison"),
  actualMatchupPanel: $("actualMatchupPanel"),
  actualGameLine: $("actualGameLine"),
  actualGameComparison: $("actualGameComparison"),
  viewActualRecapButton: $("viewActualRecapButton"),
  explorerSeason: $("explorerSeasonSelect"),
  explorerTier: $("explorerTierSelect"),
  teamSearch: $("teamSearch"),
  team: $("teamSelect"),
  scheduleView: $("scheduleViewSelect"),
  teamHistoryEmpty: $("teamHistoryEmpty"),
  teamHistoryPanel: $("teamHistoryPanel"),
  historyTeamName: $("historyTeamName"),
  historyTeamContext: $("historyTeamContext"),
  recordSummary: $("recordSummary"),
  scheduleSections: $("scheduleSections"),
  loaderPanel: $("loaderPanel"),
  loaderTitle: $("loaderTitle"),
  loaderMessage: $("loaderMessage"),
  pregameView: $("pregameView"),
  postgameView: $("postgameView"),
  teamBoardView: $("teamBoardView"),
  explorerView: $("explorerView"),
  pregameViewTab: $("pregameViewTab"),
  postgameViewTab: $("postgameViewTab"),
  teamBoardViewTab: $("teamBoardViewTab"),
  explorerViewTab: $("explorerViewTab"),
  recapEmpty: $("recapEmpty"),
  recapPanel: $("recapPanel"),
  awayName: $("awayName"),
  homeName: $("homeName"),
  awayAdv: $("awayAdv"),
  homeAdv: $("homeAdv"),
  gameDate: $("gameDate"),
  advMargin: $("advMargin"),
  scoreLine: $("scoreLine"),
  deservedMargin: $("deservedMargin"),
  actualMargin: $("actualMargin"),
  scoreboardGap: $("scoreboardGap"),
  projectionLine: $("projectionLine"),
  recapYardsContext: $("recapYardsContext"),
  teamBoardTable: $("teamBoardTable"),
  boardSeasonLabel: $("boardSeasonLabel"),
  boardSeason: $("boardSeasonSelect"),
  boardConference: $("boardConferenceFilter"),
  boardTier: $("boardTierFilter"),
  boardSearch: $("boardSearch"),
  boardMinGames: $("boardMinGames"),
  boardSort: $("boardSort"),
  boardState: $("boardState"),
  helpOverlay: $("helpOverlay"),
  helpTitle: $("helpTitle"),
  helpBody: $("helpBody"),
  helpClose: $("helpCloseButton"),
  metricCatalogState: $("metricCatalogState"),
  metricCatalogGrid: $("metricCatalogGrid"),
  comparisonStatsGrid: $("comparisonStatsGrid"),
  termsBanner: $("termsBanner"),
  termsBannerText: $("termsBannerText"),
  termsAcceptButton: $("termsAcceptButton"),
};

function formatNumber(value) {
  return value === null || value === undefined || Number.isNaN(Number(value))
    ? "-"
    : Number(value).toFixed(2);
}

function formatPercent(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  const pct = Math.abs(number) <= 1 ? number * 100 : number;
  return `${pct.toFixed(digits)}%`;
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

function numericOrNull(value) {
  const number = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(number) ? null : number;
}

function decimal(value, digits = 1) {
  const number = numericOrNull(value);
  return number === null ? "-" : number.toFixed(digits);
}

function signedDecimal(value, digits = 1) {
  const number = numericOrNull(value);
  return number === null ? "-" : `${number >= 0 ? "+" : ""}${number.toFixed(digits)}`;
}

function rate(value) {
  const number = numericOrNull(value);
  if (number === null) return "-";
  const pct = Math.abs(number) <= 1 ? number * 100 : number;
  return `${pct.toFixed(1)}%`;
}

function whole(value) {
  const number = numericOrNull(value);
  return number === null ? "-" : String(Math.round(number));
}

function presentScore(value) {
  if (value === 0 || value === "0") return "0";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function cleanDash(value) {
  return value === null || value === undefined || value === "" || value === "null / null" || value === "- / -" ? "-" : value;
}

function validSeason(value) {
  return /^\d{4}$/.test(String(value || ""));
}

async function api(path) {
  try {
    const cacheKey = `${CACHE_PREFIX}${path}`;
    const memory = apiMemoryCache.get(cacheKey);
    if (memory && Date.now() - memory.stored_at < CACHE_TTL_MS) return memory.data;
    try {
      const cached = JSON.parse(window.sessionStorage.getItem(cacheKey) || "null");
      if (cached && Date.now() - cached.stored_at < CACHE_TTL_MS) {
        apiMemoryCache.set(cacheKey, cached);
        return cached.data;
      }
    } catch (error) {
      console.warn("CFP Advantage cache read unavailable:", error.message);
    }
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      const message = detail.detail && typeof detail.detail === "object"
        ? detail.detail.error || JSON.stringify(detail.detail)
        : detail.detail || detail.error || `Request failed: ${response.status}`;
      throw new Error(message);
    }
    console.info("CFP Advantage data source:", "api", path);
    const data = await response.json();
    apiMemoryCache.set(cacheKey, { stored_at: Date.now(), data });
    try {
      window.sessionStorage.setItem(cacheKey, JSON.stringify({ stored_at: Date.now(), data }));
    } catch (error) {
      console.warn("CFP Advantage cache write unavailable:", error.message);
    }
    return data;
  } catch (error) {
    console.error("CFP Advantage endpoint failed:", path, error.message);
    if (USE_STATIC_FALLBACK) {
      console.info("CFP Advantage data source:", "static fallback unavailable for this endpoint", path);
    }
    throw error;
  }
}

function setOptions(select, rows, getValue, getLabel, placeholder = "") {
  const previous = select.value;
  select.innerHTML = "";
  if (placeholder) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = placeholder;
    select.appendChild(option);
  }
  rows.forEach((row) => {
    const option = document.createElement("option");
    option.value = getValue(row);
    option.textContent = getLabel(row);
    select.appendChild(option);
  });
  if (Array.from(select.options).some((option) => option.value === previous)) {
    select.value = previous;
  }
}

function showStatus(title, message, loading = false) {
  els.loaderTitle.textContent = title;
  els.loaderMessage.textContent = message;
  els.loaderPanel.classList.remove("is-hidden");
  els.loaderPanel.classList.toggle("is-loading", loading);
}

function hideStatus() {
  els.loaderPanel.classList.add("is-hidden");
  els.loaderPanel.classList.remove("is-loading");
}

function setWorkspaceView(view) {
  state.activeView = view;
  const mapping = {
    pregame: [els.pregameViewTab, els.pregameView],
    postgame: [els.postgameViewTab, els.postgameView],
    board: [els.teamBoardViewTab, els.teamBoardView],
    explorer: [els.explorerViewTab, els.explorerView],
  };
  Object.entries(mapping).forEach(([key, [button, panel]]) => {
    if (!button || !panel) return;
    const active = key === view;
    button.classList.toggle("is-active", active);
    panel.classList.toggle("is-hidden", !active);
  });
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

function showTermsBanner(message) {
  if (!els.termsBanner) return;
  const accepted = storageGet(TERMS_ACCEPTED_KEY) === "true";
  const version = storageGet(TERMS_VERSION_KEY);
  if (accepted && version === state.termsVersion) return;
  els.termsBannerText.textContent = message || TERMS_GATE_MESSAGE;
  els.termsBanner.classList.remove("is-hidden");
  document.body.classList.add("terms-locked");
}

function acceptTerms() {
  storageSet(TERMS_ACCEPTED_KEY, "true");
  storageSet(TERMS_VERSION_KEY, state.termsVersion);
  storageSet(TERMS_ACCEPTED_AT_KEY, new Date().toISOString());
  els.termsBanner.classList.add("is-hidden");
  document.body.classList.remove("terms-locked");
}

function renderMetricCards(rows) {
  if (!els.metricCatalogGrid) return;
  els.metricCatalogGrid.innerHTML = rows.map((metric) => `
    <article class="guide-card">
      <span>${escapeHtml(metric.group || "Metric")}</span>
      <h4>${escapeHtml(publicMetricName(metric.name))}</h4>
      <p>${escapeHtml(publicMetricDescription(metric))}</p>
    </article>
  `).join("");
}

function renderComparisonStats(rows) {
  if (!els.comparisonStatsGrid) return;
  els.comparisonStatsGrid.innerHTML = rows.map((stat) => `
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

async function loadProductGuides() {
  if (!els.metricCatalogState) {
    try {
      const legal = await api("/api/legal/acknowledgement");
      state.termsVersion = legal.terms_version || DEFAULT_TERMS_VERSION;
      showTermsBanner(TERMS_GATE_MESSAGE);
    } catch (error) {
      showTermsBanner(TERMS_GATE_MESSAGE);
    }
    return;
  }
  els.metricCatalogState.textContent = "Loading metric guide...";
  try {
    const [metrics, stats, legal] = await Promise.all([
      api("/api/product-a/metric-catalog"),
      api("/api/product-a/comparison-stats"),
      api("/api/legal/acknowledgement"),
    ]);
    state.metricCatalog = metrics.metrics || [];
    state.comparisonStats = stats.stats || [];
    state.termsVersion = legal.terms_version || DEFAULT_TERMS_VERSION;
    renderMetricCards(state.metricCatalog);
    renderComparisonStats(state.comparisonStats);
    els.metricCatalogState.textContent = `${state.metricCatalog.length} public metrics and ${state.comparisonStats.length} comparison stats loaded.`;
    showTermsBanner(TERMS_GATE_MESSAGE);
  } catch (error) {
    els.metricCatalogState.textContent = `Metric guide unavailable from API: ${error.message}`;
    renderMetricCards([]);
    renderComparisonStats([]);
    showTermsBanner(TERMS_GATE_MESSAGE);
  }
}

function openHelp(key, trigger) {
  const help = HELP_CONTENT[key];
  if (!help) return;
  document.querySelectorAll(".info-button").forEach((button) => button.setAttribute("aria-expanded", "false"));
  trigger.setAttribute("aria-expanded", "true");
  els.helpTitle.textContent = help.title;
  els.helpBody.textContent = help.body;
  els.helpOverlay.classList.remove("is-hidden");
  els.helpClose.focus();
}

function closeHelp() {
  els.helpOverlay.classList.add("is-hidden");
  document.querySelectorAll(".info-button").forEach((button) => button.setAttribute("aria-expanded", "false"));
}

function rankingRowsForFilters() {
  const tier = els.tierFilter.value;
  const conference = els.conferenceFilter.value;
  const maxRank = els.rankFilter.value === "all" ? Infinity : Number(els.rankFilter.value);
  return state.matchupRows.filter((row) => {
    const tierMatch = tier === "independent"
      ? String(row.conference || "").toLowerCase().includes("independent")
      : tier === "all" || tier === "fbs"
      ? ["power", "g5"].includes(row.tier)
      : row.tier === tier;
    const conferenceMatch = conference === "all" || row.conference === conference;
    return tierMatch && conferenceMatch && Number(row.adv_srs_rank) <= maxRank;
  });
}

function searchRows(rows, query) {
  const clean = query.trim().toLowerCase();
  if (!clean) return rows;
  return rows.filter((row) => row.team.toLowerCase().includes(clean) || String(row.conference || "").toLowerCase().includes(clean));
}

function updateMatchupSelectors() {
  state.filteredRows = rankingRowsForFilters();
  const byTeam = (left, right) => String(left.team || "").localeCompare(String(right.team || ""));
  const aRows = searchRows(state.filteredRows, els.previewSearchA.value).slice().sort(byTeam);
  const bRows = searchRows(state.filteredRows, els.previewSearchB.value).slice().sort(byTeam);
  setOptions(els.previewTeamA, aRows, (row) => row.team, (row) => `#${row.adv_srs_rank} ${row.team} (${row.tier.toUpperCase()})`, "Select Team A");
  setOptions(els.previewTeamB, bRows, (row) => row.team, (row) => `#${row.adv_srs_rank} ${row.team} (${row.tier.toUpperCase()})`, "Select Team B");
  if (!els.previewTeamA.value && aRows.length) els.previewTeamA.value = aRows[0].team;
  if (!els.previewTeamB.value && bRows.length > 1) els.previewTeamB.value = bRows[1].team;
  if (els.previewTeamB.value === els.previewTeamA.value && bRows.length > 1) els.previewTeamB.value = bRows[1].team;
}

function populateConferenceFilter() {
  const conferences = [...new Set(state.matchupRows.map((row) => row.conference).filter(Boolean))].sort();
  setOptions(
    els.conferenceFilter,
    ["all", ...conferences],
    (value) => value,
    (value) => value === "all" ? "All conferences" : value
  );
  els.conferenceFilter.value = "all";
}

function populateBoardConferenceFilter() {
  const previous = els.boardConference.value;
  const conferences = [...new Set(state.boardRows.map((row) => row.conference).filter(Boolean))].sort();
  setOptions(
    els.boardConference,
    ["all", ...conferences],
    (value) => value,
    (value) => value === "all" ? "All conferences" : value
  );
  if (conferences.includes(previous)) els.boardConference.value = previous;
}

function setBoardStatus(message, kind = "") {
  els.boardState.textContent = message;
  els.boardState.classList.toggle("is-error", kind === "error");
  els.boardState.classList.toggle("is-empty", kind === "empty");
}

function boardRowsForFilters() {
  const tier = els.boardTier.value;
  const conference = els.boardConference.value;
  const query = els.boardSearch.value.trim().toLowerCase();
  const minimumGames = Number(els.boardMinGames.value || 0);
  const numericSorts = new Set(["adv_srs", "off_adv_srs", "def_adv_srs", "adv_sos", "raw_adv_margin_avg", "raw_score_margin_avg", "games", "yards_per_game", "yards_differential_per_game"]);
  const sortField = els.boardSort.value;
  const rows = state.boardRows.filter((row) => {
    const tierMatch = tier === "fbs"
      ? ["power", "g5"].includes(String(row.tier || "").toLowerCase())
      : String(row.tier || "").toLowerCase() === tier;
    const conferenceMatch = conference === "all" || row.conference === conference;
    const searchMatch = !query || String(row.team || "").toLowerCase().includes(query);
    const games = Number(row.games ?? row.pre_playoff_games ?? row.overall_games ?? 0);
    return tierMatch && conferenceMatch && searchMatch && games >= minimumGames;
  });
  return rows.sort((left, right) => {
    if (numericSorts.has(sortField)) {
      const difference = Number(right[sortField] ?? -Infinity) - Number(left[sortField] ?? -Infinity);
      if (difference) return difference;
    } else {
      const comparison = String(left[sortField] || "").localeCompare(String(right[sortField] || ""));
      if (comparison) return comparison;
    }
    return Number(left.adv_srs_rank || Infinity) - Number(right.adv_srs_rank || Infinity);
  });
}

async function fetchRankedRows(season) {
  if (!validSeason(season)) {
    throw new Error("No model season is available from the API.");
  }
  const data = await api(`/api/teams?season=${encodeURIComponent(season)}&tier=all`);
  return (data.team_options || []).filter((row) => row.adv_srs_rank !== null && row.adv_srs_rank !== undefined);
}

async function loadMatchupRows(season) {
  state.matchupRows = await fetchRankedRows(season);
  populateConferenceFilter();
  updateMatchupSelectors();
}

async function loadBoard(season) {
  setBoardStatus("Loading team board...");
  try {
    state.boardRows = await fetchRankedRows(season);
    populateBoardConferenceFilter();
    console.info("CFP Advantage board teams returned:", state.boardRows.length, "| season:", season);
    renderTeamBoard();
  } catch (error) {
    setBoardStatus(`Team board unavailable: ${error.message}`, "error");
    throw error;
  }
}

function metricTile(label, value) {
  return `<div class="comparison-item"><span>${label}</span><strong>${value}</strong></div>`;
}

async function renderMatchupPreview() {
  const teamA = els.previewTeamA.value;
  const teamB = els.previewTeamB.value;
  if (!teamA || !teamB || teamA === teamB) {
    els.matchupEmpty.textContent = "Choose two different ranked teams.";
    els.matchupEmpty.classList.remove("is-hidden");
    els.matchupCard.classList.add("is-hidden");
    return;
  }
  if (!validSeason(els.season.value)) {
    throw new Error("Select an available season before building a matchup.");
  }
  showStatus("Building Matchup...", "Loading team profiles and model outlook.", true);
  let row;
  try {
    const params = new URLSearchParams({ season: els.season.value, teamA: teamA, teamB: teamB });
    row = await api(`/api/matchup?${params.toString()}`);
  } catch (error) {
    showStatus("Preview Unavailable", error.message, false);
    throw error;
  }
  const a = row.team_a;
  const b = row.team_b;
  const accuracy = Number(row.confidence_bucket.historical_accuracy) * 100;
  els.matchupEmpty.classList.add("is-hidden");
  els.matchupCard.classList.remove("is-hidden");
  els.previewWinner.textContent = `${row.projected_winner} projected winner`;
  els.previewMargin.textContent = `${row.projected_winner} +${formatNumber(row.projected_margin_abs)}`;
  els.previewConfidence.textContent = `${row.confidence_bucket.label} margin range | ${accuracy.toFixed(1)}% historical winner rate`;
  els.previewInterpretation.textContent = `${row.projected_winner} leads the model outlook. ${row.context}`;
  els.previewComparison.innerHTML = [
    metricTile("ADV SRS Gap", signed(row.adv_srs_gap_team_a)),
    metricTile("OFF Strength", `${formatNumber(a.off_adv_srs)} vs ${formatNumber(b.off_adv_srs)}`),
    metricTile("DEF Strength", `${formatNumber(a.def_adv_srs)} vs ${formatNumber(b.def_adv_srs)}`),
    metricTile("Weak-Side Profile", `${formatNumber(a.weaker_side_srs)} vs ${formatNumber(b.weaker_side_srs)}`),
    metricTile("SOS Percentile", `${formatPercent(a.adv_sos_percentile)} vs ${formatPercent(b.adv_sos_percentile)}`),
    metricTile("Control Rate", `${formatPercent(a.control_rate_pct)} vs ${formatPercent(b.control_rate_pct)}`),
  ].join("");
  const playedGame = (row.games_played || [])[0];
  state.selectedActualGame = playedGame || null;
  if (playedGame) {
    const actualHomeMargin = Number(playedGame.home_points) - Number(playedGame.away_points);
    const teamAMargin = playedGame.home_team === teamA ? actualHomeMargin : -actualHomeMargin;
    els.actualGameLine.textContent = `${playedGame.away_team} ${playedGame.away_points} at ${playedGame.home_team} ${playedGame.home_points}`;
    els.actualGameComparison.textContent = `${teamA} actual margin: ${signed(teamAMargin)}. Model outlook margin: ${signed(row.projected_margin_team_a)}. Open the recap to see postgame control margin.`;
    els.actualMatchupPanel.classList.remove("is-hidden");
  } else {
    els.actualMatchupPanel.classList.add("is-hidden");
  }
  hideStatus();
}

function renderTeamBoard() {
  const rows = boardRowsForFilters();
  const filters = {
    season: els.boardSeason.value,
    tier: els.boardTier.value,
    conference: els.boardConference.value,
    search: els.boardSearch.value.trim(),
    minimumGames: Number(els.boardMinGames.value || 0),
    sort: els.boardSort.value,
  };
  console.info("CFP Advantage board filters:", filters, "| shown:", rows.length);
  els.boardSeasonLabel.textContent = `${els.boardSeason.value} qualified board | ${rows.length} teams shown`;
  els.teamBoardTable.innerHTML = "";
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>#${row.adv_srs_rank}</td>
      <td><strong>${row.team}</strong><small class="table-subtitle">${row.conference || row.tier || ""}</small></td>
      <td>${row.games ?? row.pre_playoff_games ?? row.overall_games ?? "-"}</td>
      <td>${formatNumber(row.adv_srs)}</td>
      <td>${formatNumber(row.off_adv_srs)}</td>
      <td>${formatNumber(row.def_adv_srs)}</td>
      <td>${formatNumber(row.weaker_side_srs)}</td>
      <td>${formatNumber(row.adv_sos)}</td>
      <td>${formatNumber(row.adv_sos_percentile)}%</td>
      <td>${formatNumber(row.raw_adv_margin_avg)}</td>
      <td>${formatNumber(row.raw_score_margin_avg)}</td>
      <td>${formatNumber(row.yards_per_game)}</td>
      <td>${formatNumber(row.yards_allowed_per_game)}</td>
      <td>${signed(row.yards_differential_per_game)}</td>
      <td>${formatNumber(row.control_rate_pct)}%</td>
      <td><span class="tag-text">${(row.title_signal_tags || "").split("|").slice(0, 2).join(" | ") || "-"}</span></td>
    `;
    els.teamBoardTable.appendChild(tr);
  });
  if (!rows.length) {
    setBoardStatus("No results match the selected filters.", "empty");
    els.teamBoardTable.innerHTML = '<tr><td colspan="16" class="empty">No qualified teams match these filters.</td></tr>';
  } else {
    setBoardStatus(`${rows.length} qualified teams displayed.`);
  }
}

async function loadSeasons() {
  const data = await api("/api/seasons");
  state.seasons = data.seasons || [];
  if (!state.seasons.length) {
    throw new Error("No model seasons are available from the API.");
  }
  setOptions(els.season, state.seasons, (season) => season, (season) => season);
  setOptions(els.boardSeason, state.seasons, (season) => season, (season) => season);
  setOptions(els.explorerSeason, state.seasons, (season) => season, (season) => season);
  const latest = String(state.seasons[state.seasons.length - 1] || "");
  els.season.value = latest;
  els.boardSeason.value = latest;
  els.explorerSeason.value = latest;
}

function explorerTeamLabel(team) {
  return team.abbr ? `${team.name} (${team.abbr})` : team.name;
}

async function loadExplorerTeams() {
  if (!validSeason(els.explorerSeason.value)) {
    throw new Error("No model season is available for the explorer.");
  }
  const params = new URLSearchParams({ season: els.explorerSeason.value, tier: els.explorerTier.value });
  const data = await api(`/api/teams?${params.toString()}`);
  state.explorerTeams = (data.team_options || [])
    .slice()
    .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));
  renderExplorerTeams();
}

function renderExplorerTeams() {
  const query = els.teamSearch.value.trim().toLowerCase();
  const rows = state.explorerTeams.filter((team) => (
    !query ||
    team.name.toLowerCase().includes(query) ||
    String(team.abbr || "").toLowerCase().includes(query)
  ));
  setOptions(els.team, rows, (team) => team.name, explorerTeamLabel, "All teams");
}

function recordMetric(label, value) {
  return `<div class="record-tile"><span>${label}</span><strong>${value || "-"}</strong></div>`;
}

function resultClass(result) {
  return result === "W" ? "result-win" : result === "L" ? "result-loss" : "";
}

function renderScheduleSections(rows) {
  const sections = [
    ["regular_season", "Regular Season"],
    ["conference_championship", "Conference Championship"],
    ["postseason", "Postseason"],
  ];
  els.scheduleSections.innerHTML = sections.map(([key, title]) => {
    const items = rows.filter((row) => row.schedule_section === key);
    if (!items.length) return "";
    const games = items.map((row) => `
      <article class="schedule-game">
        <div class="schedule-week">${row.display_week}</div>
        <div class="schedule-opponent">
          <strong>${row.is_home ? "vs" : "at"} ${row.opponent}</strong>
          <span>${row.date || ""}${row.is_neutral ? " | Neutral Site" : ""}${row.team_total_yards !== null && row.team_total_yards !== undefined ? ` | Yards ${row.team_total_yards}-${row.opponent_total_yards}` : ""}</span>
        </div>
        <div class="schedule-score ${resultClass(row.result_w_l)}">${row.result_w_l} ${row.team_score}-${row.opponent_score}</div>
        ${row.has_adv_recap ? `<button class="recap-link" type="button" data-game-id="${row.game_id}">View Recap</button>` : ""}
      </article>
    `).join("");
    return `<section class="schedule-group"><h3>${title}</h3>${games}</section>`;
  }).join("") || '<div class="empty-state compact">No games available for this view.</div>';
  els.scheduleSections.querySelectorAll(".recap-link").forEach((button) => {
    button.addEventListener("click", () => analyzeGame(button.dataset.gameId));
  });
}

async function loadExplorerSchedule() {
  if (!els.team.value) {
    els.teamHistoryEmpty.classList.remove("is-hidden");
    els.teamHistoryPanel.classList.add("is-hidden");
    return;
  }
  const season = els.explorerSeason.value;
  const team = els.team.value;
  if (!validSeason(season)) {
    throw new Error("No model season is available for the explorer.");
  }
  const [profile, schedule] = await Promise.all([
    api(`/api/team/${encodeURIComponent(season)}/${encodeURIComponent(team)}`),
    api(`/api/team/${encodeURIComponent(season)}/${encodeURIComponent(team)}/schedule?view=${encodeURIComponent(els.scheduleView.value)}`),
  ]);
  const record = profile.record || {};
  els.historyTeamName.textContent = `${team} | ${season}`;
  els.historyTeamContext.textContent = profile.intelligence
    ? `Official ADV SRS rank #${profile.intelligence.adv_srs_rank}. ${profile.intelligence.recommended_interpretation || ""}`
    : "Historical schedule record; no qualified ADV board profile is available for this team.";
  els.recordSummary.innerHTML = [
    recordMetric("Overall", record.overall_record),
    recordMetric("Regular", record.regular_record),
    recordMetric("Conference", record.conference_record),
    recordMetric("Nonconference", record.nonconference_record),
    recordMetric("Pre-Playoff", record.pre_playoff_record),
    recordMetric("Postseason", record.postseason_record),
  ].join("");
  renderScheduleSections(schedule.schedule || []);
  els.teamHistoryEmpty.classList.add("is-hidden");
  els.teamHistoryPanel.classList.remove("is-hidden");
}

function setMetric(element, value) {
  element.textContent = formatNumber(value);
  element.classList.toggle("positive", Number(value) > 0);
  element.classList.toggle("negative", Number(value) < 0);
}

function clearRecap() {
  state.hasRecap = false;
  els.recapEmpty.classList.remove("is-hidden");
  els.recapPanel.classList.add("is-hidden");
  els.recapYardsContext.classList.add("is-hidden");
}

function renderRecap(data) {
  els.recapPanel.innerHTML = renderGameRecapCard(data, true);
  els.recapPanel.classList.add("recap-card-host");
  state.hasRecap = true;
  els.recapEmpty.classList.add("is-hidden");
  els.recapPanel.classList.remove("is-hidden");
  setWorkspaceView("postgame");
}

function renderGameRecapCard(payload, compact = false) {
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
      ${renderModelMetricRecapCard(control, conversion)}
      ${renderRecapBoxScoreCard(game, yards, boxScore)}
    </article>
  `;
}

function renderModelMetricRecapCard(control, conversion = {}) {
  const homeConversion = conversion.home || {};
  const awayConversion = conversion.away || {};
  const rows = [
    ["Net ADV", signedDecimal(control.net_adv_home, 1), "Home perspective"],
    ["ADV Deserved Margin", decimal(control.adv_deserved_margin_home, 1), "Home perspective"],
    ["Scoreboard vs ADV Gap", signedDecimal(control.scoreboard_gap_home, 1), "Home perspective"],
    ["Home Control Rate (CR)", rate(homeConversion.game_control_rate), "Game-level control"],
    ["Away Control Rate (CR)", rate(awayConversion.game_control_rate), "Game-level control"],
    ["Home ADV Drive Conversion", rate(homeConversion.scoring_conversion_rate), "Control drives to points"],
    ["Away ADV Drive Conversion", rate(awayConversion.scoring_conversion_rate), "Control drives to points"],
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

function renderRecapBoxScoreCard(game, yards, boxScore = {}) {
  const away = boxScore.away || {};
  const home = boxScore.home || {};
  const rows = [
    ["Points", game.away_points, game.home_points],
    ["Total Yards", valueOrFallback(away.total_yards, yards.away_total_yards), valueOrFallback(home.total_yards, yards.home_total_yards)],
    ["Yards / Play", decimal(valueOrFallback(away.yards_per_play, yards.away_yards_per_play), 2), decimal(valueOrFallback(home.yards_per_play, yards.home_yards_per_play), 2)],
    ["Passing", `${whole(away.pass_completions)} / ${whole(away.pass_attempts)}, ${whole(away.pass_yards)} yds`, `${whole(home.pass_completions)} / ${whole(home.pass_attempts)}, ${whole(home.pass_yards)} yds`],
    ["Rushing", `${whole(away.rush_attempts)} att, ${whole(away.rush_yards)} yds`, `${whole(home.rush_attempts)} att, ${whole(home.rush_yards)} yds`],
    ["First Downs", away.first_downs, home.first_downs],
    ["3rd Down", conversionLine(away.third_down_conversions, away.third_down_attempts, away.third_down_rate), conversionLine(home.third_down_conversions, home.third_down_attempts, home.third_down_rate)],
    ["4th Down", conversionLine(away.fourth_down_conversions, away.fourth_down_attempts, away.fourth_down_rate), conversionLine(home.fourth_down_conversions, home.fourth_down_attempts, home.fourth_down_rate)],
    ["Red Zone", redZoneLine(away), redZoneLine(home)],
    ["Turnovers", away.turnovers, home.turnovers],
    ["Penalties", `${whole(away.penalties)} / ${whole(away.penalty_yards)} yds`, `${whole(home.penalties)} / ${whole(home.penalty_yards)} yds`],
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

function redZoneLine(stats) {
  return `${whole(stats.red_zone_scores)}/${whole(stats.red_zone_trips)} score | TD ${whole(stats.red_zone_tds)} | FG ${whole(stats.red_zone_fgs)}`;
}

function conversionLine(made, attempts, storedRate) {
  const madeNumber = numericOrNull(made);
  const attemptsNumber = numericOrNull(attempts);
  const pct = attemptsNumber ? (madeNumber || 0) / attemptsNumber : numericOrNull(storedRate);
  const pctText = pct === null ? "-" : `${(pct * 100).toFixed(1)}%`;
  return `${whole(madeNumber)} / ${whole(attemptsNumber)} (${pctText})`;
}

async function analyzeGame(gameId) {
  if (!gameId) return;
  showStatus("Building Control Recap...", "Analyzing the selected completed game.", true);
  try {
    const data = await api(`/api/game/${encodeURIComponent(gameId)}/recap`);
    renderRecap(data);
    hideStatus();
  } catch (error) {
    showStatus("Recap Unavailable", error.message, false);
  }
}

async function refreshProductSeason() {
  showStatus("Loading Team Intelligence...", "Refreshing qualified rankings and matchup options.", true);
  await loadMatchupRows(els.season.value);
  els.matchupEmpty.textContent = "Select two ranked teams to create a matchup preview.";
  els.matchupEmpty.classList.remove("is-hidden");
  els.matchupCard.classList.add("is-hidden");
  hideStatus();
}

async function boot() {
  console.info("CFP Advantage API base:", API_BASE);
  console.info("CFP Advantage environment:", APP_ENVIRONMENT, "| static fallback enabled:", USE_STATIC_FALLBACK);
  showStatus("Fetching Data...", "Preparing football intelligence views.", true);
  clearRecap();
  await loadSeasons();
  await loadMatchupRows(els.season.value);
  if (els.teamBoardViewTab && els.teamBoardView) await loadBoard(els.season.value);
  await loadProductGuides();
  hideStatus();
  setWorkspaceView("pregame");
}

async function openExplorer() {
  setWorkspaceView("explorer");
  if (state.explorerLoaded) return;
  showStatus("Opening Explorer...", "Preparing completed game selections.", true);
  try {
    await loadExplorerTeams();
    await loadExplorerSchedule();
    state.explorerLoaded = true;
    hideStatus();
  } catch (error) {
    showStatus("Explorer Unavailable", error.message, false);
  }
}

document.querySelectorAll(".info-button").forEach((button) => {
  button.addEventListener("click", () => openHelp(button.dataset.help, button));
});
els.helpClose.addEventListener("click", closeHelp);
els.helpOverlay.addEventListener("click", (event) => {
  if (event.target === els.helpOverlay) closeHelp();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeHelp();
});

els.pregameViewTab.addEventListener("click", () => setWorkspaceView("pregame"));
els.postgameViewTab.addEventListener("click", () => setWorkspaceView("postgame"));
if (els.teamBoardViewTab) els.teamBoardViewTab.addEventListener("click", () => setWorkspaceView("board"));
if (els.explorerViewTab) els.explorerViewTab.addEventListener("click", openExplorer);
if (els.metricsViewTab) els.metricsViewTab.addEventListener("click", () => setWorkspaceView("metrics"));
els.termsAcceptButton.addEventListener("click", acceptTerms);
els.season.addEventListener("change", refreshProductSeason);
[els.tierFilter, els.conferenceFilter, els.rankFilter].forEach((filter) => {
  filter.addEventListener("change", () => {
    updateMatchupSelectors();
  });
});
[els.boardConference, els.boardTier, els.boardSort].filter(Boolean).forEach((filter) => {
  filter.addEventListener("change", renderTeamBoard);
});
[els.boardSearch, els.boardMinGames].filter(Boolean).forEach((input) => {
  input.addEventListener("input", renderTeamBoard);
});
if (els.boardSeason) {
  els.boardSeason.addEventListener("change", () => {
    loadBoard(els.boardSeason.value).catch((error) => setBoardStatus(`Team board unavailable: ${error.message}`, "error"));
  });
}
[els.previewSearchA, els.previewSearchB].forEach((input) => input.addEventListener("input", updateMatchupSelectors));
els.previewButton.addEventListener("click", () => renderMatchupPreview().catch((error) => showStatus("Preview Unavailable", error.message, false)));
els.viewActualRecapButton.addEventListener("click", () => {
  if (state.selectedActualGame) analyzeGame(state.selectedActualGame.game_id);
});
if (els.explorerSeason) els.explorerSeason.addEventListener("change", async () => {
  els.teamSearch.value = "";
  await loadExplorerTeams();
  await loadExplorerSchedule();
});
if (els.explorerTier) els.explorerTier.addEventListener("change", async () => {
  els.teamSearch.value = "";
  await loadExplorerTeams();
  await loadExplorerSchedule();
});
if (els.teamSearch) els.teamSearch.addEventListener("input", () => {
  renderExplorerTeams();
});
if (els.team) els.team.addEventListener("change", loadExplorerSchedule);
if (els.scheduleView) els.scheduleView.addEventListener("change", loadExplorerSchedule);

if (DEVELOPER_MODE) {
  document.body.dataset.developerMode = "true";
}

boot().catch((error) => {
  const message = USE_STATIC_FALLBACK
    ? `API unavailable at ${API_BASE}: ${error.message}`
    : "Explorer unavailable - API connection failed.";
  showStatus("Data Unavailable", message, false);
});

const API_BASE = (
  (window.CFP_ADV_CONFIG && window.CFP_ADV_CONFIG.API_BASE_URL) ||
  window.CFP_API_BASE ||
  new URLSearchParams(window.location.search).get("api") ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

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
  boardRows: [],
  filteredRows: [],
  explorerTeams: [],
  games: [],
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
  teamBoardTable: $("teamBoardTable"),
  boardSeasonLabel: $("boardSeasonLabel"),
  helpOverlay: $("helpOverlay"),
  helpTitle: $("helpTitle"),
  helpBody: $("helpBody"),
  helpClose: $("helpCloseButton"),
};

function formatNumber(value) {
  return value === null || value === undefined || Number.isNaN(Number(value))
    ? "-"
    : Number(value).toFixed(2);
}

function signed(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(2)}`;
}

async function api(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || `Request failed: ${response.status}`);
  }
  return response.json();
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
    const active = key === view;
    button.classList.toggle("is-active", active);
    panel.classList.toggle("is-hidden", !active);
  });
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
  return state.boardRows.filter((row) => {
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
  const aRows = searchRows(state.filteredRows, els.previewSearchA.value);
  const bRows = searchRows(state.filteredRows, els.previewSearchB.value);
  setOptions(els.previewTeamA, aRows, (row) => row.team, (row) => `#${row.adv_srs_rank} ${row.team} (${row.tier.toUpperCase()})`, "Select Team A");
  setOptions(els.previewTeamB, bRows, (row) => row.team, (row) => `#${row.adv_srs_rank} ${row.team} (${row.tier.toUpperCase()})`, "Select Team B");
  if (!els.previewTeamA.value && aRows.length) els.previewTeamA.value = aRows[0].team;
  if (!els.previewTeamB.value && bRows.length > 1) els.previewTeamB.value = bRows[1].team;
  if (els.previewTeamB.value === els.previewTeamA.value && bRows.length > 1) els.previewTeamB.value = bRows[1].team;
}

function populateConferenceFilter() {
  const conferences = [...new Set(state.boardRows.map((row) => row.conference).filter(Boolean))].sort();
  setOptions(
    els.conferenceFilter,
    ["all", ...conferences],
    (value) => value,
    (value) => value === "all" ? "All conferences" : value
  );
  els.conferenceFilter.value = "all";
}

async function loadBoard(season) {
  const data = await api(`/api/product-a/team-board?season=${encodeURIComponent(season)}&limit=300`);
  state.boardRows = data.rows || [];
  populateConferenceFilter();
  updateMatchupSelectors();
  renderTeamBoard();
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
  const params = new URLSearchParams({ season: els.season.value, team_a: teamA, team_b: teamB });
  const row = await api(`/api/product-a/matchup-preview?${params.toString()}`);
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
    metricTile("SOS Percentile", `${formatNumber(a.adv_sos_percentile)}% vs ${formatNumber(b.adv_sos_percentile)}%`),
    metricTile("Control Rate", `${formatNumber(a.control_rate_pct)}% vs ${formatNumber(b.control_rate_pct)}%`),
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
}

function renderTeamBoard() {
  els.boardSeasonLabel.textContent = `${els.season.value} qualified board | ${state.filteredRows.length} teams shown`;
  els.teamBoardTable.innerHTML = "";
  state.filteredRows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>#${row.adv_srs_rank}</td>
      <td><strong>${row.team}</strong><small class="table-subtitle">${row.conference || row.tier || ""}</small></td>
      <td>${formatNumber(row.adv_srs)}</td>
      <td>${formatNumber(row.off_adv_srs)}</td>
      <td>${formatNumber(row.def_adv_srs)}</td>
      <td>${formatNumber(row.weaker_side_srs)}</td>
      <td>${formatNumber(row.adv_sos_percentile)}%</td>
      <td>${formatNumber(row.control_rate_pct)}%</td>
      <td><span class="tag-text">${(row.title_signal_tags || "").split("|").slice(0, 2).join(" | ") || "-"}</span></td>
    `;
    els.teamBoardTable.appendChild(tr);
  });
  if (!state.filteredRows.length) {
    els.teamBoardTable.innerHTML = '<tr><td colspan="9" class="empty">No qualified teams match these filters.</td></tr>';
  }
}

async function loadSeasons() {
  const data = await api("/api/product-a/team-board?limit=1");
  state.seasons = data.available_seasons || [];
  setOptions(els.season, state.seasons, (season) => season, (season) => season);
  setOptions(els.explorerSeason, state.seasons, (season) => season, (season) => season);
  const latest = String(state.seasons[state.seasons.length - 1] || "");
  els.season.value = latest;
  els.explorerSeason.value = latest;
}

function explorerTeamLabel(team) {
  return team.abbr ? `${team.name} (${team.abbr})` : team.name;
}

async function loadExplorerTeams() {
  const params = new URLSearchParams({ season: els.explorerSeason.value, tier: els.explorerTier.value });
  const data = await api(`/api/teams?${params.toString()}`);
  state.explorerTeams = data.team_options || [];
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
          <span>${row.date || ""}${row.is_neutral ? " | Neutral Site" : ""}</span>
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
}

function renderRecap(data) {
  const game = data.game;
  const recap = data.postgame_control;
  const awayAbbr = recap.away_abbr;
  const homeAbbr = recap.home_abbr;
  const awayTotal = Number(data.team_totals[awayAbbr] || 0);
  const homeTotal = Number(data.team_totals[homeAbbr] || 0);
  const netWinner = homeTotal >= awayTotal ? game.home_team : game.away_team;
  els.awayName.textContent = `${game.away_team} (${awayAbbr})`;
  els.homeName.textContent = `${game.home_team} (${homeAbbr})`;
  setMetric(els.awayAdv, awayTotal);
  setMetric(els.homeAdv, homeTotal);
  els.gameDate.textContent = `${game.date || "Unknown date"} | ${game.away_team} at ${game.home_team}`;
  els.advMargin.textContent = `${netWinner} ${signed(Math.abs(homeTotal - awayTotal))} ADV`;
  els.scoreLine.textContent = `${game.away_points}-${game.home_points} final score`;
  const actualWinnerMargin = recap.actual_winner === game.home_team ? recap.actual_margin_home : -recap.actual_margin_home;
  const deservedWinnerMargin = recap.adv_control_winner === game.home_team ? recap.adv_deserved_margin_home : -recap.adv_deserved_margin_home;
  setMetric(els.deservedMargin, deservedWinnerMargin);
  setMetric(els.actualMargin, actualWinnerMargin);
  setMetric(els.scoreboardGap, actualWinnerMargin - deservedWinnerMargin);
  els.projectionLine.textContent = recap.summary;
  state.hasRecap = true;
  els.recapEmpty.classList.add("is-hidden");
  els.recapPanel.classList.remove("is-hidden");
  setWorkspaceView("postgame");
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
  await loadBoard(els.season.value);
  els.matchupEmpty.textContent = "Select two ranked teams to create a matchup preview.";
  els.matchupEmpty.classList.remove("is-hidden");
  els.matchupCard.classList.add("is-hidden");
  hideStatus();
}

async function boot() {
  showStatus("Fetching Data...", "Preparing football intelligence views.", true);
  clearRecap();
  await loadSeasons();
  await loadBoard(els.season.value);
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
els.teamBoardViewTab.addEventListener("click", () => setWorkspaceView("board"));
els.explorerViewTab.addEventListener("click", openExplorer);
els.season.addEventListener("change", refreshProductSeason);
[els.tierFilter, els.conferenceFilter, els.rankFilter].forEach((filter) => {
  filter.addEventListener("change", () => {
    updateMatchupSelectors();
    renderTeamBoard();
  });
});
[els.previewSearchA, els.previewSearchB].forEach((input) => input.addEventListener("input", updateMatchupSelectors));
els.previewButton.addEventListener("click", () => renderMatchupPreview().catch((error) => showStatus("Preview Unavailable", error.message, false)));
els.viewActualRecapButton.addEventListener("click", () => {
  if (state.selectedActualGame) analyzeGame(state.selectedActualGame.game_id);
});
els.explorerSeason.addEventListener("change", async () => {
  els.teamSearch.value = "";
  await loadExplorerTeams();
  await loadExplorerSchedule();
});
els.explorerTier.addEventListener("change", async () => {
  els.teamSearch.value = "";
  await loadExplorerTeams();
  await loadExplorerSchedule();
});
els.teamSearch.addEventListener("input", () => {
  renderExplorerTeams();
});
els.team.addEventListener("change", loadExplorerSchedule);
els.scheduleView.addEventListener("change", loadExplorerSchedule);

if (DEVELOPER_MODE) {
  document.body.dataset.developerMode = "true";
}

boot().catch((error) => {
  showStatus("Data Unavailable", `API unavailable at ${API_BASE}: ${error.message}`, false);
});

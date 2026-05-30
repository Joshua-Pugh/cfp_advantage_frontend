const CONFIG = window.CFP_ADV_CONFIG || {};
const API_BASE = (CONFIG.API_BASE_URL || "https://cfp-advantage-model-1.onrender.com").replace(/\/$/, "");
const TERMS_ACCEPTED_KEY = "cfp_adv_terms_accepted";
const TERMS_VERSION_KEY = "cfp_adv_terms_version";

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

function setStatus(message, tone = "") {
  const el = $("pageStatus");
  if (!el) return;
  el.textContent = message;
  el.className = `page-status ${tone}`.trim();
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
      <p class="eyebrow">${metric.group || "Metric"}</p>
      <h3>${metric.name}</h3>
      <p>${metric.plain_english || metric.note || ""}</p>
      <small>${metric.use_for || metric.status || ""}</small>
    </article>
  `).join("");
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
  const payload = await api(`/api/product-a/matchup-preview?season=${encodeURIComponent(season)}&team_a=${encodeURIComponent(teamA)}&team_b=${encodeURIComponent(teamB)}`);
  const matchup = payload.matchup || payload;
  $("historicalResult").innerHTML = `
    <div class="insight-panel">
      <p class="eyebrow">${season} Historical Matchup</p>
      <h2>${teamA} vs ${teamB}</h2>
      <div class="summary-grid">
        <div><span>Model Lean</span><strong>${matchup.projected_winner || matchup.favorite || "-"}</strong></div>
        <div><span>ADV Expected Margin</span><strong>${formatNumber(matchup.expected_margin ?? matchup.projected_margin, 1)}</strong></div>
        <div><span>Confidence</span><strong>${matchup.winner_confidence_bucket || matchup.confidence || "-"}</strong></div>
      </div>
      <p class="interpretation">${matchup.interpretation || "This page uses the Product A pregame matchup endpoint only. No postgame recap fields are used to build the preview."}</p>
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
    localStorage.setItem(TERMS_ACCEPTED_KEY, "true");
    localStorage.setItem(TERMS_VERSION_KEY, legal.terms_version || "");
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

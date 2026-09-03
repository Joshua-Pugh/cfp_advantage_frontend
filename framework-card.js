(() => {
  const config = window.CFP_ADV_CONFIG || {};
  const apiBase = (config.API_BASE_URL || "https://cfp-advantage-model-1.onrender.com").replace(/\/$/, "");
  const $ = (id) => document.getElementById(id);
  let logos = {};

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  async function getJson(path) {
    const response = await fetch(`${apiBase}${path}`);
    if (!response.ok) throw new Error(`API request failed (${response.status})`);
    return response.json();
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function decimal(value, digits = 1) {
    const parsed = number(value);
    return parsed === null ? "-" : parsed.toFixed(digits);
  }

  function percent(value, digits = 1) {
    const parsed = number(value);
    if (parsed === null) return "-";
    const normalized = Math.abs(parsed) <= 1.5 ? parsed * 100 : parsed;
    return `${normalized.toFixed(digits)}%`;
  }

  function percentile(value) {
    const parsed = number(value);
    if (parsed === null) return "No percentile";
    const rounded = Math.round(parsed);
    const tens = rounded % 100;
    const suffix = tens >= 11 && tens <= 13
      ? "th"
      : ({ 1: "st", 2: "nd", 3: "rd" }[rounded % 10] || "th");
    return `${rounded}${suffix} percentile`;
  }

  function initials(team) {
    return String(team || "-").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  }

  function logoMarkup(team, className = "framework-team-logo") {
    const url = logos[String(team || "").trim().toLowerCase()];
    if (!url) return `<span class="${className} is-fallback">${escapeHtml(initials(team))}</span>`;
    return `<span class="${className} has-logo"><img src="${escapeHtml(url)}" alt="${escapeHtml(team)} logo" onerror="this.parentElement.classList.remove('has-logo');this.parentElement.classList.add('is-fallback');this.parentElement.textContent='${escapeHtml(initials(team))}'"></span>`;
  }

  function contextualValues(intel) {
    const nested = intel.contextual_profile_json;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) return { ...intel, ...nested };
    if (typeof nested === "string" && nested.trim()) {
      try {
        const parsed = JSON.parse(nested);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return { ...intel, ...parsed };
      } catch (error) {
        console.warn("Framework profile JSON could not be parsed", error);
      }
    }
    return { ...intel };
  }

  function metric(label, value, note = "") {
    return `<div class="framework-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${note ? `<small>${escapeHtml(note)}</small>` : ""}</div>`;
  }

  function scoredGames(games) {
    return games.filter((game) => number(game.team_score) !== null && number(game.opponent_score) !== null);
  }

  function average(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }

  function renderCard(season, team, profile, games) {
    const intel = profile.intelligence || {};
    const stats = profile.comparison_stats || {};
    const drive = profile.drive_conversion || profile.drive_conversion_context || {};
    const view = contextualValues(intel);
    const finals = scoredGames(games);
    const pointsFor = average(finals.map((game) => Number(game.team_score)));
    const pointsAgainst = average(finals.map((game) => Number(game.opponent_score)));
    const pressure = view.control_production_rate;
    const pressureAllowed = view.defensive_control_production_allowed;
    const scoreboardGap = view.team_season_dce ?? view.dce ?? view.drive_conversion_efficiency;
    const identity = view.contextual_profile_label || "Contextual Football Profile";
    const summary = view.contextual_profile_summary || "A complete view of how this team creates, converts, and denies meaningful football control.";

    $("frameworkCardMount").innerHTML = `
      <article class="adv-framework-card" aria-label="${escapeHtml(`${team} ${season} Control Framework card`)}">
        <header class="adv-framework-header">
          <div class="adv-framework-brand"><img src="assets/adv-logo.png?v=1" alt=""><span>CFP Advantage</span></div>
          <div class="adv-framework-title"><span>${escapeHtml(`${season} Contextual Football Profile`)}</span><h2>${escapeHtml(identity)}</h2><p>${escapeHtml(summary)}</p></div>
          <div class="adv-framework-team">${logoMarkup(team)}<strong>${escapeHtml(team)}</strong></div>
        </header>

        <section class="adv-framework-section foundation-section">
          <div class="framework-section-heading"><b>1</b><div><h3>Control Foundation</h3><p>Can this team create control and deny control?</p></div></div>
          <div class="framework-section-grid foundation-grid">
            ${metric("Control Creation", view.control_creation_tier || "-", percentile(view.control_creation_percentile))}
            ${metric("Control Rate", percent(view.CR ?? view.cr ?? view.control_rate ?? view.control_rate_pct), "Share of possessions producing useful control")}
            ${metric("Control Denial", view.control_denial_tier || "-", percentile(view.control_denial_percentile))}
            ${metric("Foundation Grade", view.control_foundation_tier || "-", percentile(view.control_foundation_percentile))}
          </div>
        </section>

        <section class="adv-framework-section pressure-section">
          <div class="framework-section-heading"><b>2</b><div><h3>Scoring Pressure</h3><p>How much sustainable scoring pressure does this team create or allow?</p></div></div>
          <div class="framework-section-grid">
            ${metric("Pressure Per Offensive Drive", decimal(pressure, 2), [view.control_production_tier, percentile(view.control_production_percentile)].filter(Boolean).join(" | "))}
            ${metric("Pressure Allowed Per Defensive Drive", decimal(pressureAllowed, 2), [view.defensive_control_production_allowed_tier, percentile(view.defensive_control_production_allowed_percentile), "Lower is better"].filter(Boolean).join(" | "))}
            ${metric("Offensive Drives", decimal(view.offensive_drives ?? drive.drives, 0), "Observed possessions")}
          </div>
        </section>

        <section class="adv-framework-section conversion-section">
          <div class="framework-section-heading"><b>3</b><div><h3>Conversion Profile</h3><p>What happens once control exists?</p></div></div>
          <div class="framework-section-grid framework-five-grid">
            ${metric("Control Finish Rate", percent(view.control_finish_rate ?? drive.scoring_conversion_rate), percentile(view.control_finish_percentile))}
            ${metric("Control Drive Shutout Rate", percent(view.finishing_resistance_rate), view.finishing_resistance_tier || "Lower is better")}
            ${metric("Points Per Control Drive", decimal(drive.points_per_control_drive, 2), "Output once control exists")}
            ${metric("TD Control Conversion", percent(drive.td_conversion_rate), "Touchdown finish")}
            ${metric("Finish Waste", percent(view.finish_waste_rate), "Control drives producing no points")}
          </div>
        </section>

        <section class="adv-framework-section compare-section">
          <div class="framework-section-heading"><b>4</b><div><h3>Pressure vs Scoreboard</h3><p>Underlying repeatable pressure compared with actual scoring output.</p></div></div>
          <div class="framework-compare-grid">
            <div><h4>Underlying Pressure</h4>${metric("Offensive Pressure", decimal(pressure, 2))}${metric("Pressure Allowed", decimal(pressureAllowed, 2))}${metric("Creation Waste", percent(view.creation_waste_rate))}</div>
            <span class="framework-versus">VS</span>
            <div><h4>Scoreboard Output</h4>${metric("Points Per Game", decimal(pointsFor ?? stats.points_per_game, 1))}${metric("Points Allowed Per Game", decimal(pointsAgainst ?? stats.points_allowed_per_game, 1))}${metric("Points Per Drive", decimal(stats.points_per_drive, 2))}</div>
          </div>
        </section>

        <section class="adv-framework-section outcome-section">
          <div class="framework-section-heading"><b>5</b><div><h3>Outcome & Context</h3><p>How do the underlying football traits show up in results?</p></div></div>
          <div class="framework-section-grid framework-six-grid">
            ${metric("ADV SRS", decimal(view.adv_srs, 1), "Opponent-adjusted strength")}
            ${metric("ADV Rank", view.adv_srs_rank ? `#${view.adv_srs_rank}` : "-")}
            ${metric("Schedule Strength", percentile(view.adv_sos_percentile), decimal(view.adv_sos, 1))}
            ${metric("Recent Form", view.recent_form_label || view.trajectory_bucket || "Not enough games")}
            ${metric("Talent Yield", view.tyi_label || "-", decimal(view.talent_yield_index, 2))}
            ${metric("Scoreboard Control Gap", decimal(scoreboardGap, 2), "Actual margin minus underlying control")}
          </div>
        </section>

        <footer class="adv-framework-footer"><span>College Football Intelligence</span><span>Evidence-Based Analysis</span><strong>Control What Matters</strong></footer>
      </article>
    `;
  }

  async function populateTeams(preferredTeam = "") {
    const season = $("frameworkSeason").value;
    const board = await getJson(`/api/product-a/team-board?season=${encodeURIComponent(season)}&limit=300`);
    const teams = (board.teams || board.rows || []).filter((row) => row.team).sort((a, b) => String(a.team).localeCompare(String(b.team)));
    $("frameworkTeam").innerHTML = teams.map((row) => `<option value="${escapeHtml(row.team)}">${escapeHtml(row.team)}</option>`).join("");
    if (preferredTeam && teams.some((row) => row.team === preferredTeam)) $("frameworkTeam").value = preferredTeam;
    else if (teams.length) $("frameworkTeam").value = teams[0].team;
  }

  async function loadCard() {
    const season = $("frameworkSeason").value;
    const team = $("frameworkTeam").value;
    if (!season || !team) return;
    $("frameworkCardStatus").textContent = "Building framework card...";
    try {
      const [profile, schedule] = await Promise.all([
        getJson(`/api/team/${encodeURIComponent(season)}/${encodeURIComponent(team)}`),
        getJson(`/api/team/${encodeURIComponent(season)}/${encodeURIComponent(team)}/schedule?view=full`),
      ]);
      renderCard(season, team, profile, Array.isArray(schedule.schedule) ? schedule.schedule : []);
      $("frameworkCardStatus").textContent = "Framework card ready.";
      const url = new URL(window.location.href);
      url.searchParams.set("season", season);
      url.searchParams.set("team", team);
      window.history.replaceState({}, "", url);
    } catch (error) {
      $("frameworkCardStatus").textContent = `Framework card unavailable: ${error.message}`;
    }
  }

  async function boot() {
    const params = new URLSearchParams(window.location.search);
    const preferredSeason = params.get("season") || "";
    const preferredTeam = params.get("team") || "";
    try {
      const [seasonsPayload, logoPayload] = await Promise.all([
        getJson("/api/seasons"),
        fetch("team-logos.json?v=4.0.72").then((response) => response.ok ? response.json() : { teams: {} }),
      ]);
      logos = logoPayload.teams || {};
      const seasons = seasonsPayload.seasons || [];
      $("frameworkSeason").innerHTML = seasons.map((season) => `<option value="${season}">${season}</option>`).join("");
      $("frameworkSeason").value = seasons.map(String).includes(preferredSeason) ? preferredSeason : String(seasons[0] || "");
      await populateTeams(preferredTeam);
      await loadCard();
      $("frameworkSeason").addEventListener("change", async () => { await populateTeams(); await loadCard(); });
      $("loadFrameworkCard").addEventListener("click", loadCard);
      $("printFrameworkCard").addEventListener("click", () => window.print());
    } catch (error) {
      $("frameworkCardStatus").textContent = `Framework card unavailable: ${error.message}`;
    }
  }

  boot();
})();

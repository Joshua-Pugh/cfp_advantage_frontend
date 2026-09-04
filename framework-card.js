(() => {
  const config = window.CFP_ADV_CONFIG || {};
  const apiBase = (config.API_BASE_URL || "https://cfp-advantage-model-1.onrender.com").replace(/\/$/, "");
  const $ = (id) => document.getElementById(id);
  const TEAM_DISPLAY_NAMES = {
    "air force": "Air Force Falcons",
    "alabama": "Alabama Crimson Tide",
    "arizona": "Arizona Wildcats",
    "arizona state": "Arizona State Sun Devils",
    "arkansas": "Arkansas Razorbacks",
    "arkansas state": "Arkansas State Red Wolves",
    "army": "Army Black Knights",
    "auburn": "Auburn Tigers",
    "baylor": "Baylor Bears",
    "boise state": "Boise State Broncos",
    "boston college": "Boston College Eagles",
    "brigham young": "BYU Cougars",
    "byu": "BYU Cougars",
    "buffalo": "Buffalo Bulls",
    "cal": "California Golden Bears",
    "california": "California Golden Bears",
    "clemson": "Clemson Tigers",
    "colorado": "Colorado Buffaloes",
    "duke": "Duke Blue Devils",
    "florida": "Florida Gators",
    "florida state": "Florida State Seminoles",
    "georgia": "Georgia Bulldogs",
    "georgia tech": "Georgia Tech Yellow Jackets",
    "illinois": "Illinois Fighting Illini",
    "indiana": "Indiana Hoosiers",
    "iowa": "Iowa Hawkeyes",
    "iowa state": "Iowa State Cyclones",
    "kansas": "Kansas Jayhawks",
    "kansas state": "Kansas State Wildcats",
    "kentucky": "Kentucky Wildcats",
    "louisville": "Louisville Cardinals",
    "lsu": "LSU Tigers",
    "miami": "Miami Hurricanes",
    "michigan": "Michigan Wolverines",
    "michigan state": "Michigan State Spartans",
    "minnesota": "Minnesota Golden Gophers",
    "mississippi": "Ole Miss Rebels",
    "mississippi state": "Mississippi State Bulldogs",
    "missouri": "Missouri Tigers",
    "nc state": "NC State Wolfpack",
    "nebraska": "Nebraska Cornhuskers",
    "north carolina": "North Carolina Tar Heels",
    "northwestern": "Northwestern Wildcats",
    "notre dame": "Notre Dame Fighting Irish",
    "ohio state": "Ohio State Buckeyes",
    "oklahoma": "Oklahoma Sooners",
    "oklahoma state": "Oklahoma State Cowboys",
    "ole miss": "Ole Miss Rebels",
    "oregon": "Oregon Ducks",
    "oregon state": "Oregon State Beavers",
    "penn state": "Penn State Nittany Lions",
    "pittsburgh": "Pittsburgh Panthers",
    "rutgers": "Rutgers Scarlet Knights",
    "smu": "SMU Mustangs",
    "south carolina": "South Carolina Gamecocks",
    "stanford": "Stanford Cardinal",
    "syracuse": "Syracuse Orange",
    "tcu": "TCU Horned Frogs",
    "tennessee": "Tennessee Volunteers",
    "texas": "Texas Longhorns",
    "texas a&m": "Texas A&M Aggies",
    "texas tech": "Texas Tech Red Raiders",
    "tulane": "Tulane Green Wave",
    "ucla": "UCLA Bruins",
    "usc": "USC Trojans",
    "utah": "Utah Utes",
    "vanderbilt": "Vanderbilt Commodores",
    "virginia": "Virginia Cavaliers",
    "virginia tech": "Virginia Tech Hokies",
    "wake forest": "Wake Forest Demon Deacons",
    "washington": "Washington Huskies",
    "washington state": "Washington State Cougars",
    "west virginia": "West Virginia Mountaineers",
    "wisconsin": "Wisconsin Badgers",
  };

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

  function displayTeamName(team) {
    const name = String(team || "").trim();
    return TEAM_DISPLAY_NAMES[name.toLowerCase()] || name;
  }

  function dataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("A team logo could not be prepared for download"));
      reader.readAsDataURL(blob);
    });
  }

  async function inlineCardImages(card) {
    const originals = [];
    for (const image of card.querySelectorAll("img")) {
      const source = image.currentSrc || image.src;
      if (!source || new URL(source, window.location.href).origin === window.location.origin) continue;
      const response = await fetch(`${apiBase}/api/assets/team-logo?url=${encodeURIComponent(source)}`);
      if (!response.ok) throw new Error("The team logo could not be included in the PNG");
      originals.push([image, image.src]);
      image.src = await dataUrl(await response.blob());
      if (image.decode) await image.decode().catch(() => undefined);
    }
    return () => originals.forEach(([image, source]) => { image.src = source; });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function canvasBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The PNG could not be created")), "image/png");
    });
  }

  function filenamePart(value) {
    return String(value || "team").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function downloadFrameworkCard() {
    const button = $("downloadFrameworkCard");
    const card = document.querySelector(".adv-framework-card");
    if (!card || typeof window.html2canvas !== "function") {
      $("frameworkCardStatus").textContent = "PNG download is not available yet.";
      return;
    }
    button.disabled = true;
    button.textContent = "Preparing PNG...";
    $("frameworkCardStatus").textContent = "Preparing your PNG download...";
    let restoreImages = () => undefined;
    try {
      restoreImages = await inlineCardImages(card);
      const canvas = await window.html2canvas(card, {
        backgroundColor: "#101820",
        logging: false,
        scale: 2,
        useCORS: false,
        windowWidth: 1440,
        onclone: (documentClone) => {
          const clonedCard = documentClone.querySelector(".adv-framework-card");
          if (clonedCard) clonedCard.style.width = "1400px";
        },
      });
      const team = $("frameworkTeam").value;
      const season = $("frameworkSeason").value;
      downloadBlob(await canvasBlob(canvas), `cfp-advantage-${season}-${filenamePart(team)}-framework.png`);
      $("frameworkCardStatus").textContent = "PNG downloaded.";
    } catch (error) {
      console.error("Framework PNG download failed", error);
      $("frameworkCardStatus").textContent = `PNG download failed: ${error.message}`;
    } finally {
      restoreImages();
      button.disabled = false;
      button.textContent = "Download PNG";
    }
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
    const displayName = displayTeamName(team);
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
      <article class="adv-framework-card" aria-label="${escapeHtml(`${displayName} ${season} Control Framework card`)}">
        <header class="adv-framework-header">
          <div class="adv-framework-brand"><img src="assets/adv-logo.png?v=1" alt=""><span>CFP Advantage</span></div>
          <div class="adv-framework-title"><span>${escapeHtml(`${season} Contextual Football Profile`)}</span><h2>${escapeHtml(identity)}</h2><p>${escapeHtml(summary)}</p></div>
          <div class="adv-framework-team"><strong>${escapeHtml(displayName)}</strong></div>
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
      const seasonsPayload = await getJson("/api/seasons");
      const seasons = seasonsPayload.seasons || [];
      $("frameworkSeason").innerHTML = seasons.map((season) => `<option value="${season}">${season}</option>`).join("");
      $("frameworkSeason").value = seasons.map(String).includes(preferredSeason) ? preferredSeason : String(seasons[0] || "");
      await populateTeams(preferredTeam);
      await loadCard();
      $("frameworkSeason").addEventListener("change", async () => { await populateTeams(); await loadCard(); });
      $("loadFrameworkCard").addEventListener("click", loadCard);
      $("downloadFrameworkCard").addEventListener("click", downloadFrameworkCard);
    } catch (error) {
      $("frameworkCardStatus").textContent = `Framework card unavailable: ${error.message}`;
    }
  }

  boot();
})();

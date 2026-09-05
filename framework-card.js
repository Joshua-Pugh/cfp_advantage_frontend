(() => {
  const config = window.CFP_ADV_CONFIG || {};
  const isLocalHost = ["127.0.0.1", "localhost"].includes(window.location.hostname);
  const apiBase = (isLocalHost ? "http://127.0.0.1:8000" : (config.API_BASE_URL || "https://cfp-advantage-model-1.onrender.com")).replace(/\/$/, "");
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

  function ordinal(value) {
    const rounded = Math.round(Number(value));
    const mod100 = rounded % 100;
    const suffix = mod100 >= 11 && mod100 <= 13
      ? "th"
      : ({ 1: "st", 2: "nd", 3: "rd" }[rounded % 10] || "th");
    return `${rounded}${suffix}`;
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

  function traitDefinitions(view, reference) {
    const benchmarks = reference.traits || {};
    return [
      ["control_creation_percentile", "Create control", "Control Creation", view.control_creation_rate, view.control_creation_tier, "percent"],
      ["control_denial_percentile", "Deny control", "Control Denial", view.control_denial_rate, view.control_denial_tier, "percent"],
      ["control_finish_percentile", "Finish control", "Finishing Control", view.control_finish_rate, view.control_finish_tier, "percent"],
      ["finishing_resistance_percentile", "Resist opponent finish", "Finishing Resistance", view.finishing_resistance_rate, view.finishing_resistance_tier, "percent"],
      ["control_production_percentile", "Create scoring pressure", "Scoring Pressure", view.control_production_rate, view.control_production_tier, "decimal"],
      ["defensive_control_production_allowed_percentile", "Suppress scoring pressure", "Pressure Suppression", view.defensive_control_production_allowed, view.defensive_control_production_allowed_tier, "decimal"],
    ].map(([key, label, formalLabel, raw, tier, format]) => {
      const benchmark = benchmarks[key] || {};
      const value = number(view[key]);
      return {
        key,
        label,
        formalLabel,
        percentile: value,
        raw: format === "percent" ? percent(raw) : decimal(raw, 2),
        tier: tier || "Not graded",
        floor: number(benchmark.floor_p20),
        median: number(benchmark.median),
        translation: (reference.translations || {})[key] || "Relationship context is not available for this profile.",
      };
    });
  }

  function profileDiagnosis(strongest, limiting) {
    if (!strongest || !limiting) {
      return "A possession-level view of how this team creates, converts, and denies meaningful control.";
    }
    if (strongest.key === "control_finish_percentile" && limiting.key === "finishing_resistance_percentile") {
      return "Wins through strong drive finishing, but struggles to keep opponents from doing the same.";
    }
    const strength = {
      control_creation_percentile: "Creates meaningful offensive control consistently",
      control_denial_percentile: "Prevents opponents from establishing meaningful control",
      control_finish_percentile: "Wins through strong drive finishing",
      finishing_resistance_percentile: "Keeps opponents from finishing established control",
      control_production_percentile: "Creates sustainable scoring pressure",
      defensive_control_production_allowed_percentile: "Suppresses opponent scoring pressure",
    }[strongest.key];
    const vulnerability = {
      control_creation_percentile: "struggles to create meaningful control consistently",
      control_denial_percentile: "allows opponents to establish control too often",
      control_finish_percentile: "leaves too much established control unfinished",
      finishing_resistance_percentile: "struggles to stop opponents from finishing established control",
      control_production_percentile: "does not create enough sustainable scoring pressure",
      defensive_control_production_allowed_percentile: "allows opponents to sustain too much scoring pressure",
    }[limiting.key];
    return `${strength || `Leans on ${strongest.formalLabel.toLowerCase()}`}, but ${vulnerability || `is limited by ${limiting.formalLabel.toLowerCase()}`}.`;
  }

  function traitBar(trait) {
    const value = trait.percentile;
    const width = value === null ? 0 : Math.max(0, Math.min(100, value));
    const clears = value !== null && trait.floor !== null && value >= trait.floor;
    return `
      <div class="framework-trait ${clears ? "clears-standard" : ""}">
        <div class="framework-trait-copy"><strong>${escapeHtml(trait.label)}</strong><span>${escapeHtml(trait.raw)} · ${escapeHtml(trait.tier)}</span></div>
        <div class="framework-trait-score"><b>${value === null ? "-" : Math.round(value)}</b><span>percentile</span></div>
        <div class="framework-trait-track" aria-hidden="true"><i style="width:${width}%"></i>${trait.floor !== null ? `<em style="left:${trait.floor}%"></em>` : ""}</div>
      </div>`;
  }

  function relationshipPanel(trait, team, isConstraint = false) {
    if (!trait) return "";
    const heading = isConstraint
      ? `${trait.formalLabel} · ${team}: ${ordinal(trait.percentile)} percentile`
      : `${trait.formalLabel} · ${ordinal(trait.percentile)} percentile`;
    return `
      <div class="framework-relationship">
        <span>${escapeHtml(`What strong ${trait.formalLabel} looks like`)}</span>
        <h4>${escapeHtml(heading)}</h4>
        <p>${escapeHtml(trait.translation)}</p>
        <small>Population relationship, not a formula input or causal claim.</small>
      </div>`;
  }

  function scoredGames(games) {
    return games.filter((game) => number(game.team_score) !== null && number(game.opponent_score) !== null);
  }

  function average(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }

  function renderCard(season, team, profile, games, reference = {}) {
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
    const traits = traitDefinitions(view, reference).filter((trait) => trait.percentile !== null);
    const strongest = traits.length ? [...traits].sort((a, b) => b.percentile - a.percentile)[0] : null;
    const limiting = traits.length ? [...traits].sort((a, b) => a.percentile - b.percentile)[0] : null;
    const clears = traits.filter((trait) => trait.floor !== null && trait.percentile >= trait.floor).length;
    const pressureDifferential = number(pressure) !== null && number(pressureAllowed) !== null ? number(pressure) - number(pressureAllowed) : null;
    const scoreboardMargin = pointsFor !== null && pointsAgainst !== null ? pointsFor - pointsAgainst : null;
    const diagnosis = profileDiagnosis(strongest, limiting);
    const titleLabel = number(view.adv_srs_rank) === 1 ? "ADV Championship Favorite" : `#${view.adv_srs_rank || "-"} ADV Strength`;

    $("frameworkCardMount").innerHTML = `
      <article class="adv-framework-card" aria-label="${escapeHtml(`${displayName} ${season} Control Framework card`)}">
        <header class="adv-framework-header">
          <div class="adv-framework-brand"><img src="assets/adv-logo.png?v=4.0.78" alt=""><span>CFP Advantage</span></div>
          <div class="adv-framework-title"><span>${escapeHtml(`${season} Contextual Football Profile`)}</span><h2>${escapeHtml(identity)}</h2><p>${escapeHtml(diagnosis)}</p></div>
          <div class="adv-framework-team"><strong>${escapeHtml(displayName)}</strong></div>
        </header>

        <section class="framework-diagnosis-band">
          <div><span>Primary Strength</span><strong>${escapeHtml(strongest ? strongest.formalLabel : "Not enough data")}</strong><small>${strongest ? percentile(strongest.percentile) : "Profile unavailable"}</small></div>
          <div><span>Primary Vulnerability</span><strong>${escapeHtml(limiting ? limiting.formalLabel : "Not enough data")}</strong><small>${limiting ? percentile(limiting.percentile) : "Profile unavailable"}</small></div>
          <div><span>Overall ADV Profile</span><strong>${escapeHtml(titleLabel)}</strong><small>${escapeHtml(`ADV SRS ${decimal(view.adv_srs, 1)}`)}</small></div>
        </section>

        <section class="adv-framework-section framework-shape-section">
          <div class="framework-section-heading"><b>1</b><div><h3>Six-Trait Team Shape</h3><p>The full control path, shown on one comparable percentile scale.</p></div></div>
          <div class="framework-trait-grid">
            ${traits.map(traitBar).join("")}
          </div>
        </section>

        <section class="adv-framework-section">
          <div class="framework-section-heading"><b>2</b><div><h3>Football Translation</h3><p>What the defining strength and weakness tend to look like in familiar statistics.</p></div></div>
          <div class="framework-relationship-grid">
            ${relationshipPanel(strongest, displayName)}
            ${relationshipPanel(limiting, displayName, true)}
          </div>
        </section>

        <section class="adv-framework-section framework-standard-section">
          <div class="framework-section-heading"><b>3</b><div><h3>Championship Profile Comparison</h3><p>Frozen 2016–2025 comparison. This does not change the model.</p></div></div>
          <div class="framework-standard-read">
            <strong>${clears} / ${traits.length}</strong>
            <div><b>championship-profile thresholds cleared</b><p>Gold markers show the 20th-percentile floor among 2016–2025 national champions. Profile comparison only, not championship odds.</p></div>
          </div>
        </section>

        <section class="adv-framework-section">
          <div class="framework-section-heading"><b>4</b><div><h3>Pressure vs Scoreboard</h3><p>Is actual scoring running ahead of or behind the underlying control profile?</p></div></div>
          <div class="framework-reality-grid">
            ${metric("Scoring Pressure Differential", decimal(pressureDifferential, 2), `${decimal(pressure, 2)} created · ${decimal(pressureAllowed, 2)} allowed`)}
            ${metric("Average Scoring Margin", decimal(scoreboardMargin, 1), `${decimal(pointsFor ?? stats.points_per_game, 1)} scored · ${decimal(pointsAgainst ?? stats.points_allowed_per_game, 1)} allowed`)}
            ${metric("Scoreboard vs Control", decimal(scoreboardGap, 2), "Actual margin relative to underlying control")}
            ${metric("Points Per Control Drive", decimal(view.points_per_control_drive ?? drive.points_per_control_drive, 2), "Scoring output when control is established")}
          </div>
        </section>

        <div class="framework-context-footer">
          <span><b>ADV SRS</b>${decimal(view.adv_srs, 1)}</span>
          <span><b>ADV Rank</b>${view.adv_srs_rank ? `#${view.adv_srs_rank}` : "-"}</span>
          <span><b>Schedule Strength</b>${percentile(view.adv_sos_percentile)}</span>
          <span><b>Sample</b>${finals.length || view.games || "-"} games · ${decimal(view.offensive_drives ?? drive.drives, 0)} drives</span>
          <span><b>Reference</b>${escapeHtml(reference.version || "Unavailable")}</span>
        </div>

        <footer class="adv-framework-footer"><span>College Football Intelligence</span><span>Evidence-Based Analysis</span><strong>Control What Matters</strong><small>Descriptive team profile · not a game or title probability</small></footer>
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
      const [profile, schedule, reference] = await Promise.all([
        getJson(`/api/team/${encodeURIComponent(season)}/${encodeURIComponent(team)}`),
        getJson(`/api/team/${encodeURIComponent(season)}/${encodeURIComponent(team)}/schedule?view=full`),
        getJson("/api/product-a/framework-reference").catch(() => ({})),
      ]);
      renderCard(season, team, profile, Array.isArray(schedule.schedule) ? schedule.schedule : [], reference);
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

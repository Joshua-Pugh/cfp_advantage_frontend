(function () {
  "use strict";

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const initials = (team) => String(team || "-")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const selected = new Set();
  const MAX_SELECTED_GAMES = 5;
  let activeHost = null;
  let activeGames = [];
  let activeLogos = {};
  let activeCompact = false;
  let activeSelectable = false;
  let activeApiBase = "";
  let activeLimit = null;
  let filterSelected = false;
  let scoreboardRefreshing = false;

  function selectedGameIds() {
    return [...selected];
  }
  
  function persistSelection() {
    window.dispatchEvent(
      new CustomEvent("cfp-live-board-change", {
        detail: { gameIds: selectedGameIds() }
      })
    );
  }

  function toggleSelection(gameId) {
    const id = String(gameId);
    if (selected.has(id)) selected.delete(id);
    else if (selected.size < MAX_SELECTED_GAMES) selected.add(id);
    else return false;
    if (!selected.size) filterSelected = false;
    persistSelection();
    renderActiveScoreboard();
    return true;
  }

  let logoCatalogPromise;

  function logoCatalog() {
    if (!logoCatalogPromise) {
      logoCatalogPromise = fetch("team-logos.json?v=4.0.52", { cache: "force-cache" })
        .then((response) => response.ok ? response.json() : { teams: {} })
        .then((payload) => payload.teams || {})
        .catch(() => ({}));
    }
    return logoCatalogPromise;
  }

  function logoMarkup(team, logos) {
    const name = String(team?.name || "Unknown team");
    const teamId = Number(team?.team_id);
    const url = Number.isFinite(teamId)
      ? `https://cdn.collegefootballdata.com/logos/48/${teamId}.png`
      : logos[name.trim().toLowerCase()];
    return `
      <span class="score-team-logo ${url ? "has-logo" : "is-fallback"}" aria-label="${escapeHtml(name)}">
        <span class="team-logo-fallback" aria-hidden="true">${escapeHtml(initials(name))}</span>
        ${url ? `<img src="${escapeHtml(url)}" alt="" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.remove('has-logo');this.parentElement.classList.add('is-fallback')">` : ""}
      </span>
    `;
  }

  function kickoffLabel(game) {
    if (game.start_time_tbd) return "Time TBD";
    const kickoff = new Date(game.start_date);
    if (Number.isNaN(kickoff.getTime())) return "Scheduled";
    return kickoff.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
      timeZoneName: "short",
    });
  }

  function statusLabel(game) {
    if (game.status === "completed") return "FINAL";
    if (game.status === "in_progress") {
      const period = game.period ? `Q${game.period}` : "LIVE";
      return [period, game.clock].filter(Boolean).join(" · ");
    }
    return kickoffLabel(game);
  }

  function teamRow(team, logos, possession) {
    const hasScore = team.points !== null && team.points !== undefined;
    return `
      <div class="score-team-row${possession === team.name ? " has-possession" : ""}">
        ${logoMarkup(team, logos)}
        <span class="score-team-name">${escapeHtml(team.name)}</span>
        <strong>${hasScore ? escapeHtml(team.points) : "-"}</strong>
      </div>
    `;
  }

  function gameMarkup(game, logos) {
    const liveClass = game.status === "in_progress" ? " is-live" : "";
    const finalClass = game.status === "completed" ? " is-final" : "";
    const gameId = String(game.game_id);
    const isSelected = selected.has(gameId);
    const selectionFull = !isSelected && selected.size >= MAX_SELECTED_GAMES;
    return `
      <article class="official-score-card${liveClass}${finalClass}">
        <div class="official-score-status">
          <strong>${escapeHtml(statusLabel(game))}</strong>
          ${game.tv ? `<span>${escapeHtml(game.tv)}</span>` : ""}
        </div>
        <div class="official-score-teams">
          ${teamRow(game.away_team, logos, game.possession)}
          ${teamRow(game.home_team, logos, game.possession)}
        </div>
        ${game.situation ? `<p>${escapeHtml(game.situation)}</p>` : ""}
        ${activeSelectable ? `<button type="button" class="score-select-button${isSelected ? " is-selected" : ""}" data-score-select="${escapeHtml(game.game_id)}" aria-pressed="${isSelected}" ${selectionFull ? "disabled" : ""}>${isSelected ? "Selected" : selectionFull ? "Live Board Full" : "Add to Live Board"}</button>` : ""}
      </article>
    `;
  }

  function gameOrder(game) {
    const statusOrder = { in_progress: 0, scheduled: 1, completed: 2 };
    const status = statusOrder[game.status] ?? 3;
    const kickoff = new Date(game.start_date).getTime();
    return [status, Number.isFinite(kickoff) ? kickoff : Number.MAX_SAFE_INTEGER];
  }

  function sortGames(games) {
    return [...games].sort((left, right) => {
      const leftOrder = gameOrder(left);
      const rightOrder = gameOrder(right);
      return leftOrder[0] - rightOrder[0] || leftOrder[1] - rightOrder[1];
    });
  }

 function renderActiveScoreboard() {
  if (!activeHost) return;

  const games = filterSelected
    ? activeGames.filter((game) => selected.has(String(game.game_id)))
    : activeGames;

  const selectionControls =
    activeSelectable && selected.size
      ? `
        <strong>${selected.size} selected</strong>

        <button type="button" data-score-filter>
          ${filterSelected ? "Show All Games" : "Filter Selected Games"}
        </button>

        <button type="button" data-score-clear>
          Clear
        </button>
      `
      : "";

  const controls = `
    <div class="scoreboard-selection-controls">
      ${selectionControls}

      <button
        type="button"
        data-score-refresh
        ${scoreboardRefreshing ? "disabled" : ""}
      >
        ${scoreboardRefreshing ? "Refreshing..." : "Refresh Scores"}
      </button>
    </div>
  `;

  activeHost.innerHTML = activeGames.length
    ? `
      ${controls}

      <div class="official-score-grid${activeCompact ? " is-compact" : ""}">
        ${games.map((game) => gameMarkup(game, activeLogos)).join("")}
      </div>
    `
    : '<div class="empty-state compact">No games are currently listed.</div>';
}

async function refreshScores() {
  if (!activeHost || !activeApiBase || scoreboardRefreshing) return;

  scoreboardRefreshing = true;
  renderActiveScoreboard();

  try {
    const response = await fetch(
      `${String(activeApiBase).replace(/\/$/, "")}/api/game-day/scoreboard?classification=fbs`,
      {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Scoreboard request failed with ${response.status}`
      );
    }

    const payload = await response.json();

    const games = sortGames(
      Array.isArray(payload.games) ? payload.games : []
    );

    const hasLimit =
      activeLimit !== null &&
      activeLimit !== undefined &&
      Number.isFinite(Number(activeLimit));

    activeGames = hasLimit
      ? games.slice(0, Number(activeLimit))
      : games;
  } catch (error) {
    console.error(
      "CFP Advantage scoreboard refresh failed:",
      error
    );
  } finally {
    scoreboardRefreshing = false;
    renderActiveScoreboard();
  }
}

  async function load({ host, apiBase, compact = false, limit = null, selectable = false }) {
    if (!host) return;

    activeHost = host;
    activeApiBase = apiBase;
    activeLimit = limit;
    activeCompact = compact;
    activeSelectable = selectable;

    host.innerHTML = '<div class="scoreboard-loading">Loading the CFBD scoreboard...</div>';
    try {
      const [response, logos] = await Promise.all([
        fetch(`${String(apiBase).replace(/\/$/, "")}/api/game-day/scoreboard?classification=fbs`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        }),
        logoCatalog(),
      ]);
      if (!response.ok) throw new Error(`Scoreboard request failed with ${response.status}`);
      const payload = await response.json();
      const games = sortGames(Array.isArray(payload.games) ? payload.games : []);
      const hasLimit = limit !== null && limit !== undefined && Number.isFinite(Number(limit));
      const visibleGames = hasLimit ? games.slice(0, Number(limit)) : games;
      activeHost = host;
      activeGames = visibleGames;
      activeLogos = logos;
      activeCompact = compact;
      activeSelectable = selectable;
      renderActiveScoreboard();
    } catch (error) {
      console.error("CFP Advantage scoreboard failed:", error);
      host.innerHTML = '<div class="empty-state compact">The CFBD scoreboard is temporarily unavailable. Frozen matchup projections remain available above.</div>';
    }
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-score-refresh]")) {
      refreshScores();
      return;
    }
    
    const selectButton = event.target.closest("[data-score-select]");
    if (selectButton) toggleSelection(selectButton.dataset.scoreSelect);
    if (event.target.closest("[data-score-filter]")) {
      filterSelected = !filterSelected;
      renderActiveScoreboard();
    }
    if (event.target.closest("[data-score-clear]")) {
      selected.clear();
      filterSelected = false;
      persistSelection();
      renderActiveScoreboard();
    }
  });

  window.CFPAdvantageScoreboard = {
  load,
  refresh: refreshScores,
  selectedGameIds,
  toggleSelection,
  maxSelectedGames: MAX_SELECTED_GAMES};
}());

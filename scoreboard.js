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

  let logoCatalogPromise;

  function logoCatalog() {
    if (!logoCatalogPromise) {
      logoCatalogPromise = fetch("team-logos.json?v=4.0.44", { cache: "force-cache" })
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
      <span class="score-team-logo" aria-label="${escapeHtml(name)}">
        <span class="team-logo-fallback" aria-hidden="true">${escapeHtml(initials(name))}</span>
        ${url ? `<img src="${escapeHtml(url)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ""}
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
      </article>
    `;
  }

  async function load({ host, apiBase }) {
    if (!host) return;
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
      const games = Array.isArray(payload.games) ? payload.games : [];
      host.innerHTML = games.length
        ? `<div class="official-score-grid">${games.map((game) => gameMarkup(game, logos)).join("")}</div>`
        : '<div class="empty-state compact">No games are currently listed.</div>';
    } catch (error) {
      console.error("CFP Advantage scoreboard failed:", error);
      host.innerHTML = '<div class="empty-state compact">The CFBD scoreboard is temporarily unavailable. Frozen matchup projections remain available above.</div>';
    }
  }

  window.CFPAdvantageScoreboard = { load };
}());

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://cfpadvantage.com";
const API_URL = process.env.CFP_ADV_DISCOVERY_API_URL || "https://api.cfpadvantage.com";
const REQUEST_HEADERS = {
  Accept: "application/json",
  Origin: SITE_URL,
  Referer: `${SITE_URL}/`,
  "User-Agent": "CFP-Advantage-Public-Discovery-Build/1.0",
};

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function fetchJson(resource) {
  console.log(`Fetching public discovery source: ${resource}`);
  const response = await fetch(`${API_URL}${resource}`, {
    headers: REQUEST_HEADERS,
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    throw new Error(`${resource} failed with ${response.status}`);
  }
  const payload = await response.json();
  console.log(`Fetched public discovery source: ${resource}`);
  return payload;
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cleanProfile(context) {
  if (!context) return null;
  const profile = context.football_profile || {};
  const stats = context.comparison_stats || {};
  return {
    pregame_adv_rating: finite(context.pregame_adv_rating),
    adv_schedule_strength: finite(context.rolling_adv_sos),
    games_before_target: finite(context.games_before_target),
    recent_form: context.recent_form_label || null,
    recent_form_note: context.recent_form_note || null,
    talent_yield: finite(context.talent_yield_index),
    talent_yield_label: context.tyi_label || null,
    control_creation: finite(profile.control_creation?.rate ?? context.rolling_control_creation_rate),
    control_finish: finite(profile.control_finish?.rate ?? context.rolling_control_finish_rate),
    control_denial: finite(profile.control_denial?.rate ?? context.rolling_control_denial_rate),
    comparison_stats: {
      games_available: finite(stats.games_available),
      yards_per_game: finite(stats.yards_per_game),
      yards_per_play: finite(stats.yards_per_play),
      points_per_drive: finite(stats.points_per_drive),
      rush_yards_per_game: finite(stats.rush_yards_per_game),
      pass_yards_per_game: finite(stats.pass_yards_per_game),
      turnover_margin: finite(stats.turnover_margin),
    },
  };
}

function cleanMatchup(game) {
  return {
    game_id: String(game.game_id),
    season: finite(game.season),
    week: finite(game.week),
    date: game.date || null,
    kickoff_at: game.kickoff_at || null,
    game_type: game.game_type || null,
    away_team: game.away_team,
    away_full_name: game.away_full_name || game.away_team,
    away_conference: game.away_conference || null,
    away_ap_rank: finite(game.away_ap_rank),
    home_team: game.home_team,
    home_full_name: game.home_full_name || game.home_team,
    home_conference: game.home_conference || null,
    home_ap_rank: finite(game.home_ap_rank),
    projected_winner: game.projected_winner_full_name || game.projected_winner || null,
    projected_margin: finite(game.projected_margin_abs),
    projection_closeness: finite(game.projection_closeness),
    context_label: game.context_label || null,
    context_note: game.context_note || null,
    matchup_conviction: game.matchup_conviction
      ? {
          label: game.matchup_conviction.label || null,
          note: game.matchup_conviction.note || null,
          historical_model_win_rate: finite(game.matchup_conviction.historical_model_win_rate),
          framework_support: game.matchup_conviction.framework_support
            ? {
                strength: game.matchup_conviction.framework_support.strength || null,
                support_components: finite(game.matchup_conviction.framework_support.support_components),
                conflict_components: finite(game.matchup_conviction.framework_support.conflict_components),
              }
            : null,
        }
      : null,
    key_advantages: game.key_advantages || {},
    away_profile: cleanProfile(game.away_context),
    home_profile: cleanProfile(game.home_context),
    contains_ats_recommendation: false,
  };
}

function teamRecord(row) {
  return row.overall_record || row.summary_json?.overall_record || null;
}

function cleanTeam(row, context) {
  const identity = row.identity || {};
  return {
    team: row.team || row.name,
    full_name: row.full_name || identity.full_name || row.team || row.name,
    season: finite(row.season),
    conference: row.conference || identity.conference || null,
    classification: identity.classification || "fbs",
    tier: row.tier || null,
    record: teamRecord(row),
    points_for: finite(row.points_for),
    points_against: finite(row.points_against),
    average_score_margin: finite(row.avg_margin),
    current_pregame_profile: cleanProfile(context),
  };
}

function replaceHead(html, { title, description, canonical, jsonLd }) {
  let output = html
    .replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta name="description"[^>]*>/i,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    )
    .replace(/<link rel="canonical"[^>]*>\s*/gi, "")
    .replace(/<meta property="og:[^>]*>\s*/gi, "")
    .replace(/<script id="cfp-advantage-static-structured-data"[^>]*>[\s\S]*?<\/script>\s*/gi, "");

  const metadata = [
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<style id="cfp-advantage-crawler-style">.crawler-snapshot{max-width:880px;margin:40px auto;padding:28px;font:16px/1.55 system-ui,sans-serif;color:#102018}.crawler-snapshot header,.crawler-snapshot article{padding:20px;border:1px solid #d5ded8;border-radius:12px;margin-bottom:18px}.crawler-snapshot h1{line-height:1.2}.crawler-snapshot dl{display:grid;grid-template-columns:minmax(150px,1fr) 2fr;gap:8px 18px}.crawler-snapshot dt{font-weight:700}.crawler-snapshot dd{margin:0}.crawler-snapshot a{color:#165b43}</style>`,
    `<script id="cfp-advantage-static-structured-data" type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`,
  ].join("\n    ");

  return output.replace("</head>", `    ${metadata}\n  </head>`);
}

function crawlerShell({ heading, intro, facts, links = [] }) {
  const factMarkup = facts
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join("");
  const linkMarkup = links
    .map(([label, href]) => `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`)
    .join("");
  return `<main class="crawler-snapshot" data-public-discovery="true">
    <header><a href="/">CFP Advantage</a><p>Published Football Intelligence</p></header>
    <article>
      <h1>${escapeHtml(heading)}</h1>
      <p>${escapeHtml(intro)}</p>
      <dl>${factMarkup}</dl>
      ${linkMarkup ? `<nav aria-label="Related public resources"><ul>${linkMarkup}</ul></nav>` : ""}
      <p>This snapshot contains public Product A information only. It contains no ATS recommendation, private research, formula weights, or guarantees.</p>
    </article>
  </main>`;
}

function injectCrawlerShell(html, shell) {
  return html.replace('<div id="root"></div>', `<div id="root">${shell}</div>`);
}

async function writeRoute(distDir, route, html) {
  const directory = path.join(distDir, ...route.split("/").filter(Boolean));
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), html, "utf8");
}

function xmlEscape(value) {
  return escapeHtml(value).replace(/&#39;/g, "&apos;");
}

export function publicDiscoveryPlugin() {
  return {
    name: "cfp-advantage-public-discovery",
    apply: "build",
    async closeBundle() {
      const distDir = path.resolve("dist");
      const baseHtml = await readFile(path.join(distDir, "index.html"), "utf8");
      const generatedAt = new Date().toISOString();

      const seasonsPayload = await fetchJson("/api/seasons");
      const seasons = (seasonsPayload.seasons || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
      const season = seasons.at(-1);
      if (!season) throw new Error("No public season is available for discovery generation.");

      const [weeklyPayload, teamPayload, liveTrackerPayload] = await Promise.all([
        fetchJson("/api/product-a/current-week?limit=150&include_schedule_only=true"),
        fetchJson(`/api/teams?season=${encodeURIComponent(season)}&tier=fbs`),
        fetchJson("/api/product-a/live-tracker"),
      ]);

      const games = (weeklyPayload.matchups || []).map(cleanMatchup);
      const teamRows = teamPayload.team_options || [];
      if (teamRows.length < 100) throw new Error(`Expected a complete FBS catalog; received ${teamRows.length} teams.`);
      if (!games.length) throw new Error("No current-week matchups are available for discovery generation.");

      const contexts = new Map();
      for (const game of weeklyPayload.matchups || []) {
        if (game.away_team && game.away_context) contexts.set(game.away_team, game.away_context);
        if (game.home_team && game.home_context) contexts.set(game.home_team, game.home_context);
      }

      const teams = teamRows
        .map((row) => cleanTeam(row, contexts.get(row.team || row.name)))
        .sort((a, b) => a.team.localeCompare(b.team));

      const week = finite(weeklyPayload.status?.selected_week ?? games[0]?.week);
      const statusLabel = weeklyPayload.status?.label || `${season} current week`;
      const publicDataDir = path.join(distDir, "public-data");
      const teamsDataDir = path.join(publicDataDir, "teams");
      const matchupDataDir = path.join(publicDataDir, "matchups");
      await Promise.all([
        mkdir(teamsDataDir, { recursive: true }),
        mkdir(matchupDataDir, { recursive: true }),
      ]);

      const teamIndex = teams.map((team) => ({
        ...team,
        canonical_url: `${SITE_URL}/teams/${season}/${slugify(team.team)}/`,
        data_url: `${SITE_URL}/public-data/teams/${slugify(team.team)}.json`,
      }));
      const matchupIndex = games.map((game) => ({
        ...game,
        canonical_url: `${SITE_URL}/matchups/${game.game_id}/`,
        data_url: `${SITE_URL}/public-data/matchups/${game.game_id}.json`,
      }));

      const manifest = {
        name: "CFP Advantage Published Intelligence Feed",
        generated_at: generatedAt,
        season,
        week,
        status_label: statusLabel,
        scope: "Public Product A football intelligence",
        methodology_url: `${SITE_URL}/metrics`,
        current_week_url: `${SITE_URL}/public-data/current-week.json`,
        teams_url: `${SITE_URL}/public-data/teams.json`,
        metric_relationships_url: `${SITE_URL}/public-data/metric-relationships.json`,
        validation_record_url: `${SITE_URL}/public-data/validation-record.json`,
        matchup_count: matchupIndex.length,
        team_count: teamIndex.length,
        contains_ats_recommendations: false,
        usage_note: "Cite the canonical human-readable URL. Preserve season, week, generated_at, and pregame/postgame scope.",
      };

      const validationCanonical = `${SITE_URL}/model-record/`;
      const validationDataUrl = `${SITE_URL}/public-data/validation-record.json`;
      const receiptRepositoryUrl = liveTrackerPayload.receipt_repository_url || "https://github.com/Joshua-Pugh/cfp-advantage-validation";
      const validationRecord = {
        name: "CFP Advantage Public Model Record",
        generated_at: generatedAt,
        season,
        current_season: {
          scope: "2026 development validation",
          updated_at: liveTrackerPayload.updated_at_utc,
          update_policy: liveTrackerPayload.update_policy,
          summary: liveTrackerPayload.summary,
          weeks: liveTrackerPayload.weeks,
          specification_note: "The 2026 specification changed prospectively beginning with Week 4 after rating defects were identified. Weeks 1-3 remain preserved as originally published. Clean prospective validation restarts in 2027.",
        },
        historical_evidence: {
          scope: "Retained 2016-2025 final-stack historical audit",
          games: 7436,
          winner_accuracy: 0.7137,
          margin_mae: 13.37,
          margin_rmse: 16.85,
          limitation: "Historical retrospective evidence is not the same as an untouched prospective season.",
        },
        independent_review: {
          status: "No completed independent third-party validation",
          note: "The public receipt archive makes published weekly projections and grades auditable, but it remains first-party evidence unless an outside reviewer evaluates it.",
        },
        receipt_repository_url: receiptRepositoryUrl,
        canonical_url: validationCanonical,
        contains_ats_recommendations: false,
      };

      await Promise.all([
        writeFile(path.join(publicDataDir, "index.json"), JSON.stringify(manifest, null, 2), "utf8"),
        writeFile(path.join(publicDataDir, "current-week.json"), JSON.stringify({ ...manifest, matchups: matchupIndex }, null, 2), "utf8"),
        writeFile(path.join(publicDataDir, "teams.json"), JSON.stringify({ generated_at: generatedAt, season, teams: teamIndex }, null, 2), "utf8"),
        writeFile(path.join(publicDataDir, "validation-record.json"), JSON.stringify(validationRecord, null, 2), "utf8"),
        ...teamIndex.map((team) => writeFile(path.join(teamsDataDir, `${slugify(team.team)}.json`), JSON.stringify({ generated_at: generatedAt, ...team }, null, 2), "utf8")),
        ...matchupIndex.map((game) => writeFile(path.join(matchupDataDir, `${game.game_id}.json`), JSON.stringify({ generated_at: generatedAt, ...game }, null, 2), "utf8")),
      ]);

      const normalRoutes = ["/", "/teams", "/matchups", "/bracket-room", "/about", "/live-2026", "/model-record", "/metrics", "/metric-relationships", "/news", "/updates", "/contact", "/support", "/legal", "/framework-card"];
      const sitemapUrls = [...normalRoutes.map((route) => `${SITE_URL}${route === "/" ? "/" : `${route}/`}`)];
      const dataLinks = [];

      for (const team of teamIndex) {
        const route = `/teams/${season}/${slugify(team.team)}`;
        const canonical = `${SITE_URL}${route}/`;
        const title = `${team.full_name} ${season} Team Profile | CFP Advantage`;
        const description = `${team.full_name} ${season} record, schedule context, and available CFP Advantage football-control intelligence.`;
        const profile = team.current_pregame_profile;
        const shell = crawlerShell({
          heading: `${team.full_name} - ${season} Team Profile`,
          intro: "Public team snapshot generated from the same certified public data used by CFP Advantage.",
          facts: [
            ["Season", season],
            ["Conference", team.conference],
            ["Record", team.record],
            ["Points For", team.points_for],
            ["Points Against", team.points_against],
            ["Pregame ADV Rating", profile?.pregame_adv_rating],
            ["ADV Schedule Strength", profile?.adv_schedule_strength],
            ["Recent Form", profile?.recent_form],
            ["Talent Yield", profile?.talent_yield_label],
            ["Generated At", generatedAt],
          ],
          links: [
            ["Machine-readable team snapshot", team.data_url],
            ["Metric definitions", `${SITE_URL}/metrics`],
            ["Current matchup board", `${SITE_URL}/matchups`],
          ],
        });
        const jsonLd = {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "SportsTeam",
              name: team.full_name,
              sport: "College Football",
              url: canonical,
              memberOf: team.conference ? { "@type": "SportsOrganization", name: team.conference } : undefined,
            },
            {
              "@type": "Dataset",
              name: `${team.full_name} ${season} CFP Advantage public snapshot`,
              description,
              url: canonical,
              dateModified: generatedAt,
              temporalCoverage: String(season),
              distribution: { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: team.data_url },
            },
          ],
        };
        const html = injectCrawlerShell(replaceHead(baseHtml, { title, description, canonical, jsonLd }), shell);
        await writeRoute(distDir, route, html);
        sitemapUrls.push(canonical);
        dataLinks.push(`- [${team.full_name}](${canonical}) - [JSON](${team.data_url})`);
      }

      for (const game of matchupIndex) {
        const route = `/matchups/${game.game_id}`;
        const canonical = `${SITE_URL}${route}/`;
        const title = `${game.away_full_name} at ${game.home_full_name} | CFP Advantage`;
        const marginText = game.projected_margin == null ? "No published margin" : `${game.projected_winner} by ${game.projected_margin.toFixed(1)}`;
        const description = `${game.away_full_name} at ${game.home_full_name}: published CFP Advantage pregame matchup context and model margin.`;
        const shell = crawlerShell({
          heading: `${game.away_full_name} at ${game.home_full_name}`,
          intro: "Frozen pregame matchup intelligence. Published values do not change after kickoff.",
          facts: [
            ["Season", game.season],
            ["Week", game.week],
            ["Kickoff", game.kickoff_at || game.date],
            ["Game Type", game.game_type],
            ["Model Read", marginText],
            ["Projection Closeness", game.projection_closeness == null ? null : `${(game.projection_closeness * 100).toFixed(0)}%`],
            ["Matchup Conviction", game.matchup_conviction?.label],
            ["Context", game.context_label],
            ["Generated At", generatedAt],
          ],
          links: [
            ["Machine-readable matchup snapshot", game.data_url],
            ["Metric definitions", `${SITE_URL}/metrics`],
            ["Full current-week dataset", `${SITE_URL}/public-data/current-week.json`],
          ],
        });
        const jsonLd = {
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: `${game.away_full_name} at ${game.home_full_name}`,
          sport: "College Football",
          startDate: game.kickoff_at || game.date,
          eventStatus: "https://schema.org/EventScheduled",
          url: canonical,
          awayTeam: { "@type": "SportsTeam", name: game.away_full_name },
          homeTeam: { "@type": "SportsTeam", name: game.home_full_name },
          description,
          subjectOf: {
            "@type": "Dataset",
            name: "CFP Advantage frozen pregame matchup snapshot",
            dateModified: generatedAt,
            distribution: { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: game.data_url },
          },
        };
        const html = injectCrawlerShell(replaceHead(baseHtml, { title, description, canonical, jsonLd }), shell);
        await writeRoute(distDir, route, html);
        sitemapUrls.push(canonical);
      }

      const relationshipDataUrl = `${SITE_URL}/public-data/metric-relationships.json`;
      const relationshipData = JSON.parse(
        await readFile(path.join(publicDataDir, "metric-relationships.json"), "utf8"),
      );
      const relationshipCanonical = `${SITE_URL}/metric-relationships/`;
      const relationshipDescription = "Historical relationships between ADV control metrics and familiar football production, PPA, Success Rate, havoc, explosiveness, and result Elo.";
      const strongestFacts = relationshipData.metrics.flatMap((metric) =>
        metric.relationships
          .filter((row) => row.pearson_r != null)
          .sort((a, b) => Math.abs(b.pearson_r) - Math.abs(a.pearson_r))
          .slice(0, 2)
          .map((row) => [`${metric.label} vs ${row.label}`, `r ${Number(row.pearson_r).toFixed(3)} (${row.correlation_strength})`]),
      );
      const relationshipShell = crawlerShell({
        heading: relationshipData.title,
        intro: relationshipData.summary,
        facts: [
          ["Seasons", relationshipData.coverage.seasons.join("-")],
          ["FBS Team-Games", relationshipData.coverage.fbs_vs_fbs_team_games],
          ["Team-Seasons", relationshipData.coverage.team_seasons],
          ["Study Version", relationshipData.study_version],
          ["Generated At", relationshipData.generated_at_utc],
          ...strongestFacts,
        ],
        links: [
          ["Machine-readable relationship dataset", relationshipDataUrl],
          ["Metric definitions", `${SITE_URL}/metrics`],
          ["Team profiles", `${SITE_URL}/teams`],
        ],
      });
      const relationshipJsonLd = {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: relationshipData.title,
        description: relationshipDescription,
        url: relationshipCanonical,
        dateModified: relationshipData.generated_at_utc,
        temporalCoverage: relationshipData.coverage.seasons.join("/"),
        distribution: { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: relationshipDataUrl },
      };
      await writeRoute(distDir, "/metric-relationships", injectCrawlerShell(replaceHead(baseHtml, {
        title: "ADV Metric Relationships | CFP Advantage",
        description: relationshipDescription,
        canonical: relationshipCanonical,
        jsonLd: relationshipJsonLd,
      }), relationshipShell));

      const currentSummary = validationRecord.current_season.summary;
      const validationDescription = "Published CFP Advantage historical evidence, graded 2026 results, pending projections, receipts, and development-validation limits.";
      const validationShell = crawlerShell({
        heading: "CFP Advantage Public Model Record",
        intro: "Historical evidence, graded live-season results, pending projections, and validation limits are separated here so each number keeps its proper scope.",
        facts: [
          ["2026 Published Games", currentSummary.games_published],
          ["2026 Graded Games", currentSummary.games_graded],
          ["2026 Pending Games", currentSummary.games_pending],
          ["2026 Winner Accuracy", currentSummary.winner_accuracy == null ? null : `${(currentSummary.winner_accuracy * 100).toFixed(2)}%`],
          ["2026 Margin MAE", currentSummary.margin_mae == null ? null : Number(currentSummary.margin_mae).toFixed(2)],
          ["Historical Audit Games", validationRecord.historical_evidence.games],
          ["Historical Winner Accuracy", `${(validationRecord.historical_evidence.winner_accuracy * 100).toFixed(2)}%`],
          ["Independent Review", validationRecord.independent_review.status],
          ["Generated At", generatedAt],
        ],
        links: [
          ["Machine-readable validation record", validationDataUrl],
          ["Immutable public receipts", receiptRepositoryUrl],
          ["2026 development-validation status", `${SITE_URL}/live-2026`],
          ["Current-week projections", manifest.current_week_url],
        ],
      });
      const validationJsonLd = {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: validationRecord.name,
        description: validationDescription,
        url: validationCanonical,
        dateModified: generatedAt,
        temporalCoverage: "2016/2026",
        distribution: { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: validationDataUrl },
      };
      const validationHtml = injectCrawlerShell(replaceHead(baseHtml, {
        title: "Public Model Record | CFP Advantage",
        description: validationDescription,
        canonical: validationCanonical,
        jsonLd: validationJsonLd,
      }), validationShell);
      await writeRoute(distDir, "/model-record", validationHtml);

      const homeDescription = "CFP Advantage publishes auditable college-football team strength, matchup projections, game-control intelligence, and a scoped public model record.";
      const homeShell = crawlerShell({
        heading: "CFP Advantage Football Intelligence",
        intro: "Explore current college-football team profiles and frozen matchup projections, with graded results and validation limits published separately from pending games.",
        facts: [
          ["Season", season],
          ["Current Week", week],
          ["Published Games", currentSummary.games_published],
          ["Graded Games", currentSummary.games_graded],
          ["Pending Games", currentSummary.games_pending],
          ["Winner Accuracy", currentSummary.winner_accuracy == null ? null : `${(currentSummary.winner_accuracy * 100).toFixed(2)}%`],
          ["Margin MAE", currentSummary.margin_mae == null ? null : Number(currentSummary.margin_mae).toFixed(2)],
        ],
        links: [
          ["Public model record", validationCanonical],
          ["Current matchups", `${SITE_URL}/matchups`],
          ["Team profiles", `${SITE_URL}/teams`],
          ["Published intelligence feed", `${SITE_URL}/ai-data.html`],
        ],
      });
      await writeFile(path.join(distDir, "index.html"), injectCrawlerShell(replaceHead(baseHtml, {
        title: "CFP Advantage | College Football Intelligence",
        description: homeDescription,
        canonical: `${SITE_URL}/`,
        jsonLd: { "@context": "https://schema.org", "@type": "WebSite", name: "CFP Advantage", url: `${SITE_URL}/`, description: homeDescription },
      }), homeShell), "utf8");

      const aiLandingCanonical = `${SITE_URL}/ai-data.html`;
      const aiLandingTitle = "Published Intelligence Feed | CFP Advantage";
      const aiLandingDescription = "Citation-ready public CFP Advantage team and matchup intelligence with season, week, scope, and update timestamps.";
      const aiLandingShell = crawlerShell({
        heading: "CFP Advantage Published Intelligence Feed",
        intro: "Use these bounded public resources for search, citations, and user-requested answers. Cite the canonical human-readable page.",
        facts: [
          ["Season", season],
          ["Week", week],
          ["Teams", teamIndex.length],
          ["Current Matchups", matchupIndex.length],
          ["Published Games", currentSummary.games_published],
          ["Graded Games", currentSummary.games_graded],
          ["Pending Games", currentSummary.games_pending],
          ["Winner Accuracy", currentSummary.winner_accuracy == null ? null : `${(currentSummary.winner_accuracy * 100).toFixed(2)}%`],
          ["Margin MAE", currentSummary.margin_mae == null ? null : Number(currentSummary.margin_mae).toFixed(2)],
          ["Validation Scope", validationRecord.current_season.scope],
          ["Independent Review", validationRecord.independent_review.status],
          ["Generated At", generatedAt],
          ["ATS Recommendations", "None"],
        ],
        links: [
          ["Feed manifest", `${SITE_URL}/public-data/index.json`],
          ["Current-week matchups", `${SITE_URL}/public-data/current-week.json`],
          ["Team catalog", `${SITE_URL}/public-data/teams.json`],
          ["Metric definitions", `${SITE_URL}/metrics`],
          ["ADV metric relationships", relationshipCanonical],
          ["Metric relationships JSON", relationshipDataUrl],
          ["Public model record", validationCanonical],
          ["Validation record JSON", validationDataUrl],
          ["Immutable public receipts", receiptRepositoryUrl],
        ],
      });
      const aiLandingJsonLd = {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: manifest.name,
        description: aiLandingDescription,
        url: aiLandingCanonical,
        dateModified: generatedAt,
        temporalCoverage: String(season),
        distribution: [
          { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: manifest.current_week_url },
          { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: manifest.teams_url },
          { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: relationshipDataUrl },
          { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: validationDataUrl },
        ],
      };
      await writeFile(path.join(distDir, "ai-data.html"), injectCrawlerShell(replaceHead(baseHtml, {
        title: aiLandingTitle,
        description: aiLandingDescription,
        canonical: aiLandingCanonical,
        jsonLd: aiLandingJsonLd,
      }), aiLandingShell), "utf8");
      sitemapUrls.push(aiLandingCanonical);

      const robots = `# CFP Advantage public discovery policy
# Search and user-requested AI retrieval are welcome. Model training is not authorized.
User-agent: *
Content-signal: search=yes, ai-input=yes, ai-train=no, use=reference
Allow: /

User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: meta-externalagent
Disallow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
      await writeFile(path.join(distDir, "robots.txt"), robots, "utf8");

      const today = generatedAt.slice(0, 10);
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((url) => `  <url><loc>${xmlEscape(url)}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`;
      await writeFile(path.join(distDir, "sitemap.xml"), sitemap, "utf8");

      const llms = `# CFP Advantage

> CFP Advantage publishes college-football team strength, matchup context, and football-control intelligence. Public projections are frozen before kickoff and must be cited with their season, week, and scope.

## Canonical public data
- [Published Intelligence Feed](${aiLandingCanonical})
- [Current Week JSON](${manifest.current_week_url})
- [Team Catalog JSON](${manifest.teams_url})
- [Metric Definitions](${SITE_URL}/metrics)
- [ADV Metric Relationships](${relationshipCanonical})
- [Metric Relationships JSON](${relationshipDataUrl})
- [Public Model Record](${validationCanonical})
- [Validation Record JSON](${validationDataUrl})
- [Immutable Public Receipts](${receiptRepositoryUrl})
- [Development Validation Status](${SITE_URL}/live-2026)
- [Updates](${SITE_URL}/updates)

## Interpretation rules
- ADV Expected Margin is a pregame projection.
- ADV Deserved Margin is a postgame control recap and is not a pregame prediction.
- Projection Closeness describes expected margin separation; it is not confidence or win probability.
- Recent Form, Talent Yield, weak-side context, and schedule strength explain risk; they do not independently override a published projection.
- Public data contains no ATS recommendation, lock, guarantee, or private research.
- Prefer the canonical human-readable URL in citations.
- Preserve generated_at, season, week, and pregame/postgame scope.
- Keep historical retrospective evidence, graded 2026 results, and pending current-week projections separate.
- The 2026 season is development validation; clean prospective validation restarts in 2027.
- Public receipts are auditable first-party evidence. No completed independent third-party validation is claimed.

## Current team pages
${dataLinks.join("\n")}
`;
      await writeFile(path.join(distDir, "llms.txt"), llms, "utf8");

      const readme = `# CFP Advantage Published Intelligence Feed

Generated: ${generatedAt}

This directory is a bounded, machine-readable mirror of information already published on CFP Advantage. It contains public Product A team, matchup, and curated metric-relationship information only.

- Manifest: ./index.json
- Current week: ./current-week.json
- Team catalog: ./teams.json
- Canonical definitions: ${SITE_URL}/metrics
- Metric relationships: ${relationshipCanonical}
- Metric relationships JSON: ${relationshipDataUrl}
- Public model record: ${validationCanonical}
- Validation record JSON: ${validationDataUrl}
- Public receipts: ${receiptRepositoryUrl}
- Human-readable index: ${aiLandingCanonical}

Cite canonical_url rather than the JSON URL when possible. Preserve season, week, generated_at, and scope. No file in this feed is an ATS recommendation or a disclosure of private formulas, weights, certification internals, or private research outputs.
`;
      await writeFile(path.join(publicDataDir, "README.md"), readme, "utf8");

      console.log(`Generated public discovery layer: ${teamIndex.length} teams, ${matchupIndex.length} matchups, season ${season}, week ${week}.`);
    },
  };
}

const IS_LOCAL_HOST = ["127.0.0.1", "localhost"].includes(window.location.hostname);
const LOCAL_API_OVERRIDE = IS_LOCAL_HOST ? new URLSearchParams(window.location.search).get("api") : "";
const API_BASE = (
  LOCAL_API_OVERRIDE ||
  (window.CFP_ADV_CONFIG && window.CFP_ADV_CONFIG.API_BASE_URL) ||
  window.CFP_API_BASE ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");
const APP_CONFIG = window.CFP_ADV_CONFIG || {};
const SUPPORT_EMAIL = APP_CONFIG.SUPPORT_EMAIL || "support@cfpadvantage.com";
const DONATE_URL = APP_CONFIG.DONATE_URL || "";
const USE_STATIC_FALLBACK = APP_CONFIG.USE_STATIC_FALLBACK === true;
const APP_ENVIRONMENT = APP_CONFIG.ENVIRONMENT || "local";
const SHOW_DEV_TOOLS = IS_LOCAL_HOST || APP_CONFIG.ENABLE_DEV_TOOLS === true;
const CACHE_PREFIX = `cfp_adv_api_cache:${APP_CONFIG.APP_VERSION || "dev"}:`;
const CACHE_TTL_MS = 1000 * 60 * 20;
const LIVE_CACHE_TTL_MS = 1000 * 60 * 3;
const FULL_SLATE_PAGE_SIZE = 20;
const apiMemoryCache = new Map();
let matchupTeamLogoCatalogPromise = null;

function matchupTeamInitials(team) {
  return String(team || "-").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function loadMatchupTeamLogos() {
  if (!matchupTeamLogoCatalogPromise) {
    matchupTeamLogoCatalogPromise = fetch("team-logos.json?v=4.0.77", { cache: "force-cache" })
      .then((response) => response.ok ? response.json() : { teams: {} })
      .then((payload) => payload.teams || {})
      .catch(() => ({}));
  }
  return matchupTeamLogoCatalogPromise;
}

function matchupTeamLogoMarkup(team) {
  const url = state.teamLogos?.[String(team || "").trim().toLowerCase()];
  const teamName = escapeHtml(team || "Unknown team");
  const logoClass = url ? "has-logo" : "is-fallback";
  return `<span class="team-logo ${logoClass}" title="${teamName}" aria-label="${teamName}"><span class="team-logo-fallback" aria-hidden="true">${escapeHtml(matchupTeamInitials(team))}</span>${url ? `<img src="${escapeHtml(url)}" alt="" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.remove('has-logo');this.parentElement.classList.add('is-fallback')">` : ""}</span>`;
}
const FORCE_REFRESH_KEY = "cfp_adv_force_refresh_until";
const TERMS_ACCEPTED_KEY = "cfp_adv_terms_accepted";
const TERMS_VERSION_KEY = "cfp_adv_terms_version";
const TERMS_ACCEPTED_AT_KEY = "cfp_adv_terms_accepted_at";
const DEFAULT_TERMS_VERSION = "2026-06-01-access-terms-v5";
const TERMS_GATE_MESSAGE = "Before entering CFP Advantage, please review and accept the Terms of Use. CFP Advantage provides football intelligence and model-derived context for informational and educational purposes. It does not guarantee outcomes and is not betting, financial, or professional advice. Free site access is intended for users 13 and older. Purchases, donations, premium content, subscriptions, or other payment transactions are restricted to users 18 or older, or the age of majority in their jurisdiction, whichever is higher. This site uses browser localStorage to remember your terms acknowledgement and display preferences on this device. By accepting, you agree to the Terms, Privacy Policy, Refund Policy, and Disclaimer.";

function installBrandAssets() {
  if (!document.querySelector('link[data-cfp-favicon]')) {
    const favicon = document.createElement("link");
    favicon.rel = "icon";
    favicon.type = "image/png";
    favicon.href = "assets/adv-logo.png?v=4.0.78";
    favicon.dataset.cfpFavicon = "true";
    document.head.appendChild(favicon);

    const touchIcon = document.createElement("link");
    touchIcon.rel = "apple-touch-icon";
    touchIcon.href = "assets/adv-logo.png?v=4.0.78";
    touchIcon.dataset.cfpFavicon = "true";
    document.head.appendChild(touchIcon);
  }

  const header = document.querySelector(".site-header, .topbar");
  if (!header || header.querySelector(".site-brand-mark")) return;
  const mark = document.createElement("img");
  mark.className = "site-brand-mark";
  mark.src = "assets/adv-logo.png?v=4.0.78";
  mark.alt = "CFP Advantage";
  mark.width = 80;
  mark.height = 80;
  const identity = header.classList.contains("topbar") ? header.querySelector(":scope > div") : header;
  identity?.insertBefore(mark, identity.firstChild);
}

function setupSiteChrome() {
  installBrandAssets();
  const nav = document.querySelector(".page-nav");
  if (nav) {
    nav.classList.add("primary-nav");
    nav.innerHTML = [
      ["index.html", "Home"],
      ["team.html", "Teams"],
      ["matchups.html", "Matchups"],
      ["bracket-room.html", "Bracket Room"],
    ].map(([href, label]) => `<a${href === "matchups.html" ? ' class="is-active"' : ""} href="${href}">${label}</a>`).join("");
  }
  const shell = document.querySelector(".app-shell");
  if (!shell) return;
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="footer-brand">
      <strong>CFP Advantage</strong>
      <p>Advantage Through Contextual Football Profiles.</p>
      <small>Independent football intelligence platform. Not affiliated with the CFP, NCAA, conferences, or universities.</small>
    </div>
    <nav class="footer-links" aria-label="Reference and legal pages">
      <a href="about.html">About</a>
      <a href="live-2026.html">2026 Live</a>
      <a href="contact.html">Contact</a>
      <a href="updates.html">Updates <span class="site-version">v1.1</span></a>
      <a class="support-link" data-support-link href="${DONATE_URL || `mailto:${SUPPORT_EMAIL}?subject=Support%20CFP%20Advantage`}">Support</a>
      <a href="metrics.html">Metrics Guide</a>
      <a href="news.html">News</a>
      <a href="legal.html#terms">Terms</a>
      <a href="legal.html#privacy">Privacy</a>
      <a href="legal.html#disclaimer">Disclaimer</a>
      <a href="legal.html#refunds">Refund Policy</a>
    </nav>
    <p class="footer-legal-notice">By using CFP Advantage, you acknowledge the <a href="legal.html#terms">Terms</a>, <a href="legal.html#privacy">Privacy Policy</a>, and <a href="legal.html#disclaimer">Disclaimer</a>.</p>
    <p class="footer-copyright">Copyright 2026 CFP Advantage. All rights reserved.</p>
  `;
  shell.appendChild(footer);
  configureSupportLinks();
  installSupportButton();
  installDeveloperRefreshControl();
}

function configureSupportLinks() {
  document.querySelectorAll("[data-support-link]").forEach((link) => {
    if (!DONATE_URL) return;
    link.setAttribute("href", DONATE_URL);
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  });
}

function installSupportButton() {
  if (!DONATE_URL || document.querySelector("[data-floating-support]")) return;
  const link = document.createElement("a");
  link.className = "floating-support-link";
  link.dataset.floatingSupport = "true";
  link.dataset.supportLink = "true";
  link.setAttribute("aria-label", "Support CFP Advantage");
  link.href = DONATE_URL;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.innerHTML = '<span class="support-full">Support</span><span class="support-icon" aria-hidden="true">$</span>';
  document.body.appendChild(link);
}

function installContactModal() {
  if (!document.querySelector("[data-contact-modal]")) {
    const modal = document.createElement("section");
    modal.className = "contact-modal is-hidden";
    modal.dataset.contactModal = "true";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Contact CFP Advantage");
    modal.innerHTML = `
      <div class="contact-modal-card">
        <button class="modal-close" type="button" data-close-contact aria-label="Close contact form">Close</button>
        <span class="eyebrow">Contact</span>
        <h2>Send CFP Advantage a Message</h2>
        <p>Have a question, found a bug, or want to share feedback? We'd love to hear from you.</p>
        <p class="contact-direct-email">Messages are delivered securely to ${SUPPORT_EMAIL}.</p>
        <form class="contact-form" data-contact-form>
          <label>
            <span>Name</span>
            <input name="name" autocomplete="name" maxlength="120" required>
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" autocomplete="email" maxlength="254" required>
          </label>
          <label class="contact-honeypot" aria-hidden="true">
            <span>Website</span>
            <input name="website" tabindex="-1" autocomplete="off">
          </label>
          <label>
            <span>Message</span>
            <textarea name="message" rows="5" minlength="10" maxlength="4000" required></textarea>
          </label>
          <p class="contact-status" data-contact-status aria-live="polite"></p>
          <button class="primary-action" type="submit">Send Message</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }
  document.querySelectorAll("[data-open-contact]").forEach((trigger) => {
    trigger.addEventListener("click", openContactModal);
  });
  document.querySelectorAll("[data-close-contact]").forEach((trigger) => {
    trigger.addEventListener("click", closeContactModal);
  });
  const modal = document.querySelector("[data-contact-modal]");
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeContactModal();
  });
  document.querySelector("[data-contact-form]")?.addEventListener("submit", submitContactForm);
}

function openContactModal() {
  const modal = document.querySelector("[data-contact-modal]");
  if (!modal) return;
  modal.classList.remove("is-hidden");
  document.body.classList.add("modal-open");
  modal.querySelector("input[name='name']")?.focus();
}

function closeContactModal() {
  const modal = document.querySelector("[data-contact-modal]");
  if (!modal) return;
  modal.classList.add("is-hidden");
  document.body.classList.remove("modal-open");
}

async function submitContactForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector("[data-contact-status]");
  const button = form.querySelector("button[type='submit']");
  const payload = Object.fromEntries(new FormData(form).entries());
  status.textContent = "Sending...";
  status.className = "contact-status";
  button.disabled = true;
  try {
    const response = await fetch(`${API_BASE}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const detail = await response.json().catch(() => ({}));
    if (!response.ok) {
      const validationError = Array.isArray(detail.detail)
        ? detail.detail.find((item) => item?.loc?.includes("message"))?.type
        : null;
      const error = validationError || detail.detail?.error || detail.error || "contact_failed";
      throw new Error(error);
    }
    form.reset();
    status.textContent = "Message sent. Thanks for reaching out.";
    status.className = "contact-status ok";
  } catch (error) {
    const messages = {
      contact_rate_limited: "Too many messages were sent from this connection. Please try again in about 15 minutes.",
      contact_delivery_not_configured: "Contact delivery is temporarily unavailable. Please try again shortly.",
      contact_email_send_failed: "The message could not be delivered. Please try again in a moment.",
      string_too_short: "Please enter a message with at least 10 characters.",
      message_too_short: "Please enter a message with at least 10 characters.",
    };
    status.textContent = messages[error.message] || "The message could not be sent. Please check your connection and try again.";
    status.className = "contact-status error";
  } finally {
    button.disabled = false;
  }
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
  "ADV SRS": ["ADV Strength Rating (ADV SRS)", "Measures a team's overall football-control strength after accounting for schedule context. Higher values indicate stronger season-level team quality."],
  "OFF ADV SRS": ["Offensive ADV Strength Rating (OFF ADV SRS)", "Measures how much value a team's offense creates through sustained, useful football control."],
  "DEF ADV SRS": ["Defensive ADV Strength Rating (DEF ADV SRS)", "Measures how much a team's defense suppresses opponent control and scoring opportunity."],
  "ADV SOS": ["ADV Strength of Schedule (ADV SOS)", "Measures the quality of opponents a team faced through the ADV lens."],
  "Control Rate": ["Control Rate (CR)", "Measures how often a team creates useful control opportunities across its games. It is a consistency signal, not a final score measure."],
  "DCE": ["Scoreboard Control Gap", "Compares a team's actual average scoring margin with the margin suggested by its underlying ADV control profile. Positive values mean the scoreboard has run ahead of control; negative values mean control has been stronger than the scoreboard results."],
  "Weak-Side Profile": ["Weak-Side Profile", "Shows the weaker side of a team's offense/defense profile so users can spot balance or fragility."],
  "ADV Expected Margin": ["ADV Expected Margin", "A matchup margin estimate created from the difference between two teams' ADV strength profiles."],
  "ADV Deserved Margin": ["ADV Deserved Margin", "A postgame control recap that compares how the game was played to the final scoreboard result."],
  "Scoreboard vs ADV Gap": ["Scoreboard vs ADV Gap", "Shows when the final score looked stronger or weaker than the underlying football-control profile."],
};

const METRIC_SCALE_GUIDES = {
  "Control Pressure Per Offensive Drive": {
    title: "How to read it",
    text: "ADV-derived sustainable scoring pressure per offensive drive. It is not literal scoreboard points per drive.",
    scale: "Under 1.5 limited | 1.5-2.3 average | 2.4-3.0 strong | 3.1+ elite",
  },
  "Control Pressure Allowed Per Defensive Drive": {
    title: "How to read it",
    text: "ADV-derived sustained scoring pressure allowed per defensive drive. Lower is better.",
    scale: "Under 1.2 elite | 1.2-1.8 strong | 1.9-2.5 average | 2.6+ vulnerable",
  },
  "Control Finish Rate": {
    title: "How to read it",
    text: "Share of meaningful control drives that become points. It is related to red zone efficiency, but it starts with drive control rather than field location.",
    scale: "Read with control-drive sample size; high finish on tiny samples can be noisy.",
  },
  "Control Drive Shutout Rate": {
    title: "How to read it",
    text: "Share of opponent control drives held scoreless. It shows how often a defense survives after the opponent has already created danger.",
    scale: "Read beside Control Denial; denial prevents danger, shutout rate survives danger.",
  },
};
const COMPARISON_DISPLAY = {
  "Total Yards": "Total offensive yardage gained.",
  "Yards Per Play": "Average yards gained per offensive play.",
  "Passing Yards": "Yards gained through the passing game.",
  "Rushing Yards": "Yards gained through the running game.",
  "Explosive Plays": "High-impact plays that create large chunks of field position or scoring opportunity.",
  "Points Per Drive": "Average points produced per offensive drive.",
  "ADV Drive Conversion": "How often meaningful control drives turn into points, with touchdown and field goal quality separated where available.",
  "Control Finish Rate": "How often meaningful control drives turn into points, with touchdown and field goal quality separated where available.",
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
  currentMatchups: [],
  currentMatchupQuery: "",
  fullSlateMatchups: [],
  fullSlateVisibleCount: FULL_SLATE_PAGE_SIZE,
  fullSlateScoresById: {},
  teamLogos: {},
  selectedLiveBoardIds: [],
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
  currentMatchupsPanel: $("currentMatchupsPanel"),
  currentMatchupsLabel: $("currentMatchupsLabel"),
  currentMatchupsMessage: $("currentMatchupsMessage"),
  featuredMatchupGrid: $("featuredMatchupGrid"),
  currentMatchupsEmpty: $("currentMatchupsEmpty"),
  currentMatchupsEmptyTitle: $("currentMatchupsEmptyTitle"),
  currentMatchupsEmptyNote: $("currentMatchupsEmptyNote"),
  loadLiveScoreboard: $("loadLiveScoreboard"),
  liveScoreboardEmbed: $("liveScoreboardEmbed"),
  liveScoreboardFrame: $("liveScoreboardFrame"),
  fullSlateTable: $("fullSlateTable"),
  fullSlateTableContent: $("fullSlateTableContent"),
  fullSlateInlineSearch: $("fullSlateInlineSearch"),
  fullSlatePrompt: $("fullSlatePrompt"),
  liveBoardSelectionList: $("liveBoardSelectionList"),
  matchupRailPrevious: $("matchupRailPrevious"),
  matchupRailNext: $("matchupRailNext"),
  matchupPreviewModal: $("matchupPreviewModal"),
  matchupPreviewModalClose: $("matchupPreviewModalClose"),
  matchupPreviewModalContent: $("matchupPreviewModalContent"),
};

function formatNumber(value) {
  return value === null || value === undefined || value === "" || Number.isNaN(Number(value))
    ? "-"
    : Number(value).toFixed(2);
}

function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || value === "") return "-";
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

function weeklyNumber(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "-";
}

function formatProjectionMargin(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  const rounded = Math.sign(number) * (Math.round((Math.abs(number) + Number.EPSILON) * 2) / 2);
  return rounded.toFixed(1);
}

function formatSignedProjectionMargin(value) {
  const number = Number(value);
  const formatted = formatProjectionMargin(number);
  return Number.isFinite(number) && number > 0 ? `+${formatted}` : formatted;
}

function publicTrajectory(value) {
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
  return labels[raw] || (raw ? raw.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()) : "-");
}

function recentFormLabel(context) {
  if (!context) return "-";
  return context.recent_form_label || publicTrajectory(context.isolated_block_velocity_label || context.trajectory_bucket);
}

function weeklyContextValue(context, key, formatter = (value) => weeklyNumber(value, 1)) {
  if (!context || Number(context.games_before_target) === 0) return "Preseason anchor";
  return formatter(context[key]);
}

function driveSample(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(0)} drives` : "-";
}

function hasExpectedFootballProfile(context = {}) {
  return ["expected", "expected_observed_blend"].includes(String(context.football_profile_status || ""));
}

function hasControlSample(context = {}) {
  if (hasExpectedFootballProfile(context)) return true;
  return [
    context.rolling_offensive_drives,
    context.rolling_defensive_drives,
    context.rolling_control_drives,
    context.games_before_target,
  ].some((value) => Number(value) > 0);
}

function profileStatusNote(context = {}) {
  const expected = Number(context.football_profile_expected_weight);
  const observed = Number(context.football_profile_observed_weight);
  if (hasExpectedFootballProfile(context) && Number.isFinite(expected) && Number.isFinite(observed)) {
    return `Expected ${Math.round(expected * 100)}% / Observed ${Math.round(observed * 100)}%`;
  }
  return "Compared with selected weekly slate";
}

function hasTraditionalStats(context = {}) {
  const stats = context.comparison_stats || {};
  return [
    stats.yards_per_game,
    stats.points_per_drive,
    stats.first_downs_per_game,
    stats.red_zone_td_rate,
  ].some((value) => Number.isFinite(Number(value)) && Number(value) > 0);
}

function ordinal(value) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return "-";
  const mod100 = number % 100;
  const suffix = mod100 >= 11 && mod100 <= 13
    ? "th"
    : ({ 1: "st", 2: "nd", 3: "rd" }[number % 10] || "th");
  return `${number}${suffix}`;
}

function signedInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${number > 0 ? "+" : ""}${Math.round(number)}`;
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

function productionComparisonLabel(context, opponent, key) {
  const fields = {
    control_production: "rolling_control_production_rate",
    defensive_control_production_allowed: "rolling_defensive_control_production_allowed",
  };
  const rawValue = context?.[fields[key]];
  const rawOpponentValue = opponent?.[fields[key]];
  const value = rawValue === null || rawValue === undefined || rawValue === "" ? null : Number(rawValue);
  const opponentValue = rawOpponentValue === null || rawOpponentValue === undefined || rawOpponentValue === ""
    ? null
    : Number(rawOpponentValue);
  if (!Number.isFinite(value) || !Number.isFinite(opponentValue)) return "Profile Available";
  const gap = value - opponentValue;
  if (Math.abs(gap) < 0.15) return "Similar Matchup Profile";
  const favorable = key === "defensive_control_production_allowed" ? gap < 0 : gap > 0;
  return favorable ? "Matchup Edge" : "Matchup Disadvantage";
}

function footballProfileCell(context, key, opponent = {}) {
  const profile = context?.football_profile?.[key] || {};
  const percentile = Number(profile.percentile);
  const fallbackFields = {
    control_production: "rolling_control_production_rate",
    defensive_control_production_allowed: "rolling_defensive_control_production_allowed",
  };
  const rawFallbackValue = context?.[fallbackFields[key]];
  const fallbackValue = rawFallbackValue === null || rawFallbackValue === undefined || rawFallbackValue === ""
    ? null
    : Number(rawFallbackValue);
  const productionSampleFields = {
    control_production: "rolling_offensive_drives",
    defensive_control_production_allowed: "rolling_defensive_drives",
  };
  const sample = Number(context?.[productionSampleFields[key]]);
  if (!hasControlSample(context)) {
    return `
      <strong>Preseason Pending</strong>
      <small>No current-season control sample yet</small>
    `;
  }
  const isProductionMetric = Object.hasOwn(productionSampleFields, key);
  const productionDetail = isProductionMetric && Number.isFinite(Number(profile.rate))
    ? [
        `${weeklyNumber(profile.rate, 2)} per drive`,
        Number.isFinite(sample) ? `${sample.toFixed(0)} drives` : "",
      ].filter(Boolean).join(" · ")
    : "";
  if (!profile.label && Number.isFinite(fallbackValue)) {
    const comparisonLabel = productionComparisonLabel(context, opponent, key);
    return `
      <strong>${escapeHtml(comparisonLabel)}</strong>
      <small>${escapeHtml([
        `${weeklyNumber(fallbackValue, 2)} per drive`,
        key === "defensive_control_production_allowed" ? "Lower is better" : "Higher is better",
        Number.isFinite(sample) ? `${sample.toFixed(0)} drives` : "",
      ].filter(Boolean).join(" · "))}</small>
    `;
  }
  const detail = Number.isFinite(percentile) ? `${ordinal(percentile)} percentile` : "Sample developing";
  const statusNote = hasExpectedFootballProfile(context) ? profileStatusNote(context) : "";
  return `
    <strong>${escapeHtml(profile.label || "-")}</strong>
    <small>${escapeHtml([detail, productionDetail, statusNote].filter(Boolean).join(" · "))}</small>
  `;
}

function recentFormCell(context) {
  const label = recentFormLabel(context);
  const normalized = label.toLowerCase();
  const tone = normalized.includes("declin") || normalized.includes("falling")
    ? "is-declining"
    : normalized.includes("improv") || normalized.includes("surg")
      ? "is-improving"
      : "is-stable";
  return `<span class="recent-form-badge ${tone}">${escapeHtml(label)}</span>`;
}

function advantageList(matchup, team) {
  const advantages = matchup.key_advantages?.[team] || [];
  if (!advantages.length) return `<li>No clear profile advantage</li>`;
  return advantages.slice(0, 4).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function matchupContextNote(matchup) {
  const note = String(matchup?.context_note || "").trim();
  if (note === "This is a preseason control expectation based on weighted recent team history. It is not current-season evidence yet.") {
    return "This preseason profile is based on weighted recent team history. It describes expected tendencies before current-season evidence is available.";
  }
  return note;
}

function shortConferenceTag(conference) {
  const raw = String(conference || "").trim();
  if (!raw) return "";

  const normalized = raw.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const tagMap = {
    "american athletic conference": "AAC",
    "american athletic": "AAC",
    "big ten conference": "B1G",
    "big ten": "B1G",
    "big 12 conference": "XII",
    "big 12": "XII",
    "fbs independents": "Ind.",
    "fbs independent": "Ind.",
    "independents": "Ind.",
    "independent": "Ind."
  };

  if (tagMap[normalized]) {
    return tagMap[normalized];
  }

  const shorthand = raw.replace(/\bconference\b/gi, "").replace(/\s+/g, " ").trim();
  if (shorthand.length <= 8) return shorthand;
  return shorthand.split(" ").map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(" ");
}

function matchupDateLabel(matchup) {
  const kickoff = !matchup.kickoff_time_tbd && matchup.kickoff_at
    ? new Date(matchup.kickoff_at)
    : null;
  if (kickoff && Number.isFinite(kickoff.getTime())) {
    return kickoff.toLocaleDateString("en-US", {
      month: "short", day: "numeric", timeZone: "America/New_York",
    });
  }
  const date = matchup.date ? new Date(`${matchup.date}T12:00:00`) : null;
  return date && Number.isFinite(date.getTime())
    ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : `Week ${matchup.week || 1}`;
}

function mergeScoreboardTeamLogos(scoreboardPayload) {
  const logos = state.teamLogos || {};
  const matchupsById = new Map(
    (state.fullSlateMatchups || []).map((matchup) => [String(matchup.game_id), matchup])
  );
  (scoreboardPayload?.games || []).forEach((game) => {
    const matchup = matchupsById.get(String(game.game_id));
    [game.away_team, game.home_team].forEach((team) => {
      const name = String(team?.name || "").trim().toLowerCase();
      const teamId = Number(team?.team_id);
      if (!name || !Number.isFinite(teamId)) return;
      logos[name] = `https://cdn.collegefootballdata.com/logos/48/${teamId}.png`;
    });
    if (matchup) {
      const awayTeamId = Number(game.away_team?.team_id);
      const homeTeamId = Number(game.home_team?.team_id);
      if (Number.isFinite(awayTeamId)) {
        logos[String(matchup.away_team || "").trim().toLowerCase()] = `https://cdn.collegefootballdata.com/logos/48/${awayTeamId}.png`;
      }
      if (Number.isFinite(homeTeamId)) {
        logos[String(matchup.home_team || "").trim().toLowerCase()] = `https://cdn.collegefootballdata.com/logos/48/${homeTeamId}.png`;
      }
    }
  });
  state.teamLogos = logos;
}

function renderCurrentMatchupCard(matchup) {
  const matchupDate = matchupDateLabel(matchup);
  
  // Determine conference label
  const awayConf = String(matchup.away_conference || "").trim();
  const homeConf = String(matchup.home_conference || "").trim();
  const isInConference = awayConf && homeConf && awayConf.toLowerCase() === homeConf.toLowerCase();
  let conferenceMarkup = "";
  if (isInConference && awayConf) {
    conferenceMarkup = `<div class="matchup-conference-group"><span class="matchup-conference-tag">${escapeHtml(shortConferenceTag(awayConf))}</span></div>`;
  } else if (awayConf && homeConf) {
    conferenceMarkup = `
      <div class="matchup-conference-group">
        <span class="matchup-conference-tag">${escapeHtml(shortConferenceTag(awayConf))}</span>
        <span class="matchup-conference-divider">non-conf</span>
        <span class="matchup-conference-tag">${escapeHtml(shortConferenceTag(homeConf))}</span>
      </div>
    `;
  }
  
  return `
    <article class="featured-matchup-card matchup-rail-card">
      <div class="featured-matchup-topline">
        <span>${escapeHtml(matchupDate)}</span>
        <strong>${escapeHtml(matchup.context_label || "Pregame Context")}</strong>
      </div>
      <div class="featured-matchup-title">
        <div>
          <span>Away</span>
          <span class="team-name-with-logo">
            ${matchupTeamLogoMarkup(matchup.away_team)}
          </span>
        </div>
        <div>
          <b>vs</b>
          ${conferenceMarkup}
        </div>
        <div>
          <span>Home</span>
          <span class="team-name-with-logo">
            ${matchupTeamLogoMarkup(matchup.home_team)}
          </span>
        </div>
      </div>
      <div class="weekly-projection-strip">
        <div><span>Model Lean</span><strong>${escapeHtml(matchup.projected_winner)}</strong></div>
        <div><span>Projected Margin</span><strong>By ${formatProjectionMargin(matchup.projected_margin_abs)}</strong></div>
        <div><span title="How close the projected margin is, not model confidence">Projection Closeness</span><strong>${formatPercent(matchup.projection_closeness ?? matchup.close_matchup_risk, 0)}</strong></div>
      </div>
      <p class="weekly-context-note">${escapeHtml(matchupContextNote(matchup))}</p>
      <button class="matchup-preview-button" type="button" data-matchup-game="${escapeHtml(matchup.game_id)}">Full Matchup Analysis</button>
    </article>
  `;
}

function fullMatchupPreview(matchup) {
  const home = completeControlContext(matchup.home_context || {});
  const away = completeControlContext(matchup.away_context || {});
  const hasFrameworkSample = hasControlSample(home) || hasControlSample(away);
  const hasStatsSample = hasTraditionalStats(home) || hasTraditionalStats(away);
  const identityRows = [
    ["Pregame ADV Rating", "pregame_adv_rating", (value) => weeklyNumber(value, 1)],
    ["ADV Schedule Rating", "rolling_adv_sos", (value) => weeklyNumber(value, 1)],
    ["Talent Yield (TYI)", "talent_yield_index", (value) => weeklyNumber(value, 2)],
  ];
  const controlRows = [
    ["Control Creation", "rolling_control_creation_rate", (value) => formatPercent(value, 1)],
    ["Control Denial", "rolling_control_denial_rate", (value) => formatPercent(value, 1)],
    ["Control Finish Rate", "rolling_control_finish_rate", (value) => formatPercent(value, 1)],
    ["Control Drive Shutout Rate", "rolling_finishing_resistance", (value) => formatPercent(value, 1)],
    ["Points Per Control Drive", "rolling_points_per_control_drive", (value) => weeklyNumber(value, 2)],
    ["Opponent Points Per Control Drive Allowed", "rolling_opp_points_per_control_allowed", (value) => weeklyNumber(value, 2)],
    ["Control Pressure Per Offensive Drive", "rolling_control_production_rate", (value, stats) => `${weeklyNumber(value, 2)} across ${driveSample(stats.rolling_offensive_drives)}`],
    ["Control Pressure Allowed Per Defensive Drive", "rolling_defensive_control_production_allowed", (value, stats) => `${weeklyNumber(value, 2)} across ${driveSample(stats.rolling_defensive_drives)}`],
    ["Control Rate (CR)", "rolling_cr", (value) => formatPercent(value, 1)],
    ["Creation Waste", "rolling_creation_waste_rate", (value) => formatPercent(value, 1)],
    ["Finish Waste", "rolling_finish_waste_rate", (value) => formatPercent(value, 1)],
    ["Control-Drive Sample", "rolling_control_drives", driveSample],
    ["Defensive-Drive Sample", "rolling_defensive_drives", driveSample],
  ];
  const statRows = [
    ["Yards / Game", "yards_per_game", (value) => weeklyNumber(value, 1)],
    ["Passing Yards / Game", "pass_yards_per_game", (value) => weeklyNumber(value, 1)],
    ["Rushing Yards / Game", "rush_yards_per_game", (value) => weeklyNumber(value, 1)],
    ["Yards / Play", "yards_per_play", (value) => weeklyNumber(value, 2)],
    ["Points / Drive", "points_per_drive", (value) => weeklyNumber(value, 2)],
    ["First Downs / Game", "first_downs_per_game", (value) => weeklyNumber(value, 1)],
    ["Completion Rate", "completion_rate", (value) => formatPercent(value, 1)],
    ["3rd Down Rate", "third_down_rate", (value) => formatPercent(value, 1)],
    ["4th Down Rate", "fourth_down_rate", (value) => formatPercent(value, 1)],
    ["Red Zone Score Rate", "red_zone_score_rate", (value) => formatPercent(value, 1)],
    ["Red Zone TD Rate", "red_zone_td_rate", (value) => formatPercent(value, 1)],
    ["Turnover Margin", "turnover_margin", signedInteger],
    ["Sacks / TFL", "sacks_made", (value, stats) => `${weeklyNumber(value, 0)} / ${weeklyNumber(stats.tfl_made, 0)}`],
    ["Penalties / Penalty Yards Per Game", "penalties_per_game", (value, stats) => `${weeklyNumber(value, 1)} penalties / ${weeklyNumber(stats.penalty_yards_per_game, 1)} yards`],
    ["Possession / Game", "possession_minutes_per_game", (value) => `${weeklyNumber(value, 1)} min`],
  ];
  const profileRows = (rows, awayContext, homeContext, nested = false) => rows.map(([label, key, formatter]) => {
    const awayValues = nested ? (awayContext.comparison_stats || {}) : awayContext;
    const homeValues = nested ? (homeContext.comparison_stats || {}) : homeContext;
    const contextPendingKey = !nested && ["rolling_adv_sos", "talent_yield_index"].includes(key);
    const awayValue = contextPendingKey && !hasControlSample(awayContext)
      ? "Not yet available"
      : formatter(awayValues[key], awayValues);
    const homeValue = contextPendingKey && !hasControlSample(homeContext)
      ? "Not yet available"
      : formatter(homeValues[key], homeValues);
    return `
      <div class="weekly-profile-row">
        <span>${metricLabelWithScale(label)}</span>
        <strong>${escapeHtml(awayValue)}</strong>
        <strong>${escapeHtml(homeValue)}</strong>
      </div>
    `;
  }).join("");
  const mechanicsRows = [
    ["Control Creation", "control_creation"],
    ["Control Denial", "control_denial"],
    ["Control Finish", "control_finish"],
    ["Control Drive Shutout Rate", "finishing_resistance"],
    ["Control Pressure", "control_production"],
    ["Control Pressure Allowed", "defensive_control_production_allowed"],
  ].map(([label, key]) => `
    <div class="weekly-profile-row profile-label-row">
      <span>${escapeHtml(label)}</span>
      <div>${footballProfileCell(away, key, home)}</div>
      <div>${footballProfileCell(home, key, away)}</div>
    </div>
  `).join("");
  return `
    <section class="matchup-preview-detail">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">${escapeHtml(matchupDateLabel(matchup))}</p>
          <h2>${escapeHtml(matchup.away_team)} at ${escapeHtml(matchup.home_team)}</h2>
          <p class="panel-note">${escapeHtml(matchupContextNote(matchup))}</p>
        </div>
        <span class="framework-read-label">${escapeHtml(matchup.context_label || "Mixed Context")}</span>
      </div>
      <div class="matchup-preview-summary">
        <div><span>Model Lean</span><strong>${escapeHtml(matchup.projected_winner)}</strong></div>
        <div><span>ADV Expected Margin</span><strong>${escapeHtml(matchup.projected_winner)} by ${formatProjectionMargin(matchup.projected_margin_abs)}</strong></div>
        <div><span>Expected Margin Band</span><strong>${escapeHtml(matchup.confidence_bucket || "-")}</strong></div>
        <div><span>Projection Closeness</span><strong>${formatPercent(matchup.projection_closeness ?? matchup.close_matchup_risk, 0)}</strong></div>
      </div>
      <p class="weekly-context-note">${escapeHtml(matchup.projection_closeness_note || "Projection Closeness describes how narrow the expected margin is; it is not an upset probability.")} The Expected Margin Band groups the point estimate; it is not a statistical confidence interval.</p>
      <section class="matchup-story-panel">
        <div class="matchup-story-heading">
          <p class="eyebrow">Framework Read</p>
          <h3>${escapeHtml(matchup.context_label || "Mixed Framework Read")}</h3>
          <p>${escapeHtml(matchupContextNote(matchup))}</p>
        </div>
        ${hasFrameworkSample ? `
          ${hasExpectedFootballProfile(away) || hasExpectedFootballProfile(home) ? `
            <p class="weekly-context-note">Expected profile weights fade as current-season evidence arrives.</p>
          ` : ""}
          <div class="weekly-profile-table matchup-preview-table">
            <div class="weekly-profile-row is-header">
              <span>Football Mechanics</span>
              <strong>${escapeHtml(matchup.away_team)}</strong>
              <strong>${escapeHtml(matchup.home_team)}</strong>
            </div>
            ${mechanicsRows}
            <div class="weekly-profile-row profile-label-row">
              <span>Talent Yield</span>
              <div><strong>${escapeHtml(away.football_profile?.talent_yield?.label || "-")}</strong><small>Roster expectation context</small></div>
              <div><strong>${escapeHtml(home.football_profile?.talent_yield?.label || "-")}</strong><small>Roster expectation context</small></div>
            </div>
            <div class="weekly-profile-row profile-label-row">
              <span>Recent Form</span>
              <div>${recentFormCell(away)}<small>Compared with own season baseline</small></div>
              <div>${recentFormCell(home)}<small>Compared with own season baseline</small></div>
            </div>
          </div>
          <p class="weekly-context-note">${escapeHtml(matchup.profile_comparison_scope || "Profile labels compare teams within the selected weekly matchup slate.")}</p>
          <div class="matchup-advantages-grid">
            <article>
              <span>${escapeHtml(matchup.away_team)} Advantages</span>
              <ul>${advantageList(matchup, matchup.away_team)}</ul>
            </article>
            <article>
              <span>${escapeHtml(matchup.home_team)} Advantages</span>
              <ul>${advantageList(matchup, matchup.home_team)}</ul>
            </article>
          </div>
        ` : `
          <div class="empty-state compact">
            <strong>Control Framework Pending</strong>
            <p>No prior current-season games have been played, so rolling Control Framework, Recent Form, TYI, and traditional stat comparisons are intentionally held back. This matchup analysis uses the frozen preseason ADV baseline until live samples exist.</p>
          </div>
        `}
      </section>
      <details class="advanced-matchup-details">
        <summary>View Advanced Metrics</summary>
        <div class="advanced-matchup-content">
          <h3>ADV Matchup Profile</h3>
      <div class="weekly-profile-table matchup-preview-table">
        <div class="weekly-profile-row is-header">
          <span>Matchup Profile</span>
          <strong>${escapeHtml(matchup.away_team)}</strong>
          <strong>${escapeHtml(matchup.home_team)}</strong>
        </div>
        ${profileRows(identityRows, away, home)}
        <div class="weekly-profile-row">
          <span>Recent Form</span>
          <strong>${recentFormCell(away)}</strong>
          <strong>${recentFormCell(home)}</strong>
        </div>
      </div>
      <div class="advanced-reading-guide">
        <strong>How To Read These Values</strong>
        <p><b>Pregame ADV Rating</b> is the frozen, opponent-adjusted overall strength view used before kickoff. Larger gaps indicate greater expected separation between teams.</p>
        <p><b>ADV Schedule Rating</b> is a raw opponent-strength rating, not a percentile. Higher values indicate stronger competition faced before this matchup.</p>
        <p><b>Talent Yield</b> compares performance with roster expectation. Positive values indicate performance above expectation; negative values indicate performance below expectation.</p>
        <p><b>Recent Form</b> describes the direction of recent ADV performance compared with the team's own season baseline.</p>
      </div>
      <h3>Control Framework Evidence</h3>
      <p class="weekly-context-note">Creation and denial describe the foundation. Finish and Control Drive Shutout show conversion. Control Pressure Per Offensive Drive estimates sustainable scoring pressure created across every possession; Control Pressure Allowed Per Defensive Drive is the lower-is-better defensive mirror.</p>
      ${hasFrameworkSample ? `
        <div class="weekly-profile-table matchup-preview-table">
          <div class="weekly-profile-row is-header">
            <span>Pregame Control Profile</span>
            <strong>${escapeHtml(matchup.away_team)}</strong>
            <strong>${escapeHtml(matchup.home_team)}</strong>
          </div>
          ${profileRows(controlRows, away, home)}
        </div>
      ` : `
        <div class="empty-state compact">No prior games have been played, so observed rolling Control Framework evidence is not displayed yet.</div>
      `}
      <h3>Stats Through This Week</h3>
      ${hasStatsSample ? `
        <p class="weekly-context-note">Traditional comparison stats include completed games available before kickoff.</p>
        <div class="weekly-profile-table matchup-preview-table">
          <div class="weekly-profile-row is-header">
            <span>Traditional Comparison</span>
            <strong>${escapeHtml(matchup.away_team)}</strong>
            <strong>${escapeHtml(matchup.home_team)}</strong>
          </div>
          ${profileRows(statRows, away, home, true)}
        </div>
      ` : `
        <div class="empty-state compact">No prior games have been played, so traditional through-week stats are not displayed yet.</div>
      `}
        </div>
      </details>
    </section>
  `;
}


function matchupDisplayWeek(matchup) {
  const hasExplicitWeek = matchup.display_week !== null
    && matchup.display_week !== undefined
    && matchup.display_week !== "";
  const explicit = hasExplicitWeek ? Number(matchup.display_week) : Number.NaN;
  if (Number.isFinite(explicit)) return explicit;
  const sourceWeek = Number(matchup.source_week ?? matchup.week);
  const date = String(matchup.date || matchup.kickoff_at || "").slice(0, 10);
  if (Number(matchup.season) === 2026 && sourceWeek === 1 && date.startsWith("2026-08-")) return 0;
  return Number.isFinite(sourceWeek) ? sourceWeek : "-";
}

function fullSlateScore(matchup) {
  return state.fullSlateScoresById[String(matchup.game_id)] || null;
}

function fullSlateTeamScore(game, side) {
  const points = game?.[`${side}_team`]?.points;
  return points === null || points === undefined || points === "" ? null : Number(points);
}

function fullSlateIsFinal(matchup) {
  return fullSlateScore(matchup)?.status === "completed";
}

function fullSlateStatusMarkup(matchup) {
  const game = fullSlateScore(matchup);
  if (game?.status === "completed") {
    return `<span class="full-slate-status-tag is-final">Final</span><span>${escapeHtml(matchupDateLabel(matchup))}</span>`;
  }
  if (game?.status === "in_progress") {
    const period = game.period ? `Q${game.period}` : "Live";
    return `<span class="full-slate-status-tag is-live">${escapeHtml(period)}</span><span>${escapeHtml(game.clock || "In progress")}</span>`;
  }
  return `<strong>${escapeHtml(matchupDateLabel(matchup))}</strong><span>Upcoming</span>`;
}

function fullSlateWinnerGradeMarkup(matchup, game) {
  if (game?.status !== "completed" || matchup.projection_unavailable || matchup.projection_limited) return "";
  const awayPoints = fullSlateTeamScore(game, "away");
  const homePoints = fullSlateTeamScore(game, "home");
  if (!Number.isFinite(awayPoints) || !Number.isFinite(homePoints) || awayPoints === homePoints) return "";
  const actualWinner = homePoints > awayPoints ? matchup.home_team : matchup.away_team;
  const correct = String(actualWinner) === String(matchup.projected_winner);
  return `<span class="full-slate-winner-grade ${correct ? "is-correct" : "is-incorrect"}">Winner pick: ${correct ? "Correct" : "Incorrect"}</span>`;
}

function fullSlateProjectionMarkup(matchup, game = fullSlateScore(matchup)) {
  if (matchup.projection_unavailable) {
    return `<strong>Not a certified pick</strong><em>No supported Product A projection is available for this matchup. Schedule only; excluded from model W/L and MAE.</em>`;
  }
  const estimate = `${escapeHtml(matchup.projected_winner || "-")} by ${formatProjectionMargin(matchup.projected_margin_abs)}`;
  if (matchup.projection_limited) {
    const isFcsBaseline = matchup.projection_limited_reason === "fbs_fcs_opponent_tier_baseline"
      || matchup.source === "team_schedules_fbs_fcs_baseline";
    const reason = isFcsBaseline
      ? "FBS-FCS matchup: the FCS opponent is outside Product A's supported Control Framework scope."
      : "This matchup does not have a supported full Product A projection.";
    return `<strong>Not a certified pick</strong><em>${reason} Excluded from model W/L and MAE.</em><em>${isFcsBaseline ? "Historical opponent-tier estimate" : "Limited estimate"}: ${estimate}</em>`;
  }
  return `<em>${estimate} - ${escapeHtml(matchup.context_label || "Pregame Context")}</em>${fullSlateWinnerGradeMarkup(matchup, game)}`;
}

function renderFullSlateTableInline() {
  if (!els.fullSlateTableContent) return;
  const search = String(els.fullSlateInlineSearch?.value || "").trim().toLowerCase();
  const aliasMap = {
    uga: ["georgia", "bulldogs", "dawgs"],
    dawgs: ["georgia"],
    bulldogs: ["georgia"],
  };
  const searchTerms = [search, ...(aliasMap[search] || [])].filter(Boolean);
  const rows = (state.fullSlateMatchups || []).filter((matchup) => {
    if (!search) return true;
    const haystack = [
      matchup.away_team,
      matchup.home_team,
      matchup.projected_winner,
      matchup.away_conference,
      matchup.home_conference,
      matchup.away_team_tier,
      matchup.home_team_tier,
      matchup.game_type,
    ].map((value) => String(value || "").toLowerCase()).join(" ");
    return searchTerms.some((term) => haystack.includes(term));
  });

  const orderedRows = [...rows].sort((left, right) => {
    const weekDifference = Number(matchupDisplayWeek(left)) - Number(matchupDisplayWeek(right));
    if (weekDifference) return weekDifference;
    const leftDate = new Date(left.kickoff_at || `${left.date || "9999-12-31"}T23:59:59`).getTime();
    const rightDate = new Date(right.kickoff_at || `${right.date || "9999-12-31"}T23:59:59`).getTime();
    return leftDate - rightDate || String(left.game_id).localeCompare(String(right.game_id));
  });
  const visibleRows = search ? orderedRows : orderedRows.slice(0, state.fullSlateVisibleCount);
  const hasMoreRows = !search && state.fullSlateVisibleCount < orderedRows.length;
  
  if (!rows.length) {
    els.fullSlateTableContent.innerHTML = '<div class="empty-state compact">No matchups match that search.</div>';
    return;
  }
  
  const teamMeta = (tier, conference) => [tier, conference]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase())
    .join(" - ");
  
  const rowClass = (matchup) => [
    "full-slate-table-row",
    matchup.projection_unavailable ? "is-schedule-only" : "",
    matchup.projection_limited ? "is-limited-projection" : "",
    fullSlateIsFinal(matchup) ? "is-final" : "",
  ].filter(Boolean).join(" ");

  const rowMarkup = (matchup) => {
    const game = fullSlateScore(matchup);
    const awayPoints = fullSlateTeamScore(game, "away");
    const homePoints = fullSlateTeamScore(game, "home");
    const final = game?.status === "completed";
    const gameId = String(matchup.game_id);
    const isSelected = state.selectedLiveBoardIds.includes(gameId);
    const liveBoardLimit = window.CFPAdvantageScoreboard?.maxSelectedGames || 5;
    const selectionFull = !isSelected && state.selectedLiveBoardIds.length >= liveBoardLimit;
    return `
      <article class="${rowClass(matchup)}">
        <div class="full-slate-table-cell full-slate-status-cell">${fullSlateStatusMarkup(matchup)}</div>
        <div class="full-slate-table-cell">
          <strong>${matchupTeamLogoMarkup(matchup.away_team)}<span class="full-slate-team-name">${escapeHtml(matchup.away_team)}</span>${final && Number.isFinite(awayPoints) ? `<b class="full-slate-team-score">${awayPoints}</b>` : ""}</strong>
          <span>vs</span>
          <strong>${matchupTeamLogoMarkup(matchup.home_team)}<span class="full-slate-team-name">${escapeHtml(matchup.home_team)}</span>${final && Number.isFinite(homePoints) ? `<b class="full-slate-team-score">${homePoints}</b>` : ""}</strong>
        </div>
        <div class="full-slate-table-cell">
          ${matchup.away_conference === matchup.home_conference ? escapeHtml(matchup.away_conference) : `${escapeHtml(matchup.away_conference)} vs ${escapeHtml(matchup.home_conference)}`}
        </div>
        <div class="full-slate-table-cell">${fullSlateProjectionMarkup(matchup, game)}</div>
        <div class="full-slate-row-actions">
          ${!matchup.projection_unavailable && !matchup.projection_limited ? `<button type="button" class="full-slate-analysis-button" data-full-slate-game="${escapeHtml(matchup.game_id)}">Full Analysis</button>` : ""}
          ${!final ? `<button type="button" class="full-slate-live-button${isSelected ? " is-selected" : ""}" data-live-board-game="${escapeHtml(matchup.game_id)}" aria-pressed="${isSelected}" ${selectionFull ? "disabled" : ""}>${isSelected ? "On Live Board" : selectionFull ? "Live Board Full" : "Add to Live Board"}</button>` : `<span class="full-slate-final-note">Final score recorded</span>`}
        </div>
      </article>
    `;
  };

  const groupedRows = visibleRows.reduce((groups, matchup) => {
    const week = String(matchupDisplayWeek(matchup));
    if (!groups.has(week)) groups.set(week, []);
    groups.get(week).push(matchup);
    return groups;
  }, new Map());

  const weekMarkup = [...groupedRows.entries()].map(([week, matchups]) => {
    const finalCount = matchups.filter(fullSlateIsFinal).length;
    const liveCount = matchups.filter((matchup) => fullSlateScore(matchup)?.status === "in_progress").length;
    const upcomingCount = matchups.length - finalCount - liveCount;
    const summary = [
      finalCount ? `${finalCount} final${finalCount === 1 ? "" : "s"}` : "",
      liveCount ? `${liveCount} live` : "",
      upcomingCount ? `${upcomingCount} upcoming` : "",
    ].filter(Boolean).join(" · ");
    return `
      <section class="full-slate-week-group" aria-labelledby="fullSlateWeek${escapeHtml(week)}">
        <div class="full-slate-week-heading">
          <strong id="fullSlateWeek${escapeHtml(week)}">Week ${escapeHtml(week)}</strong>
          <span>${escapeHtml(summary)}</span>
        </div>
        ${matchups.map(rowMarkup).join("")}
      </section>
    `;
  }).join("");
  
  els.fullSlateTableContent.innerHTML = `
    <div class="full-slate-table">
      <div class="full-slate-table-header">
        <div>Status</div>
        <div>Matchup</div>
        <div>Conference</div>
        <div>Projection</div>
        <div>Actions</div>
      </div>
      ${weekMarkup}
    </div>

    ${hasMoreRows ? `
      <div class="full-slate-load-more">
        <button type="button" class="secondary-button" data-full-slate-load-more>
          Load More Games
        </button>
        <span>Showing ${visibleRows.length} of ${orderedRows.length} games</span>
      </div>
    ` : !search && orderedRows.length > FULL_SLATE_PAGE_SIZE ? `
      <div class="full-slate-load-more">
        <span>Showing all ${orderedRows.length} games</span>
      </div>
    ` : ""}
  `;
}

async function loadFullSlateTableData() {
  if (!els.fullSlateTable || !els.fullSlateTableContent || !els.fullSlatePrompt) return;

  if (state.fullSlateMatchups && state.fullSlateMatchups.length > 0) {
    els.fullSlateTable.classList.remove("is-hidden");
    els.fullSlatePrompt.classList.add("is-hidden");
    renderFullSlateTableInline();
    return;
  }

  const promptTitle = els.fullSlatePrompt.querySelector("strong");
  const promptText = els.fullSlatePrompt.querySelector("p");
  els.fullSlatePrompt.classList.remove("is-hidden");
  els.fullSlateTable.classList.add("is-hidden");
  els.fullSlatePrompt.classList.add("is-loading");
  if (promptTitle) promptTitle.textContent = "Loading this week's matchups...";
  if (promptText) promptText.textContent = "Checking the current weekly slate and loading the full game list.";

  try {
    const query = state.currentMatchupQuery
    ? `?${state.currentMatchupQuery}&limit=150&include_schedule_only=true`
    : "?limit=150&include_schedule_only=true";
    const scoreboardRequest = api("/api/game-day/scoreboard?classification=fbs").catch((error) => {
      console.warn("Completed score enrichment is temporarily unavailable:", error);
      return { games: [] };
    });
    const [payload, logos, scoreboardPayload] = await Promise.all([
      api(`/api/product-a/current-week${query}`),
      loadMatchupTeamLogos(),
      scoreboardRequest,
    ]);
    state.teamLogos = { ...logos };
    state.fullSlateMatchups = (payload.matchups || []).map((matchup) => ({
      ...matchup,
      source_week: matchup.source_week ?? matchup.week,
      display_week: matchupDisplayWeek(matchup),
    }));
    mergeScoreboardTeamLogos(scoreboardPayload);
    state.fullSlateScoresById = Object.fromEntries(
      (scoreboardPayload.games || []).map((game) => [String(game.game_id), game])
    );
    state.fullSlateVisibleCount = FULL_SLATE_PAGE_SIZE;
    syncLiveBoardSelection();
    if (els.fullSlateInlineSearch) els.fullSlateInlineSearch.value = "";
    els.fullSlatePrompt.classList.add("is-hidden");
    els.fullSlateTable.classList.remove("is-hidden");
    renderFullSlateTableInline();
  } catch (error) {
    els.fullSlatePrompt.classList.remove("is-loading");
    if (promptTitle) promptTitle.textContent = "Weekly slate unavailable";
    if (promptText) promptText.textContent = error.message || "The full slate could not be loaded right now.";
    els.fullSlateTable.classList.add("is-hidden");
  }
}

async function loadLiveScoreboard() {
  if (!els.liveScoreboardEmbed || !els.liveScoreboardFrame || !els.loadLiveScoreboard) return;
  const isHidden = els.liveScoreboardEmbed.classList.contains("is-hidden");
  if (!isHidden) {
    els.liveScoreboardEmbed.classList.add("is-hidden");
    els.loadLiveScoreboard.setAttribute("aria-expanded", "false");
    els.loadLiveScoreboard.textContent = "Show Live Scoreboard";
    return;
  }
  els.liveScoreboardEmbed.classList.remove("is-hidden");
  els.loadLiveScoreboard.setAttribute("aria-expanded", "true");
  els.loadLiveScoreboard.textContent = "Refreshing Scores...";
  await window.CFPAdvantageScoreboard.load({ host: els.liveScoreboardFrame, apiBase: API_BASE, selectable: true });
  els.loadLiveScoreboard.textContent = "Hide Live Scoreboard";
}

function syncLiveBoardSelection() {
  state.selectedLiveBoardIds =
    window.CFPAdvantageScoreboard?.selectedGameIds?.() || [];

  if (els.liveBoardSelectionList) {
    const selected = state.fullSlateMatchups.filter((game) =>
      state.selectedLiveBoardIds.includes(String(game.game_id))
    );

    const selectionLimit = window.CFPAdvantageScoreboard?.maxSelectedGames || 5;
    const limitMessage = selected.length >= selectionLimit
      ? `<span class="live-board-limit">${selectionLimit}-game limit reached. Remove a game to add another.</span>`
      : "";

    els.liveBoardSelectionList.innerHTML = selected.length
      ? selected.map((game) => {
          const hasProjection =
            !game.projection_unavailable &&
            game.projected_winner &&
            Number.isFinite(Number(game.projected_margin_abs));

          const projectionMarkup = hasProjection
            ? `
              <div class="live-board-model-read">
                <span>ADV Pick</span>
                <strong>
                  ${escapeHtml(game.projected_winner)}
                  by ${formatProjectionMargin(game.projected_margin_abs)}
                </strong>
              </div>
            `
            : `
              <div class="live-board-model-read">
                <span>ADV Pick</span>
                <strong>Not Available</strong>
              </div>
            `;

          return `
            <div class="live-board-selection-row">
              <div class="live-board-selection-info">
                <div class="live-board-matchup">
                  ${matchupTeamLogoMarkup(game.away_team)}
                  <strong>${escapeHtml(game.away_team)}</strong>

                  <span>at</span>

                  ${matchupTeamLogoMarkup(game.home_team)}
                  <strong>${escapeHtml(game.home_team)}</strong>
                </div>

                ${projectionMarkup}
              </div>

              <button
                type="button"
                data-remove-live-board-game="${escapeHtml(game.game_id)}"
                aria-label="Remove ${escapeHtml(game.away_team)} at ${escapeHtml(game.home_team)} from Live Board"
              >
                Remove
              </button>
            </div>
          `;
        }).join("") + limitMessage
      : '<span class="live-board-empty">No games selected yet.</span>';
  }

  if (
    els.fullSlateTableContent &&
    state.fullSlateMatchups.length
  ) {
    renderFullSlateTableInline();
  }
}

function openMatchupPreview(gameId) {
  const matchup = state.currentMatchups.find((row) => String(row.game_id) === String(gameId));
  if (!matchup || !els.matchupPreviewModal || !els.matchupPreviewModalContent) return;
  els.matchupPreviewModalContent.innerHTML = fullMatchupPreview(matchup);
  els.matchupPreviewModal.classList.remove("is-hidden");
  document.body.classList.add("modal-open");
}

function closeMatchupPreview() {
  if (!els.matchupPreviewModal) return;
  els.matchupPreviewModal.classList.add("is-hidden");
  document.body.classList.remove("modal-open");
}

async function loadCurrentMatchups() {
  const query = "?limit=6";
  let payload;
  try {
    const [matchupPayload, logos] = await Promise.all([
      api(`/api/product-a/current-week${query}`),
      loadMatchupTeamLogos(),
    ]);
    payload = matchupPayload;
    state.teamLogos = logos;
  } catch (error) {
    const currentYear = new Date().getFullYear();
    payload = {
      status: {
        phase: "preseason",
        label: `${currentYear} Preseason`,
        message: `No data for the current season. Current season: ${currentYear} Preseason.`,
      },
      matchups: [],
      weekly_snapshot_available: false,
      weekly_snapshot_note: "Current-week matchup snapshots will publish when the season becomes active.",
    };
  }

  const status = payload.status || {};
  state.currentMatchups = payload.matchups || [];
  state.currentMatchupQuery = status.season && status.selected_week
    ? `season=${encodeURIComponent(status.season)}&week=${encodeURIComponent(status.selected_week)}`
    : "";
  if (!els.currentMatchupsLabel || !els.currentMatchupsMessage || !els.featuredMatchupGrid || !els.currentMatchupsEmpty) return;
  els.currentMatchupsLabel.textContent = status.label || "Current Matchups";
  els.currentMatchupsMessage.textContent = status.message || payload.weekly_snapshot_note || "";

  if (payload.weekly_snapshot_available) {
    els.featuredMatchupGrid.innerHTML = state.currentMatchups.map(renderCurrentMatchupCard).join("");
    els.featuredMatchupGrid.classList.remove("is-hidden");
    requestAnimationFrame(() => els.featuredMatchupGrid.scrollTo({ left: 0, behavior: "auto" }));
    els.currentMatchupsEmpty.classList.add("is-hidden");
    return;
  }

  els.featuredMatchupGrid.innerHTML = "";
  els.featuredMatchupGrid.classList.add("is-hidden");
  els.currentMatchupsEmptyTitle.textContent = status.label || "No current-season data";
  els.currentMatchupsEmptyNote.textContent = payload.weekly_snapshot_note || status.message || "Current-week matchup intelligence is not available yet.";
  els.currentMatchupsEmpty.classList.remove("is-hidden");
}

function scrollMatchupRail(direction) {
  if (!els.featuredMatchupGrid) return;
  const card = els.featuredMatchupGrid.querySelector(".featured-matchup-card");
  const styles = window.getComputedStyle(els.featuredMatchupGrid);
  const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
  const distance = (card?.getBoundingClientRect().width || 420) + gap;
  els.featuredMatchupGrid.scrollBy({ left: direction * distance, behavior: "smooth" });
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

function conversionRateWithSample(values = {}) {
  const value = rate(values.scoring_conversion_rate);
  const scored = numericOrNull(values.scoring_control_drives);
  const control = numericOrNull(values.control_drives);
  return scored !== null && control !== null
    ? `${value} (${Math.round(scored)} of ${Math.round(control)})`
    : value;
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

function cacheTtlForPath(path) {
  if (path.startsWith("/api/product-a/current-week")) {
    return LIVE_CACHE_TTL_MS;
  }

  return CACHE_TTL_MS;
}

async function api(path) {
  try {
    const forceRefresh = (() => {
      try {
        return Number(window.sessionStorage.getItem(FORCE_REFRESH_KEY) || 0) > Date.now();
      } catch {
        return false;
      }
    })();
    const cacheKey = `${CACHE_PREFIX}${path}`;
    const cacheTtl = cacheTtlForPath(path);
    if (!forceRefresh) {
      const memory = apiMemoryCache.get(cacheKey);
      if (memory && Date.now() - memory.stored_at < cacheTtl) return memory.data;
      try {
        const cached = JSON.parse(window.sessionStorage.getItem(cacheKey) || "null");
        if (cached && Date.now() - cached.stored_at < cacheTtl) {
          apiMemoryCache.set(cacheKey, cached);
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

function refreshPageData() {
  apiMemoryCache.clear();
  try {
    Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith("cfp_adv_api_cache:"))
      .forEach((key) => window.sessionStorage.removeItem(key));
    window.sessionStorage.setItem(FORCE_REFRESH_KEY, String(Date.now() + 30000));
  } catch (error) {
    console.warn("CFP Advantage cache clear unavailable:", error.message);
  }
  window.location.reload();
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
  if (!els.loaderPanel || !els.loaderTitle || !els.loaderMessage) return;
  els.loaderTitle.textContent = title;
  els.loaderMessage.textContent = message;
  els.loaderPanel.classList.remove("is-hidden");
  els.loaderPanel.classList.toggle("is-loading", loading);
}

function hideStatus() {
  if (!els.loaderPanel) return;
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
      ${metricScaleGuide(metric.name)}
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

function metricScaleGuide(name) {
  const guide = METRIC_SCALE_GUIDES[name] || METRIC_SCALE_GUIDES[publicMetricName(name)];
  if (!guide) return "";
  return `
    <div class="metric-scale-guide">
      <strong>${escapeHtml(guide.title)}</strong>
      <p>${escapeHtml(guide.text)}</p>
      <small>${escapeHtml(guide.scale)}</small>
    </div>
  `;
}

function metricLabelWithScale(label) {
  const guide = METRIC_SCALE_GUIDES[label];
  if (!guide) return escapeHtml(label);
  return `
    <b>${escapeHtml(label)}</b>
    <small class="metric-row-note">${escapeHtml(guide.text)}</small>
    <small class="metric-row-scale">${escapeHtml(guide.scale)}</small>
  `;
}

async function loadProductGuides() {
  if (!els.metricCatalogState) return;
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
  } catch (error) {
    els.metricCatalogState.textContent = `Metric guide unavailable from API: ${error.message}`;
    renderMetricCards([]);
    renderComparisonStats([]);
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
  if (!els.helpOverlay) return;
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
  const data = await api(`/api/product-a/team-board?season=${encodeURIComponent(season)}&limit=300`);
  return (data.rows || data.teams || [])
    .filter((row) => row.adv_srs_rank !== null && row.adv_srs_rank !== undefined)
    .sort((left, right) => Number(left.adv_srs_rank || 9999) - Number(right.adv_srs_rank || 9999));
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
  els.previewMargin.textContent = `${row.projected_winner} +${formatProjectionMargin(row.projected_margin_abs)}`;
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
    els.actualGameComparison.textContent = `${teamA} actual margin: ${signed(teamAMargin)}. Model outlook margin: ${formatSignedProjectionMargin(row.projected_margin_team_a)}. Open the recap to see postgame control margin.`;
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
  setupSiteChrome();
  console.info("CFP Advantage API base:", API_BASE);
  console.info("CFP Advantage environment:", APP_ENVIRONMENT, "| static fallback enabled:", USE_STATIC_FALLBACK);
  if (els.loaderPanel) showStatus("Fetching Matchups...", "Preparing the weekly matchup workspace.", true);
  // Resolve the frozen week even when the featured cards live only on the homepage.
  if (els.fullSlateTable || (els.currentMatchupsPanel && els.currentMatchupsLabel && els.currentMatchupsMessage)) {
    await loadCurrentMatchups();
  }
  await loadProductGuides();
  const pageQuery = new URLSearchParams(window.location.search);
  syncLiveBoardSelection();
  if (els.fullSlateTable && els.fullSlatePrompt) {
    await loadFullSlateTableData();
  } else if (pageQuery.get("full_slate") === "1") {
    await loadFullSlateTableData();
  }
  const linkedGameId = pageQuery.get("game_id");
  if (linkedGameId) openMatchupPreview(linkedGameId);
  hideStatus();
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
if (els.helpClose) els.helpClose.addEventListener("click", closeHelp);
if (els.helpOverlay) els.helpOverlay.addEventListener("click", (event) => {
  if (event.target === els.helpOverlay) closeHelp();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeHelp();
    closeMatchupPreview();
  }
});

if (els.pregameViewTab) els.pregameViewTab.addEventListener("click", () => setWorkspaceView("pregame"));
if (els.postgameViewTab) els.postgameViewTab.addEventListener("click", () => setWorkspaceView("postgame"));
if (els.teamBoardViewTab) els.teamBoardViewTab.addEventListener("click", () => setWorkspaceView("board"));
if (els.explorerViewTab) els.explorerViewTab.addEventListener("click", openExplorer);
if (els.metricsViewTab) els.metricsViewTab.addEventListener("click", () => setWorkspaceView("metrics"));
if (els.termsAcceptButton) els.termsAcceptButton.addEventListener("click", acceptTerms);
if (els.matchupRailPrevious) {
  els.matchupRailPrevious.addEventListener("click", () => scrollMatchupRail(-1));
}
if (els.matchupRailNext) {
  els.matchupRailNext.addEventListener("click", () => scrollMatchupRail(1));
}
if (els.loadLiveScoreboard) els.loadLiveScoreboard.addEventListener("click", loadLiveScoreboard);
if (els.fullSlateInlineSearch) els.fullSlateInlineSearch.addEventListener("input", renderFullSlateTableInline);
if (els.fullSlateTableContent) {
  els.fullSlateTableContent.addEventListener("click", (event) => {
    const loadMoreButton = event.target.closest("[data-full-slate-load-more]");
    if (loadMoreButton) {
      state.fullSlateVisibleCount += FULL_SLATE_PAGE_SIZE;
      renderFullSlateTableInline();
      return;
    }

    const liveBoardButton = event.target.closest("[data-live-board-game]");
    if (liveBoardButton) {
      window.CFPAdvantageScoreboard?.toggleSelection?.(liveBoardButton.dataset.liveBoardGame);
      return;
    }
    const button = event.target.closest("[data-full-slate-game]");
    if (!button) return;
    const matchup = state.fullSlateMatchups.find((row) => String(row.game_id) === String(button.dataset.fullSlateGame));
    if (matchup?.projection_unavailable || matchup?.projection_limited) return;
    if (matchup) {
      state.currentMatchups = [...state.currentMatchups.filter((row) => String(row.game_id) !== String(matchup.game_id)), matchup];
      openMatchupPreview(matchup.game_id);
    }
  });
}
if (els.liveBoardSelectionList) {
  els.liveBoardSelectionList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-live-board-game]");
    if (button) window.CFPAdvantageScoreboard?.toggleSelection?.(button.dataset.removeLiveBoardGame);
  });
}
window.addEventListener("cfp-live-board-change", syncLiveBoardSelection);
if (els.featuredMatchupGrid) {
  els.featuredMatchupGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-matchup-game]");
    if (button) openMatchupPreview(button.dataset.matchupGame);
  });
}
if (els.matchupPreviewModalClose) els.matchupPreviewModalClose.addEventListener("click", closeMatchupPreview);
if (els.matchupPreviewModal) {
  els.matchupPreviewModal.addEventListener("click", (event) => {
    if (event.target === els.matchupPreviewModal) closeMatchupPreview();
  });
}
if (els.season) els.season.addEventListener("change", refreshProductSeason);
[els.tierFilter, els.conferenceFilter, els.rankFilter].filter(Boolean).forEach((filter) => {
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
[els.previewSearchA, els.previewSearchB].filter(Boolean).forEach((input) => input.addEventListener("input", updateMatchupSelectors));
if (els.previewButton) els.previewButton.addEventListener("click", () => renderMatchupPreview().catch((error) => showStatus("Preview Unavailable", error.message, false)));
if (els.viewActualRecapButton) els.viewActualRecapButton.addEventListener("click", () => {
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

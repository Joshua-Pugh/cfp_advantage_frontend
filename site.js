const CONFIG = window.CFP_ADV_CONFIG || {};
const IS_LOCAL_HOST = ["127.0.0.1", "localhost"].includes(window.location.hostname);
const LOCAL_API_OVERRIDE = IS_LOCAL_HOST ? new URLSearchParams(window.location.search).get("api") : "";
const API_BASE = (LOCAL_API_OVERRIDE || CONFIG.API_BASE_URL || "https://cfp-advantage-model-1.onrender.com").replace(/\/$/, "");
const SUPPORT_EMAIL = CONFIG.SUPPORT_EMAIL || "support@cfpadvantage.com";
const DONATE_URL = CONFIG.DONATE_URL || "";
const SHOW_DEV_TOOLS = IS_LOCAL_HOST || CONFIG.ENABLE_DEV_TOOLS === true;
const CACHE_PREFIX = `cfp_adv_api_cache:${CONFIG.APP_VERSION || "dev"}:`;
const CACHE_TTL_MS = IS_LOCAL_HOST ? 0 : 1000 * 60 * 20;

const UNOFFICIAL_RESULTS_PAGE_SIZE = 8;
let unofficialResultsPage = 0;
let unofficialResultsData = [];
let unofficialResultsLogos = {};

const apiMemoryCache = new Map();
const FORCE_REFRESH_KEY = "cfp_adv_force_refresh_until";
const TERMS_ACCEPTED_KEY = "cfp_adv_terms_accepted";
const TERMS_VERSION_KEY = "cfp_adv_terms_version";
const TERMS_ACCEPTED_AT_KEY = "cfp_adv_terms_accepted_at";
const DEFAULT_TERMS_VERSION = "2026-06-01-access-terms-v5";
const TERMS_GATE_MESSAGE = "CFP Advantage provides football intelligence and model-derived context for informational and educational purposes only. CFP Advantage does not guarantee outcomes and is not betting, financial, or professional advice. Free site access is intended for users 13 and older. Purchases, donations, premium content, subscriptions, or other payment transactions are restricted to users 18 or older, or the age of majority in their jurisdiction, whichever is higher. This site uses browser localStorage to remember your terms acknowledgement and display preferences on this device. By selecting Accept And Enter, you agree to the Terms of Use, Privacy Policy, Refund Policy, and Disclaimer.";

function setupSiteChrome() {
  const page = document.body.dataset.page || "";
  const primaryLinks = [
    ["home", "index.html", "Home"],
    ["team", "team.html", "Teams"],
    ["matchups", "matchups.html", "Matchups"],
    ["bracket", "bracket-room.html", "Bracket Room"],
  ];
  const nav = document.querySelector(".page-nav");
  if (nav) {
    nav.classList.add("primary-nav");
    nav.innerHTML = primaryLinks.map(([key, href, label]) => (
      `<a${page === key ? ' class="is-active"' : ""} href="${href}">${label}</a>`
    )).join("");
  }

  const shell = document.querySelector(".app-shell");
  if (!shell) return;
  let footer = shell.querySelector(".site-footer");
  if (!footer) {
    footer = document.createElement("footer");
    footer.className = "site-footer";
    shell.appendChild(footer);
  }
  footer.innerHTML = `
    <div class="footer-brand">
      <strong>CFP Advantage</strong>
      <p>Advantage Through Contextual Football Profiles.</p>
      <small>Independent football intelligence platform. Not affiliated with the CFP, NCAA, conferences, or universities.</small>
    </div>
    <nav class="footer-links" aria-label="Reference and legal pages">
      <a href="about.html">About</a>
      <a href="live-2026.html">2026 Live</a>
      <a href="learn.html">Learn</a>
      <button type="button" data-open-contact>Contact</button>
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
  installContactModal();
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
  "ADV SRS": ["ADV Strength Rating (ADV SRS)", "CFP Advantage's primary team-strength rating. It measures how strong a team has been throughout the season after adjusting for opponent quality."],
  "OFF ADV SRS": ["Offensive ADV Strength Rating (OFF ADV SRS)", "Measures offensive strength through drive control, scoring opportunity creation, and sustained execution."],
  "DEF ADV SRS": ["Defensive ADV Strength Rating (DEF ADV SRS)", "Measures defensive strength by limiting opponent control, drive success, and scoring opportunities."],
  "SP ADV SRS": ["Special Teams ADV", "Special-teams context that captures field-position swings and discrete special-teams events."],
  "SP ADV": ["Special Teams ADV", "Special-teams context that captures field-position swings and discrete special-teams events."],

  "ADV Expected Margin": ["ADV Expected Margin", "The model's projected scoring margin between two teams based on their ADV profiles."],
  "ADV Deserved Margin": ["ADV Deserved Margin", "A postgame measure of how the game was controlled on the field."],
  "Scoreboard vs ADV Gap": ["Scoreboard vs ADV Gap", "Compares the final score to the ADV Deserved Margin."],

  "ADV SOS": ["Schedule Strength", "Measures schedule difficulty using CFP Advantage team-strength ratings. Higher values indicate stronger competition."],
  "Control Rate": ["Control Rate (CR)", "Measures how consistently a team creates meaningful football control from game to game."],
  "CR": ["Control Rate (CR)", "Measures how consistently a team creates meaningful football control from game to game."],
  "DCE": ["Scoreboard Control Gap", "Compares a team's actual average scoring margin with the margin suggested by its underlying ADV control profile. Positive values mean the scoreboard has run ahead of control; negative values mean control has been stronger than the scoreboard results."],
  "Drive Conversion Efficiency (DCE)": ["Scoreboard Control Gap", "Compares a team's actual average scoring margin with the margin suggested by its underlying ADV control profile. Positive values mean the scoreboard has run ahead of control; negative values mean control has been stronger than the scoreboard results."],
  "ADV Drive Conversion": ["Control Finish Rate", "Measures how often meaningful control drives are converted into points."],
  "Control Finish Rate": ["Control Finish Rate", "Measures how often meaningful control drives are converted into points."],
  "Velocity / Trend Pressure": ["Recent Form", "Shows whether a team's recent efficiency is improving, declining, or staying stable compared with its earlier-season form."],
  "Trend Pressure": ["Recent Form", "Shows whether a team's recent efficiency is improving, declining, or staying stable compared with its earlier-season form."],
  "Talent Yield Index": ["Talent Yield Index (TYI)", "Compares a team's on-field performance to its roster expectations."],
  "Talent Yield / TYI": ["Talent Yield Index (TYI)", "Compares a team's on-field performance to its roster expectations."],
  "Rolling Talent Yield (TYI)": ["Rolling Talent Yield (TYI)", "Compares current on-field performance to roster expectation as the season develops."],
  "Weak-Side Profile": ["Weak-Side Profile", "Shows whether a team has enough strength on its weaker side of the ball to avoid being one-dimensional."],

  "Bracket Path Probability": ["Title Probability", "The probability of reaching or winning through the playoff path based on CFP Advantage simulations."],
  "Projected Path": ["Projected Path", "Shows whether a team's playoff route appears easier, balanced, or tougher compared with other contenders."],
  "Close Matchup Risk": ["Projection Closeness", "Shows how narrow the expected-margin projection is. It is a closeness index, not an upset probability."],
};

const COMPARISON_DISPLAY = {
  "Total Yards": "Total offensive yardage gained.",
  "Yards Per Play": "Average yards gained per offensive play.",
  "Passing Yards": "Yards gained through the passing game.",
  "Rushing Yards": "Yards gained through the running game.",
  "Explosive Plays": "High-impact plays that create large chunks of field position or scoring opportunity.",
  "Points Per Drive": "Average points produced per offensive drive.",
  "First Downs": "How often an offense extends possessions by earning a new set of downs.",
  "Third/Fourth Down Conversions": "How often an offense converts critical downs to keep drives alive.",
  "Red Zone Efficiency": "How often a team turns red zone trips into points and touchdowns.",
  "Turnover Margin": "Difference between takeaways and giveaways.",
  "Penalties / Penalty Yards": "Penalty volume and field-position cost.",
  "Sacks / TFL": "Negative-play pressure created or allowed.",
  "Kick/Punt Returns": "Return-yard context for special teams field position.",
  "Time of Possession": "How long a team controlled the football.",
  "Garbage-Time / Leverage Tags": "Game-state context that separates meaningful competitive possessions from lower-leverage possessions.",
};

const BRACKET_FRAMEWORK_LABELS = {
  control_creation: "Control Creation",
  control_denial: "Control Denial",
  control_finish: "Control Finish Rate",
  control_drive_shutout: "Control Drive Shutout Rate",
  control_production: "Control Pressure",
  defensive_control_production_allowed: "Control Pressure Allowed",
};

function $(id) {
  return document.getElementById(id);
}

function forceRefreshActive() {
  try {
    return Number(window.sessionStorage.getItem(FORCE_REFRESH_KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}

function clearApiCache() {
  apiMemoryCache.clear();
  try {
    Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith("cfp_adv_api_cache:"))
      .forEach((key) => window.sessionStorage.removeItem(key));
  } catch (error) {
    console.warn("CFP Advantage cache clear unavailable:", error.message);
  }
}

function refreshPageData() {
  clearApiCache();
  try {
    window.sessionStorage.setItem(FORCE_REFRESH_KEY, String(Date.now() + 30000));
  } catch (error) {
    console.warn("CFP Advantage refresh flag unavailable:", error.message);
  }
  window.location.reload();
}

async function api(path) {
  const forceRefresh = forceRefreshActive();
  const key = `${CACHE_PREFIX}${path}`;
  if (!forceRefresh) {
    const memory = apiMemoryCache.get(key);
    if (memory && Date.now() - memory.stored_at < CACHE_TTL_MS) {
      return memory.data;
    }
    try {
      const cached = JSON.parse(window.sessionStorage.getItem(key) || "null");
      if (cached && Date.now() - cached.stored_at < CACHE_TTL_MS) {
        apiMemoryCache.set(key, cached);
        return cached.data;
      }
    } catch (error) {
      console.warn("CFP Advantage cache read unavailable:", error.message);
    }
  }
  const fetchOptions = forceRefresh
    ? { cache: "no-store", headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } }
    : { cache: "default" };
  const response = await fetch(`${API_BASE}${path}`, fetchOptions);
  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}`);
  }
  const data = await response.json();
  apiMemoryCache.set(key, { stored_at: Date.now(), data });
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ stored_at: Date.now(), data }));
  } catch (error) {
    console.warn("CFP Advantage cache write unavailable:", error.message);
  }
  return data;
}

function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "-";
}

function formatProjectionMargin(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  const rounded = Math.sign(number) * (Math.round((Math.abs(number) + Number.EPSILON) * 2) / 2);
  return rounded.toFixed(1);
}


function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  const pct = Math.abs(number) <= 1 ? number * 100 : number;
  return `${pct.toFixed(digits)}%`;
}

function formatSignedPercentPoints(value, digits = 1) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  const pct = Math.abs(number) <= 1 ? number * 100 : number;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(digits)} pts`;
}

function formatOptionalNumber(value, digits = 1) {
  return value === null || value === undefined || value === "" ? "" : formatNumber(value, digits);
}

function talentYieldDisplay(talentYield = {}) {
  const label = String(talentYield.label || "-");
  const unavailable = label.toLowerCase() === "not available";
  return {
    label,
    value: unavailable ? "" : formatOptionalNumber(talentYield.value, 2),
  };
}

function talentYieldLabelFromValue(value) {
  const parsed = numberOrNull(value);
  if (parsed === null) return "-";
  if (parsed >= 1.0) return "Well Above Expectation";
  if (parsed >= 0.25) return "Above Expectation";
  if (parsed > -0.25) return "Near Expectation";
  if (parsed > -1.0) return "Below Expectation";
  return "Well Below Expectation";
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

function metricHelpButton() {
  return `<button class="metric-help-toggle" type="button" aria-expanded="false">What do these mean?</button>`;
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

const teamStatLabels = {
  yards_per_game: "Yards / Game",
  yards_allowed_per_game: "Yards Allowed / Game",
  yards_differential_per_game: "Yard Differential / Game",
  points_per_drive: "Points / Drive",
  points_per_game: "Points / Game",
  opp_points_per_game: "Opp Points / Game",
  red_zone_score_rate: "Red Zone Score Rate",
  third_down_rate: "Third Down Rate",
  turnover_margin: "Turnover Margin",
  scoring_conversion_rate: "Control Finish Rate",
  drive_conversion_rate: "Drive Conversion Rate",
  avg_starting_field_position: "Avg Starting Field Position",
  time_of_possession: "Time of Possession",
  completion_rate: "Completion Rate",
  field_goal_rate: "Field Goal Rate",
};

function prettyStatLabel(key) {
  return teamStatLabels[key] || String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (chr) => chr.toUpperCase());
}

function formatTeamStatValue(key, value) {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = Number(value);
  const percentKeys = new Set([
    "third_down_rate",
    "red_zone_score_rate",
    "scoring_conversion_rate",
    "drive_conversion_rate",
    "completion_rate",
    "field_goal_rate",
  ]);
  const signedKeys = new Set([
    "turnover_margin",
    "yards_differential_per_game",
  ]);
  if (percentKeys.has(key)) {
    return `${formatNumber(Number(value) * 100, 1)}%`;
  }
  if (signedKeys.has(key) && Number.isFinite(numeric)) {
    return signed(numeric);
  }
  if (Number.isFinite(numeric)) {
    return Number.isInteger(numeric) ? String(numeric) : formatNumber(numeric, 1);
  }
  return escapeHtml(value);
}

function buildTeamStatRows(stats = {}, conversion = {}) {
  const primaryOrder = [
    "yards_per_game",
    "yards_allowed_per_game",
    "yards_differential_per_game",
    "points_per_game",
    "points_per_drive",
    "scoring_conversion_rate",
    "drive_conversion_rate",
    "red_zone_score_rate",
    "third_down_rate",
    "turnover_margin",
  ];
  const rows = [];
  const added = new Set();

  const addRow = (key, value) => {
    if (value === null || value === undefined || value === "") return;
    added.add(key);
    rows.push(
      `<div><span>${escapeHtml(prettyStatLabel(key))}</span><strong>${escapeHtml(formatTeamStatValue(key, value))}</strong></div>`
    );
  };

  primaryOrder.forEach((key) => {
    if (key in stats) addRow(key, stats[key]);
    else if (key in conversion) addRow(key, conversion[key]);
  });

  Object.entries(stats).forEach(([key, value]) => {
    if (!added.has(key)) addRow(key, value);
  });
  Object.entries(conversion).forEach(([key, value]) => {
    if (!added.has(key)) addRow(key, value);
  });
  return rows.join("");
}

function setStatus(message, tone = "") {
  const el = $("pageStatus");
  if (!el) return;
  el.textContent = message;
  el.className = `page-status ${tone}`.trim();
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

function ensureTermsGate(message, version) {
  if (document.body.dataset.page === "legal") return;
  const termsVersion = version || DEFAULT_TERMS_VERSION;
  const accepted = storageGet(TERMS_ACCEPTED_KEY) === "true";
  const acceptedVersion = storageGet(TERMS_VERSION_KEY);
  if (accepted && acceptedVersion === termsVersion) return;

  let gate = $("termsBanner");
  if (!gate) {
    gate = document.createElement("section");
    gate.id = "termsBanner";
    gate.className = "terms-banner";
    gate.setAttribute("aria-label", "Terms acknowledgement");
    document.body.appendChild(gate);
  }
  gate.innerHTML = `
    <div class="terms-card">
      <p class="eyebrow">CFP Advantage Terms</p>
      <h2>Age & Terms Acknowledgement</h2>
      <p id="termsBannerText">${escapeHtml(message || TERMS_GATE_MESSAGE)}</p>
      <div class="terms-actions">
        <button id="termsAcceptButton" type="button">Accept And Enter</button>
        <a href="legal.html">Read Legal Terms</a>
      </div>
    </div>
  `;
  gate.classList.remove("is-hidden");
  document.body.classList.add("terms-locked");
  $("termsAcceptButton").addEventListener("click", () => {
    storageSet(TERMS_ACCEPTED_KEY, "true");
    storageSet(TERMS_VERSION_KEY, termsVersion);
    storageSet(TERMS_ACCEPTED_AT_KEY, new Date().toISOString());
    gate.classList.add("is-hidden");
    document.body.classList.remove("terms-locked");
  });
}

async function loadTermsGate() {
  try {
    const legal = await api("/api/legal/acknowledgement");
    ensureTermsGate(TERMS_GATE_MESSAGE, legal.terms_version);
  } catch (error) {
    ensureTermsGate(TERMS_GATE_MESSAGE, DEFAULT_TERMS_VERSION);
  }
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
    <article class="guide-card">
      <div class="guide-card-topline">
        <span>${escapeHtml(metric.group || "Metric")}</span>
        ${metric.validation?.status ? `<em>${escapeHtml(metric.validation.status)}</em>` : ""}
      </div>
      <h4>${escapeHtml(publicMetricName(metric.name))}</h4>
      <p>${escapeHtml(publicMetricDescription(metric))}</p>
      ${renderMetricValidation(metric.validation)}
    </article>
  `).join("");
}

function renderMetricValidation(validation) {
  if (!validation) return "";
  return `
    <div class="metric-validation">
      <strong>${escapeHtml(validation.label || "Tested")}</strong>
      <p>${escapeHtml(validation.summary || "Historical testing available.")}</p>
    </div>
  `;
}

function renderComparisonStats(target, rows) {
  const hiddenStats = new Set(["ADV Drive Conversion", "Control Finish Rate"]);
  const visibleRows = rows.filter((stat) => !hiddenStats.has(stat.name));

  const el = $(target);
  if (!el) return;

  el.innerHTML = visibleRows.map((stat) => `
    <article class="guide-card compact">
      <span>${escapeHtml(stat.group || "Stat")}</span>
      <h4>${escapeHtml(publicMetricName(stat.name))}</h4>
      <p>${escapeHtml(publicMetricDescription(stat))}</p>
    </article>
  `).join("");
}

function publicMetricName(name) {
  return publicProfileSummary(METRIC_DISPLAY[name]?.[0] || name);
}

function publicMetricDescription(metric) {
  return METRIC_DISPLAY[metric.name]?.[1]
    || COMPARISON_DISPLAY[metric.name]
    || metric.plain_english
    || metric.note
    || "Football context metric used to compare teams and games.";
}

async function loadMetricPage() {
  setStatus("Loading metric catalog...");
  const [metrics, stats] = await Promise.all([
    api("/api/product-a/metric-catalog"),
    api("/api/product-a/comparison-stats"),
  ]);
  renderMetricCards("metricCatalogGrid", metrics.metrics || []);
  renderComparisonStats("comparisonStatsGrid", stats.stats || []);
  setStatus("Metric catalog loaded.", "ok");
}

async function loadHistoricalPage() {
  setStatus("Loading seasons...");
  const seasonsPayload = await api("/api/seasons");
  const seasons = (seasonsPayload.seasons || []).filter((season) => Number(season) >= 2016 && Number(season) <= 2025);
  const seasonSelect = $("seasonSelect");
  seasonSelect.innerHTML = seasons.map((season) => `<option value="${season}">${season}</option>`).join("");
  seasonSelect.value = String(seasons[0] || "");
  await populateHistoricalTeams();
  seasonSelect.addEventListener("change", populateHistoricalTeams);
  $("teamASelect").addEventListener("change", populateHistoricalGames);
  $("buildHistoricalButton").addEventListener("click", buildHistoricalMatchup);
  setStatus("Historical matchup builder ready.", "ok");
}

async function populateHistoricalTeams() {
  const season = $("seasonSelect").value;
  if (!season) return;
  const payload = await api(`/api/product-a/team-board?season=${encodeURIComponent(season)}`);
  const teams = (payload.teams || payload.rows || [])
    .filter((row) => row.team)
    .sort((left, right) => String(left.team).localeCompare(String(right.team)));
  window.__historicalTeams = teams;
  const options = teams.map((team) => `<option value="${team.team}">${team.team}</option>`).join("");
  $("teamASelect").innerHTML = options;
  await populateHistoricalGames();
}

function presentScore(value) {
  if (value === 0 || value === "0") return "0";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function historicalGameLabel(row) {
  const week = row.display_week || row.week || "Game";
  const opponent = row.opponent || "-";
  const homeAway = row.is_neutral ? "vs" : row.is_home ? "vs" : "at";
  const result = row.result_w_l ? `${row.result_w_l} ` : "";
  const score = `${presentScore(row.team_score)}-${presentScore(row.opponent_score)}`;
  const date = row.date ? ` | ${row.date}` : "";
  return `${week} | ${homeAway} ${opponent} | ${result}${score}${date}`;
}

async function populateHistoricalGames() {
  const season = $("seasonSelect").value;
  const team = $("teamASelect").value;
  const gameSelect = $("historicalGameSelect");
  if (!season || !team || !gameSelect) return;
  setStatus(`Loading ${team} ${season} schedule...`);
  const payload = await api(`/api/team/${encodeURIComponent(season)}/${encodeURIComponent(team)}/schedule?view=full`);
  const games = (payload.schedule || [])
    .filter((row) => row.opponent)
    .sort((left, right) => Number(left.game_order || 999) - Number(right.game_order || 999));
  window.__historicalGames = games;
  gameSelect.innerHTML = games.length
    ? games.map((row, index) => `<option value="${index}">${escapeHtml(historicalGameLabel(row))}</option>`).join("")
    : '<option value="">No games available</option>';
  setStatus(games.length ? "Choose an actual game from this team's schedule." : "No games available for this team.", games.length ? "ok" : "warn");
}

async function buildHistoricalMatchup() {
  const season = $("seasonSelect").value;
  const teamA = $("teamASelect").value;
  const selectedGame = (window.__historicalGames || [])[Number($("historicalGameSelect").value)];
  const teamB = selectedGame?.opponent;
  if (!season || !teamA || !teamB || teamA === teamB) {
    setStatus("Choose a season, team, and actual game.", "warn");
    return;
  }
  setStatus("Building pregame snapshot...");
  try {
    const payload = await api(`/api/product-a/historical-matchup?season=${encodeURIComponent(season)}&team=${encodeURIComponent(teamA)}&game_id=${encodeURIComponent(selectedGame.game_id)}`);
    renderHistoricalSnapshot(payload, selectedGame);
    setStatus("Historical pregame snapshot loaded.", "ok");
  } catch (error) {
    const recapButton = selectedGame?.game_id && truthyValue(selectedGame?.has_adv_recap)
      ? `<button class="secondary-button compact-action" type="button" data-recap-game="${escapeHtml(String(selectedGame.game_id))}">View Recap</button>`
      : "";
    $("historicalResult").innerHTML = `
      <div class="insight-panel">
        <p class="eyebrow">${escapeHtml(season)} Historical Game</p>
        <h2>${escapeHtml(teamA)} vs ${escapeHtml(teamB)}</h2>
        <p class="interpretation">A rolling pregame snapshot is not available for this selected game yet.</p>
        ${recapButton}
      </div>
    `;
    setStatus(error.message, "warn");
  }
}

function historicalContextCard(title, context) {
  if (!context) {
    return `
      <div class="context-callout">
        <h3>${escapeHtml(title)}</h3>
        <p>Qualified rolling pregame context is not available for this side of the matchup.</p>
      </div>
    `;
  }
  context = completeControlContext(context);
  const hasPriorGames = Number(context.games_before_target) > 0;
  if (!hasPriorGames) {
    return `
      <div class="context-callout">
        <h3>${escapeHtml(title)}</h3>
        <p class="interpretation">This was the team's first game. The pregame rating uses the frozen Week 0 anchor built from reliable prior-season ADV strength and talent-implied ADV. Current-season Control Framework, TYI, and Recent Form metrics are intentionally unavailable before a team has played.</p>
        <div class="summary-grid">
          <div><span>Week 0 ADV Rating</span><strong>${formatNumber(context.pregame_adv_rating, 2)}</strong><small>Frozen preseason anchor</small></div>
          <div><span>Anchor Inputs</span><strong>Prior ADV + Roster Talent</strong></div>
          <div><span>Current-Season Context</span><strong>Not Yet Available</strong></div>
          <div><span>Current-Season Games Before Target</span><strong>0</strong></div>
        </div>
      </div>
    `;
  }
  return `
    <div class="context-callout">
      <h3>${escapeHtml(title)}</h3>
      <div class="summary-grid">
        <div><span>Pregame ADV Rating</span><strong>${formatNumber(context.pregame_adv_rating, 2)}</strong><small>${escapeHtml(pregameRatingSourceLabel(context))}</small></div>
        <div><span>Weekly ADV SRS</span><strong>${formatNumber(context.rolling_adv_srs, 2)}</strong></div>
        <div><span>Control Rate (CR)</span><strong>${formatPercent(context.rolling_cr, 2)}</strong></div>
        <div><span>Control Creation</span><strong>${formatPercent(context.rolling_control_creation_rate, 2)}</strong></div>
        <div><span>Control Denial</span><strong>${formatPercent(context.rolling_control_denial_rate, 2)}</strong></div>
        <div><span>Control Finish Rate</span><strong>${formatPercent(context.rolling_control_finish_rate, 2)}</strong></div>
        <div><span>Control Drive Shutout Rate</span><strong>${formatPercent(context.rolling_finishing_resistance, 2)}</strong><small>Share of opponent control drives held scoreless</small></div>
        <div><span>Control Pressure Per Offensive Drive</span><strong>${formatNumber(context.rolling_control_production_rate, 2)}</strong><small>ADV-derived pressure across ${formatNumber(context.rolling_offensive_drives, 0)} offensive drives</small></div>
        <div><span>Control Pressure Allowed Per Defensive Drive</span><strong>${formatNumber(context.rolling_defensive_control_production_allowed, 2)}</strong><small>Pressure allowed across ${formatNumber(context.rolling_defensive_drives, 0)} defensive drives · Lower is better</small></div>
        <div><span>Creation Waste</span><strong>${formatPercent(context.rolling_creation_waste_rate, 2)}</strong></div>
        <div><span>Finish Waste</span><strong>${formatPercent(context.rolling_finish_waste_rate, 2)}</strong></div>
        <div><span>Scoreboard Control Gap</span><strong>${formatNumber(context.rolling_dce, 2)}</strong></div>
        <div><span>ADV Schedule Rating</span><strong>${formatNumber(context.rolling_adv_sos, 2)}</strong></div>
        <div><span>Recent Form</span><strong>${escapeHtml(trajectoryPublicLabel(context.isolated_block_velocity_label || context.trajectory_bucket))}</strong></div>
        <div><span>Talent Yield Index (TYI)</span><strong>${formatNumber(context.talent_yield_index, 2)}</strong></div>
        <div><span>Games Before Target</span><strong>${escapeHtml(context.games_before_target ?? "-")}</strong></div>
      </div>
    </div>
  `;
}

function renderHistoricalSnapshot(payload, selectedGame) {
  const season = payload.season || $("seasonSelect").value;
  const teamA = payload.selected_team || $("teamASelect").value;
  const teamB = payload.opponent || selectedGame?.opponent || "-";
  const teamContext = payload.team_context;
  const opponentContext = payload.opponent_context;
  const marginTeamA = Number(payload.projected_margin_team);
  const marginText = Number.isFinite(marginTeamA)
    ? `${marginTeamA >= 0 ? teamA : teamB} by ${formatProjectionMargin(Math.abs(marginTeamA))}`
    : "-";
  const homeFieldContext = Number(teamContext?.home_field_adjustment_team);
  const marginContextNote = Number.isFinite(homeFieldContext) && Math.abs(homeFieldContext) > 0
    ? ` The expected margin includes ${Math.abs(homeFieldContext).toFixed(1)} points of home-field context.`
    : "";
  const recapButton = selectedGame?.game_id && truthyValue(selectedGame?.has_adv_recap)
    ? `<button class="secondary-button compact-action" type="button" data-recap-game="${escapeHtml(String(selectedGame.game_id))}">View Recap</button>`
    : "";
  $("historicalResult").innerHTML = `
    <div class="insight-panel">
      <p class="eyebrow">Pregame Model Snapshot</p>
      <h2>${escapeHtml(teamA)} vs ${escapeHtml(teamB)}</h2>
      <div class="summary-grid">
        <div><span>Actual Game</span><strong>${escapeHtml(historicalGameLabel(selectedGame))}</strong></div>
        <div><span>Model Lean</span><strong>${escapeHtml(payload.projected_winner || "-")}</strong></div>
        <div><span>Projected Margin</span><strong>${escapeHtml(marginText)}</strong></div>
        <div><span>Confidence Bucket</span><strong>${escapeHtml(payload.confidence_bucket || "-")}</strong></div>
        <div><span>Context Coverage</span><strong>${payload.qualified_context_available ? "Both Teams" : payload.partial_context_available ? "Partial" : "Limited"}</strong></div>
      </div>
      <p class="interpretation">${escapeHtml(payload.context_note || "This snapshot uses rolling pregame context where available.")}${escapeHtml(marginContextNote)}</p>
      ${historicalContextCard(`${teamA} Pregame Context`, teamContext)}
      ${historicalContextCard(`${teamB} Pregame Context`, opponentContext)}
      <div class="context-callout">
        <h3>Game Recap</h3>
        <p>Open the recap to compare the pregame snapshot with what happened on the field.</p>
        ${recapButton || "<p>No ADV recap is available for this game.</p>"}
      </div>
    </div>
  `;
}
async function loadBracketPage() {
  setStatus("Loading Bracket Room...");
  let seasonsPayload;
  try {
    seasonsPayload = await api("/api/product-a/bracket-room/seasons");
  } catch (error) {
    seasonsPayload = await api("/api/seasons");
  }
  const seasons = (seasonsPayload.seasons || []).slice().sort((a, b) => Number(b) - Number(a));
  const select = $("bracketSeasonSelect");
  if (select) {
    select.innerHTML = seasons.map((season) => `<option value="${escapeHtml(season)}">${escapeHtml(season)}</option>`).join("");
    if (!select.dataset.bound) {
      select.addEventListener("change", () => renderBracketSeason(select.value));
      select.dataset.bound = "true";
    }
  }
  const season = select?.value || seasons[0];
  if (!season) {
    setStatus("No seasons returned by API.", "warn");
    return;
  }
  await renderBracketSeason(season);
}

function pathContextLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  if (number >= 0.10) return "Clear Path Edge";
  if (number >= 0.03) return "Slight Path Edge";
  if (number > -0.03) return "Balanced Path";
  if (number > -0.07) return "Tough Path";
  return "Very Tough Path";
}

async function renderBracketSeason(season) {
  setStatus(`Loading ${season} Bracket Room...`);
  const [payload, logos] = await Promise.all([
    api(`/api/product-a/bracket-room?season=${encodeURIComponent(season)}`),
    loadTeamLogoCatalog(),
  ]);
  activeTeamLogos = logos;
  let treePayload = { tree: [] };
  try {
    treePayload = await api(`/api/product-a/bracket-room/tree?season=${encodeURIComponent(season)}`);
  } catch (error) {
    console.warn("Bracket tree unavailable:", error.message);
  }
  const summary = payload.summary || {};
  const titleRows = (payload.title_probabilities || []).slice(0, 12);
  const leverageRows = (payload.team_leverage || []).slice(0, 12);
  const treeRows = treePayload.tree || [];
  const frameworkRows = treeRows.filter((row) => row.diagnostic?.framework_read?.label && row.diagnostic.framework_read.label !== "Framework Unavailable").length;
  const rows = leverageRows.length ? leverageRows : titleRows;
  $("bracketSummary").innerHTML = `
    <div class="summary-grid">
      <div><span>Season</span><strong>${escapeHtml(season)}</strong></div>
      <div><span>Title Favorite</span><strong>${escapeHtml(summary.title_favorite || titleRows[0]?.team || "-")}</strong></div>
      <div><span>Favorite Probability</span><strong>${formatNumber((summary.title_favorite_probability ?? titleRows[0]?.title_probability) * 100, 1)}%</strong></div>
      <div><span>Actual Champion</span><strong>${escapeHtml(summary.actual_champion || "-")}</strong></div>
      <div><span>Champion Probability Rank</span><strong>${escapeHtml(summary.actual_champion_probability_rank || "-")}</strong></div>
      <div><span>Bracket Diagnostics</span><strong>${escapeHtml(`${frameworkRows}/${treeRows.length}`)}</strong><small>Official-path matchups with framework reads</small></div>
    </div>
  `;
  renderRows("bracketTable", rows, [
    { label: "Title Rank", render: (row) => row.title_probability_rank ?? row.adv_srs_rank ?? "-" },
    { label: "Team", render: (row) => `<span class="team-name-with-logo">${teamLogoMarkup(row.team, activeTeamLogos)}${escapeHtml(row.team)}</span>` },
    { label: "Seed", key: "seed" },
    { label: "ADV SRS", render: (row) => formatNumber(row.adv_srs, 2) },
    { label: "Title Probability", render: (row) => `${formatNumber(Number(row.title_probability) * 100, 1)}%` },
    { label: "Projected Path", render: (row) => pathContextLabel(row.path_leverage_index) },
    { label: "Control Profile", render: (row) => bracketControlProfileLabel(row.control_profile) },
  ]);
  renderBracketTree(treeRows);
  setStatus(`${season} Bracket Room loaded.`, "ok");
}

function renderBracketTree(rows) {
  const target = $("bracketTree");
  if (!target) return;
  if (!rows.length) {
    target.innerHTML = '<div class="empty-state compact">No bracket tree available for this season.</div>';
    return;
  }
  const roundLabels = {
    cfp_first_round: "First Round",
    cfp_quarterfinal: "Quarterfinals",
    cfp_semifinal: "Semifinals",
    cfp_semifinal_four_team: "Semifinals",
    national_championship: "Championship",
    national_championship_four_team: "Championship",
  };
  const byRound = rows.reduce((acc, row) => {
    const key = row.round_name || "round";
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {});
  target.innerHTML = Object.entries(byRound).map(([round, games]) => `
    <section class="bracket-round">
      <h3>${escapeHtml(roundLabels[round] || round)}</h3>
      ${games.map((game) => bracketGameCard(game)).join("")}
    </section>
  `).join("");
  target.querySelectorAll("[data-bracket-game]").forEach((button) => {
    button.addEventListener("click", () => {
      const game = rows.find((row) => row.game_key === button.dataset.bracketGame);
      if (game) openBracketDiagnostic(game);
    });
  });
}

function bracketTeamLabel(side) {
  const seed = side.seed ? `${side.seed} ` : "";
  const display = String(side.display || "");
  const team = String(side.team || "");
  const name = team && display.startsWith("Winner of ") ? team : display || team || "-";
  return `${seed}${name}`;
}

function bracketGameCard(game) {
  const prob = game.probability || {};
  const favorite = prob.favorite || "-";
  const winPct = prob.favorite_win_probability ? `${formatNumber(Number(prob.favorite_win_probability) * 100, 1)}%` : "-";
  const frameworkRead = game.diagnostic?.framework_read?.label || "Framework Unavailable";
  return `
    <button class="bracket-game-card" type="button" data-bracket-game="${escapeHtml(game.game_key)}">
      <span class="team-name-with-logo">${teamLogoMarkup(game.team_a?.team || game.team_a?.display, activeTeamLogos)}<span class="bracket-team-name">${escapeHtml(bracketTeamLabel(game.team_a || {}))}</span></span>
      <span class="team-name-with-logo">${teamLogoMarkup(game.team_b?.team || game.team_b?.display, activeTeamLogos)}<span class="bracket-team-name">${escapeHtml(bracketTeamLabel(game.team_b || {}))}</span></span>
      <small>Model lean: ${escapeHtml(favorite)} (${escapeHtml(winPct)})</small>
      <em>${escapeHtml(frameworkRead)}</em>
    </button>
  `;
}

function openBracketDiagnostic(game) {
  const modal = $("bracketModal");
  const content = $("bracketModalContent");
  if (!modal || !content) return;
  const prob = game.probability || {};
  const teamA = game.diagnostic?.team_a || {};
  const teamB = game.diagnostic?.team_b || {};
  const frameworkRead = game.diagnostic?.framework_read || {};
  content.innerHTML = `
    <p class="eyebrow">Matchup Diagnostic</p>
    <h2>${escapeHtml(bracketTeamLabel(game.team_a || {}))} vs ${escapeHtml(bracketTeamLabel(game.team_b || {}))}</h2>
    <div class="summary-grid">
      <div><span>Model Lean</span><strong>${escapeHtml(prob.favorite || "-")}</strong></div>
      <div><span>Projected Margin</span><strong>${formatProjectionMargin(prob.projected_margin_team_a)}</strong></div>
      <div><span>Favorite Win Probability</span><strong>${prob.favorite_win_probability ? `${formatNumber(Number(prob.favorite_win_probability) * 100, 1)}%` : "-"}</strong></div>
      <div><span>Opponent Chance</span><strong>${prob.upset_risk ? `${formatNumber(Number(prob.upset_risk) * 100, 1)}%` : "-"}</strong></div>
    </div>
    <div class="insight-panel bracket-framework-read">
      <p class="eyebrow">Full Control Framework</p>
      <h3>${escapeHtml(frameworkRead.label || "Framework Unavailable")}</h3>
      <p class="interpretation">${escapeHtml(frameworkRead.note || "The full Control Framework is not available for both teams in this matchup.")}</p>
      ${bracketFrameworkAdvantages(frameworkRead, teamA.team, teamB.team)}
      <p class="guide-note">This read explains matchup mechanics. It does not change the displayed title or game probabilities.</p>
    </div>
    <div class="diagnostic-grid">
      ${diagnosticProfile(teamA)}
      ${diagnosticProfile(teamB)}
    </div>
    <p class="interpretation">This matchup view highlights team strength, schedule path, control consistency, and finishing profile through the CFP Advantage model lens.</p>
  `;
  modal.classList.remove("is-hidden");
  content.querySelectorAll(".metric-help-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const panel = button.nextElementSibling;
    const isHidden = panel.classList.toggle("is-hidden");
    button.setAttribute("aria-expanded", String(!isHidden));
  });
});
  const close = $("bracketModalClose");
  if (close && !close.dataset.bound) {
    close.addEventListener("click", closeBracketDiagnostic);
    close.dataset.bound = "true";
  }
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeBracketDiagnostic();
  }, { once: true });
}

function diagnosticProfile(team) {
  const profile = team.control_profile || {};
  const metrics = profile.metrics || {};
  const talentYield = talentYieldDisplay(profile.talent_yield);
  return `
    <article class="insight-panel compact bracket-diagnostic-card">
      <h3 class="team-name-with-logo">${teamLogoMarkup(team.team, activeTeamLogos)}${escapeHtml(team.seed ? `${team.seed} ${team.team}` : team.team || "-")}</h3>
      <div class="bracket-profile-identity">
        <strong>${escapeHtml(profile.identity || "Framework Unavailable")}</strong>
        <small>${escapeHtml(publicProfileSummary(profile.summary || profile.note))}</small>
      </div>
      ${bracketFrameworkGrid(profile)}
      <div class="summary-grid mini bracket-context-grid">
        <div><span>Frozen Pregame ADV</span><strong>${formatNumber(team.adv_srs, 1)}</strong><small>Opponent-adjusted strength before the CFP</small></div>
        <div><span>ADV Rank</span><strong>${escapeHtml(team.adv_srs_rank ?? "-")}</strong></div>
        <div><span>Control Rate (CR)</span><strong>${formatPercent(profile.control_rate ?? team.cr)}</strong></div>
        <div><span>ADV Schedule Rating</span><strong>${formatNumber(team.adv_schedule_rating, 1)}</strong></div>
        <div><span>Control Foundation</span><strong>${escapeHtml(profile.foundation?.label || "-")}</strong><small>${escapeHtml(percentileLabel(profile.foundation?.percentile) || "")}</small></div>
        <div><span>Conversion Profile</span><strong>${escapeHtml(profile.conversion?.label || "-")}</strong><small>${escapeHtml(percentileLabel(profile.conversion?.percentile) || "")}</small></div>
        <div><span>Control Pressure Per Offensive Drive</span><strong>${formatNumber(metrics.control_production?.value, 2)}</strong><small>Sustainable scoring pressure across ${formatNumber(profile.offensive_drives, 0)} offensive drives</small></div>
        <div><span>Control Pressure Allowed Per Defensive Drive</span><strong>${formatNumber(metrics.defensive_control_production_allowed?.value, 2)}</strong><small>Sustained pressure allowed across ${formatNumber(profile.defensive_drives, 0)} defensive drives · Lower is better</small></div>
        <div><span>Creation Waste</span><strong>${formatPercent(profile.creation_waste)}</strong></div>
        <div><span>Finish Waste</span><strong>${formatPercent(profile.finish_waste)}</strong></div>
        <div><span>Talent Yield</span><strong>${escapeHtml(talentYield.label)}</strong><small>${escapeHtml(talentYield.value)}</small></div>
        <div><span>Recent Form</span><strong>${escapeHtml(profile.recent_form?.label || "Not Enough Games")}</strong><small>${escapeHtml(profile.recent_form?.note || "")}</small></div>
      </div>

      <button class="metric-help-toggle" type="button" aria-expanded="false">What do these mean?</button>

      <div class="metric-help-panel is-hidden">
        <p><strong>Frozen Pregame ADV:</strong> Opponent-adjusted team strength available before the first CFP game.</p>
        <p><strong>ADV Rank:</strong> National rank by ADV SRS.</p>
        <p><strong>Control Rate:</strong> How consistently the team creates useful control opportunities.</p>
        <p><strong>ADV Schedule Rating:</strong> Raw opponent-strength context available at the frozen snapshot.</p>
        <p><strong>Control Foundation:</strong> Combined view of Control Creation and Control Denial.</p>
        <p><strong>Conversion Profile:</strong> Combined view of Control Finish and Control Drive Shutout Rate.</p>
        <p><strong>Control Pressure Per Offensive Drive:</strong> ADV-derived sustainable scoring pressure spread across every offensive drive. It is not literal scoreboard points per drive. Rough guide: 3.1+ is elite, 2.4-3.0 strong, 1.5-2.3 average, under 1.5 limited.</p>
        <p><strong>Control Pressure Allowed Per Defensive Drive:</strong> The lower-is-better defensive mirror. It estimates sustained opponent scoring pressure allowed across every defensive drive. Rough guide: under 1.2 is elite, 1.2-1.8 strong, 1.9-2.5 average, 2.6+ vulnerable.</p>
        <p><strong>Creation Waste:</strong> Offensive drives that never become meaningful control.</p>
        <p><strong>Finish Waste:</strong> Meaningful control drives that do not produce points.</p>
        <p><strong>Talent Yield:</strong> Performance compared with roster expectation.</p>
        <p><strong>Recent Form:</strong> Recent direction compared with the team's own season baseline.</p>
      </div>
    </article>
  `;
}

function bracketControlProfileLabel(profile) {
  if (!profile?.available) return "Framework Unavailable";
  const foundation = profile.foundation?.label ? `${profile.foundation.label} Foundation` : "";
  return escapeHtml(profile.identity || foundation || "Contextual Football Profile");
}

function bracketFrameworkAdvantages(read, teamA, teamB) {
  const advantages = read?.advantages || {};
  const list = (team) => {
    const rows = advantages[team] || [];
    return rows.length ? rows.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li>No material framework edge</li>";
  };
  if (!teamA || !teamB || !read?.advantages) return "";
  return `
    <div class="matchup-advantages-grid">
      <article>
        <span>${escapeHtml(teamA)} Advantages</span>
        <ul>${list(teamA)}</ul>
      </article>
      <article>
        <span>${escapeHtml(teamB)} Advantages</span>
        <ul>${list(teamB)}</ul>
      </article>
    </div>
  `;
}

function bracketFrameworkGrid(profile) {
  if (!profile?.available) {
    return `<div class="empty-state compact">${escapeHtml(profile?.note || "Full Control Framework unavailable for this season.")}</div>`;
  }
  const order = [
    "control_creation",
    "control_denial",
    "control_finish",
    "control_drive_shutout",
    "control_production",
    "defensive_control_production_allowed",
  ];
  return `
    <div class="bracket-framework-grid">
      ${order.map((key) => {
        const metric = profile.metrics?.[key] || {};
        const percentile = percentileLabel(metric.percentile);
        const sample = key === "control_creation" || key === "control_finish" || key === "control_production"
          ? profile.offensive_drives
          : profile.defensive_drives;
        const label = BRACKET_FRAMEWORK_LABELS[key] || metric.name || key;
        return `
          <div>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(metric.label || "-")}</strong>
            <small>${escapeHtml([percentile || "Sample developing", sample ? `${Math.round(sample)} drives` : ""].filter(Boolean).join(" · "))}</small>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function closeBracketDiagnostic() {
  $("bracketModal")?.classList.add("is-hidden");
}

async function loadLegalPage() {
  setStatus("Loading acknowledgement...");
  const legal = await api("/api/legal/acknowledgement");
  $("legalMessage").textContent = legal.message || "";
  $("termsVersion").textContent = legal.terms_version || "-";
  $("acceptTermsButton").addEventListener("click", () => {
    storageSet(TERMS_ACCEPTED_KEY, "true");
    storageSet(TERMS_VERSION_KEY, legal.terms_version || DEFAULT_TERMS_VERSION);
    storageSet(TERMS_ACCEPTED_AT_KEY, new Date().toISOString());
    setStatus("Acknowledgement saved in this browser.", "ok");
  });
  setStatus("Legal acknowledgement loaded.", "ok");
}

async function loadNewsPage(targetId = "newsList", limit = 8, sliceResults = true) {
  setStatus("Loading news...");
  const payload = await api(`/api/news/latest?limit=${limit}`);
  const rows = payload.items || [];
  const container = $(targetId);
  if (!container) {
    setStatus("No news container found.", "warn");
    return;
  }
  const itemsToShow = sliceResults ? rows.slice(0, limit) : rows;
  container.innerHTML = itemsToShow.length
    ? itemsToShow
        .map((item) => `
    <article class="news-item">
      <span>${escapeHtml(item.source || "College Football")}</span>
      <h3><a href="${escapeHtml(item.link)}" rel="noopener noreferrer" target="_blank">${escapeHtml(item.title)}</a></h3>
      <p>${escapeHtml(item.published || "Recent")}</p>
    </article>
  `).join("")
   
    : `
    <article class="insight-panel">
      <p class="eyebrow">News Feed</p>
      <h2>No headlines available</h2>
      <p class="interpretation">The backend news cache did not return current headlines.</p>
    </article>
  `;
  setStatus("News loaded.", "ok");
}

async function loadTeamPage() {
  setStatus("Loading teams...");
  const seasonsPayload = await api("/api/seasons");
  const seasons = seasonsPayload.seasons || [];
  const seasonSelect = $("teamSeasonSelect");
  seasonSelect.innerHTML = seasons.map((season) => `<option value="${season}">${season}</option>`).join("");
  seasonSelect.value = String(seasons[0] || "");
  await populateTeamPageTeams();
  seasonSelect.addEventListener("change", populateTeamPageTeams);
  $("loadTeamButton").addEventListener("click", renderTeamPage);
  setStatus("Team page ready.", "ok");
}

async function populateTeamPageTeams() {
  const season = $("teamSeasonSelect").value;
  if (!season) return;
  const payload = await api(`/api/product-a/team-board?season=${encodeURIComponent(season)}&limit=300`);
  const teams = (payload.teams || payload.rows || [])
    .filter((row) => row.team)
    .sort((left, right) => String(left.team).localeCompare(String(right.team)));
  $("teamPageSelect").innerHTML = teams.map((team) => `<option value="${escapeHtml(team.team)}">${escapeHtml(team.team)}</option>`).join("");
}

async function renderTeamPage() {
  const season = $("teamSeasonSelect").value;
  const team = $("teamPageSelect").value;
  if (!season || !team) {
    setStatus("Choose a season and team.", "warn");
    return;
  }
  setStatus("Loading team profile...");
  try {
    const [profile, schedule, logos] = await Promise.all([
      api(`/api/team/${encodeURIComponent(season)}/${encodeURIComponent(team)}`),
      api(`/api/team/${encodeURIComponent(season)}/${encodeURIComponent(team)}/schedule?view=full`),
      loadTeamLogoCatalog(),
    ]);
    activeTeamLogos = logos;
    
    const intel = profile.intelligence || {};
    const stats = profile.comparison_stats || {};
    const record = profile.record || {};
    const games = Array.isArray(schedule.schedule) ? schedule.schedule : [];
    
    // Store data for tab switching
    window.__teamPageData = {
      season,
      team,
      intel,
      stats,
      record,
      games,
    };

    const scheduleHtml = renderTeamScheduleView(season, team, intel, record, games);
    const statsHtml = renderTeamStatsView(intel, stats, games);
    const advProfileHtml = renderTeamAdvProfileView(
      intel,
      profile.drive_conversion || profile.drive_conversion_context || {},
      stats,
      games,
    );

    $("teamPageResult").innerHTML = `
      <div class="team-profile-brand">
        ${teamLogoMarkup(team, activeTeamLogos)}
        <div><span>${escapeHtml(season)} Team Profile</span><strong>${escapeHtml(team)}</strong></div>
      </div>
      <div id="teamScheduleView" class="team-view-panel is-active">
        ${scheduleHtml}
      </div>
      <div id="teamStatsView" class="team-view-panel">
        ${statsHtml}
      </div>
      <div id="teamAdvProfileView" class="team-view-panel">
        ${advProfileHtml}
      </div>
    `;

    // Setup tab switching
    $("teamScheduleTab").onclick = () => switchTeamTab("schedule");
    $("teamStatsTab").onclick = () => switchTeamTab("stats");
    $("teamAdvProfileTab").onclick = () => switchTeamTab("adv");
    switchTeamTab("schedule");

    setStatus("Team profile loaded.", "ok");
  } catch (error) {
    console.error("Team page error:", error);
    setStatus(`Error loading team: ${error.message}`, "error");
    $("teamPageResult").innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

function switchTeamTab(tabName) {
  const scheduleView = $("teamScheduleView");
  const statsView = $("teamStatsView");
  const advProfileView = $("teamAdvProfileView");
  const scheduleTab = $("teamScheduleTab");
  const statsTab = $("teamStatsTab");
  const advProfileTab = $("teamAdvProfileTab");

  if (tabName === "schedule") {
    scheduleView.classList.add("is-active");
    statsView.classList.remove("is-active");
    advProfileView.classList.remove("is-active");
    scheduleTab.classList.add("is-active");
    statsTab.classList.remove("is-active");
    advProfileTab.classList.remove("is-active");
  } else if (tabName === "stats") {
    statsView.classList.add("is-active");
    scheduleView.classList.remove("is-active");
    advProfileView.classList.remove("is-active");
    statsTab.classList.add("is-active");
    scheduleTab.classList.remove("is-active");
    advProfileTab.classList.remove("is-active");
  } else {
    advProfileView.classList.add("is-active");
    scheduleView.classList.remove("is-active");
    statsView.classList.remove("is-active");
    advProfileTab.classList.add("is-active");
    scheduleTab.classList.remove("is-active");
    statsTab.classList.remove("is-active");
  }
}

function renderTeamScheduleView(season, team, intel, record, games) {
  const recordSummary = [
    `<div class="record-tile"><span>Overall</span><strong>${record.overall_record || "-"}</strong></div>`,
    `<div class="record-tile"><span>Regular</span><strong>${record.regular_record || "-"}</strong></div>`,
    `<div class="record-tile"><span>Conference</span><strong>${record.conference_record || "-"}</strong></div>`,
    `<div class="record-tile"><span>Nonconference</span><strong>${record.nonconference_record || "-"}</strong></div>`,
    `<div class="record-tile"><span>Pre-Playoff</span><strong>${record.pre_playoff_record || "-"}</strong></div>`,
    `<div class="record-tile"><span>Postseason</span><strong>${record.postseason_record || "-"}</strong></div>`,
  ].join("");

  const sections = [
    ["regular_season", "Regular Season"],
    ["conference_championship", "Conference Championship"],
    ["postseason", "Postseason"],
  ];

  const scheduleSections = sections.map(([key, title]) => {
    const items = Array.isArray(games) ? games.filter((row) => row.schedule_section === key) : [];
    if (!items.length) return "";
    const gamesList = items.map((row) => {
      const weekField = row.display_week ?? row.week ?? row.week_number ?? row.week_num ?? "-";
      const resultClass = row.result_w_l === "W" ? "result-win" : row.result_w_l === "L" ? "result-loss" : "";
      const score = `${presentScore(row.team_score)}-${presentScore(row.opponent_score)}`;
      const opponent = String(row.opponent || row.opponent_name || "-");
      const homeAway = row.is_home ? "vs" : "at";
      const dateStr = row.date ? String(row.date) : "";
      const neutralStr = row.is_neutral ? " | Neutral Site" : "";
      const rowStats = row.comparison_stats || {};
      const comparisonOpponentYards = numberOrNull(rowStats.def_pass_yards_allowed) !== null || numberOrNull(rowStats.def_rush_yards_allowed) !== null
        ? (numberOrNull(rowStats.def_pass_yards_allowed) || 0) + (numberOrNull(rowStats.def_rush_yards_allowed) || 0)
        : null;
      const teamYards = row.team_total_yards ?? rowStats.total_yards;
      const opponentYards = row.opponent_total_yards ?? comparisonOpponentYards;
      const yardsStr = teamYards != null && opponentYards != null 
        ? ` | Yards ${String(Math.round(Number(teamYards)))}-${String(Math.round(Number(opponentYards)))}`
        : "";
      const resultStr = row.result_w_l ? String(row.result_w_l) : "-";
      const recapButton = row.game_id && truthyValue(row.has_adv_recap)
        ? `<button class="secondary-button compact-action" type="button" data-recap-game="${escapeHtml(String(row.game_id))}">View Recap</button>`
        : "";
      
      return `
        <article class="schedule-game">
          <div class="schedule-week">${escapeHtml(String(weekField))}</div>
          <div class="schedule-opponent">
            <strong class="team-name-with-logo">${teamLogoMarkup(opponent, activeTeamLogos)}${homeAway} ${escapeHtml(opponent)}</strong>
            <span>${escapeHtml(dateStr)}${escapeHtml(neutralStr)}${escapeHtml(yardsStr)}</span>
          </div>
          <div class="schedule-score ${resultClass}">${escapeHtml(resultStr)} ${escapeHtml(score)}</div>
          <div class="schedule-actions">${recapButton}</div>
        </article>
      `;
    }).join("");
    return `<section class="schedule-group"><h3>${title}</h3>${gamesList}</section>`;
  }).join("") || '<div class="empty-state compact">No games available for this view.</div>';

  return `
    <div class="insight-panel">
      <p class="eyebrow">${escapeHtml(season)} Team Profile</p>
      <h2>${escapeHtml(team)}</h2>
      <div class="record-summary">
        ${recordSummary}
      </div>
    </div>
    <div class="context-callout">
      <h3>Schedule</h3>
      <div class="schedule-sections">
        ${scheduleSections}
      </div>
    </div>
  `;
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-recap-game]");
  if (!button) return;
  event.preventDefault();
  await openRecapModal(button.dataset.recapGame);
});

async function openRecapModal(gameId) {
  const modal = $("recapModal");
  const content = $("recapModalContent");
  if (!modal || !content || !gameId) return;
  content.innerHTML = '<div class="empty-state compact">Loading recap...</div>';
  modal.classList.remove("is-hidden");
  try {
    const recap = await api(`/api/game/${encodeURIComponent(gameId)}/recap`);
    content.innerHTML = renderGameRecap(recap, true);
  } catch (error) {
    content.innerHTML = `<div class="empty-state compact">${escapeHtml(error.message)}</div>`;
  }
  const close = $("recapModalClose");
  if (close && !close.dataset.bound) {
    close.addEventListener("click", closeRecapModal);
    close.dataset.bound = "true";
  }
  modal.addEventListener("click", (clickEvent) => {
    if (clickEvent.target === modal) closeRecapModal();
  }, { once: true });
}

function closeRecapModal() {
  const modal = $("recapModal");
  if (modal) modal.classList.add("is-hidden");
}

async function loadStandaloneRecapPage() {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get("game_id");
  const target = $("standaloneRecap");
  if (!gameId) {
    setStatus("No game selected.", "warn");
    return;
  }
  setStatus("Loading game recap...");
  try {
    const recap = await api(`/api/game/${encodeURIComponent(gameId)}/recap`);
    target.innerHTML = renderGameRecap(recap, false);
    setStatus("Game recap loaded.", "ok");
  } catch (error) {
    target.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    setStatus(error.message, "error");
  }
}

function renderGameRecap(payload, compact = false) {
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
      ${renderModelMetricRecap(control, conversion)}
      ${renderRecapBoxScore(game, yards, boxScore)}
    </article>
  `;
}

function renderModelMetricRecap(control, conversion = {}) {
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

function renderRecapBoxScore(game, yards, boxScore = {}) {
  const away = boxScore.away || {};
  const home = boxScore.home || {};
  const rows = [
    ["Points", game.away_points, game.home_points],
    ["Total Yards", valueOrFallback(away.total_yards, yards.away_total_yards), valueOrFallback(home.total_yards, yards.home_total_yards)],
    ["Yards / Play", decimal(valueOrFallback(away.yards_per_play, yards.away_yards_per_play), 2), decimal(valueOrFallback(home.yards_per_play, yards.home_yards_per_play), 2)],
    ["Passing", `${whole(away.pass_completions)} / ${whole(away.pass_attempts)}, ${whole(away.pass_yards)} yds`, `${whole(home.pass_completions)} / ${whole(home.pass_attempts)}, ${whole(home.pass_yards)} yds`],
    ["Rushing", `${whole(away.rush_attempts)} att, ${whole(away.rush_yards)} yds`, `${whole(home.rush_attempts)} att, ${whole(home.rush_yards)} yds`],
    ["First Downs", away.first_downs, home.first_downs],
    ["3rd Down", conversion(away.third_down_conversions, away.third_down_attempts, away.third_down_rate), conversion(home.third_down_conversions, home.third_down_attempts, home.third_down_rate)],
    ["4th Down", conversion(away.fourth_down_conversions, away.fourth_down_attempts, away.fourth_down_rate), conversion(home.fourth_down_conversions, home.fourth_down_attempts, home.fourth_down_rate)],
    ["Red Zone", redZoneLine(away), redZoneLine(home)],
    ["Turnovers", away.turnovers, home.turnovers],
    ["Penalties", `${whole(away.penalties)} / ${whole(away.penalty_yards)} yds`, `${whole(home.penalties)} / ${whole(home.penalty_yards)} yds`],
    ["Sacks / TFL", `${whole(away.sacks_made)} / ${whole(away.tfl_made)}`, `${whole(home.sacks_made)} / ${whole(home.tfl_made)}`],
    ["Field Goals", fieldGoalLine(away), fieldGoalLine(home)],
    ["Punts", `${whole(away.punts)} for ${whole(away.punt_yards)} yds`, `${whole(home.punts)} for ${whole(home.punt_yards)} yds`],
    ["Returns", `Kick ${whole(away.kick_return_yards)} | Punt ${whole(away.punt_return_yards)}`, `Kick ${whole(home.kick_return_yards)} | Punt ${whole(home.punt_return_yards)}`],
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

function cleanDash(value) {
  return value === null || value === undefined || value === "" || value === "null / null" ? "-" : value;
}

function signedDecimal(value, digits = 1) {
  const number = numberOrNull(value);
  if (number === null) return "-";
  return `${number >= 0 ? "+" : ""}${number.toFixed(digits)}`;
}

function redZoneLine(stats) {
  const trips = whole(stats.red_zone_trips);
  const scores = whole(stats.red_zone_scores);
  const tds = whole(stats.red_zone_tds);
  const fgs = whole(stats.red_zone_fgs);
  return `${scores}/${trips} score | TD ${tds} | FG ${fgs}`;
}

function renderTeamStatsView(intel, stats, games = []) {
  const scoredGames = (Array.isArray(games) ? games : []).filter((game) => isFiniteNumber(game.team_score) && isFiniteNumber(game.opponent_score));
  const gamesPlayed = numberOrNull(stats.games) || numberOrNull(intel.games) || scoredGames.length || null;
  const pointsFor = scoredGames.length ? scoredGames.reduce((sum, game) => sum + Number(game.team_score), 0) : numberOrNull(stats.drive_points);
  const pointsAgainst = scoredGames.length ? scoredGames.reduce((sum, game) => sum + Number(game.opponent_score), 0) : null;
  const passCompletions = numberOrNull(stats.pass_completions);
  const passAttempts = numberOrNull(stats.pass_attempts);
  const passCompletionPct = passCompletions !== null && passAttempts ? (passCompletions / passAttempts) * 100 : null;
  const passingTds = numberOrNull(stats.pass_tds);
  const rushingTds = numberOrNull(stats.rush_tds);
  const totalTds = [passingTds, rushingTds].every((value) => value === null) ? null : (passingTds || 0) + (rushingTds || 0);
  const giveawayCount = numberOrNull(stats.turnovers);
  const takeaways = numberOrNull(stats.takeaways);
  const turnoverMargin = numberOrNull(stats.turnover_margin);
  const defPassAllowed = numberOrNull(stats.def_pass_yards_allowed_per_game);
  const defRushAllowed = numberOrNull(stats.def_rush_yards_allowed_per_game);
  const defPassAllowedTotal = numberOrNull(stats.def_pass_yards_allowed);
  const defRushAllowedTotal = numberOrNull(stats.def_rush_yards_allowed);
  const totalAllowed = defPassAllowed !== null || defRushAllowed !== null
    ? decimal((defPassAllowed || 0) + (defRushAllowed || 0), 1)
    : decimal(intel.yards_allowed_per_game, 1);
  const totalDefensiveYardsAllowed = defPassAllowedTotal !== null || defRushAllowedTotal !== null
    ? whole((defPassAllowedTotal || 0) + (defRushAllowedTotal || 0))
    : whole(intel.total_yards_allowed);

  const categories = [
    {
      name: "Team Overview & Scoring",
      rows: [
        ["Points Per Game (PPG)", `${pointsPerGame(pointsFor, gamesPlayed)} scored / ${pointsPerGame(pointsAgainst, gamesPlayed)} allowed`],
        ["Total Points", whole(pointsFor)],
        ["Total Offensive Yards", whole(stats.total_yards ?? intel.total_yards_for)],
        ["Total Defensive Yards Allowed", totalDefensiveYardsAllowed],
        ["Touchdowns", `Total ${whole(totalTds)} | Pass ${whole(passingTds)} | Rush ${whole(rushingTds)}`],
        ["First Downs per Game", `Total ${decimal(stats.first_downs_per_game, 1)} | Rush ${decimal(stats.rush_first_downs_per_game, 1)} | Pass ${decimal(stats.pass_first_downs_per_game, 1)}`],
      ],
    },
    {
      name: "Passing Statistics",
      rows: [
        ["Passing Yards Per Game", decimal(stats.pass_yards_per_game, 1)],
        ["Completions / Attempts (COMP/ATT)", `${whole(passCompletions)} / ${whole(passAttempts)}`],
        ["Completion Percentage (COMP%)", percentWhole(passCompletionPct)],
        ["Yards Per Pass Attempt (Y/A or YPA)", decimal(stats.yards_per_pass_attempt, 2)],
        ["Passing Touchdowns (TD)", whole(passingTds)],
        ["Interceptions (INT)", whole(stats.interceptions_thrown)],
      ],
    },
    {
      name: "Rushing Statistics",
      rows: [
        ["Rushing Yards Per Game", decimal(stats.rush_yards_per_game, 1)],
        ["Rushing Attempts (ATT)", whole(stats.rush_attempts)],
        ["Yards Per Rush Attempt (Y/A or Avg)", decimal(stats.yards_per_rush, 2)],
        ["Rushing Touchdowns (TD)", whole(rushingTds)],
      ],
    },
    {
      name: "Defensive & Line Metrics",
      rows: [
        ["Yards Allowed Per Game", `Total ${totalAllowed} | Pass ${decimal(stats.def_pass_yards_allowed_per_game, 1)} | Rush ${decimal(stats.def_rush_yards_allowed_per_game, 1)}`],
        ["Sacks", whole(stats.sacks_made)],
        ["Interceptions & Fumbles Recovered", `INT ${whole(stats.interceptions_made)} | Fumbles ${whole(stats.fumbles_recovered)}`],
        ["Tackles For Loss (TFL)", whole(stats.tfl_made)],
      ],
    },
    {
      name: "Situational & Special Teams",
      rows: [
        ["3rd Down Conversions", conversion(stats.third_down_conversions, stats.third_down_attempts, stats.third_down_rate)],
        ["4th Down Conversions", conversion(stats.fourth_down_conversions, stats.fourth_down_attempts, stats.fourth_down_rate)],
        ["Red Zone Efficiency", `Score ${rate(stats.red_zone_score_rate)} | TD ${rate(stats.red_zone_td_rate)} | FG ${rate(stats.red_zone_fg_rate)} | Pts/Trip ${decimal(stats.red_zone_points_per_trip, 2)}`],
        ["Turnover Margin", `Takeaways ${whole(takeaways)} | Giveaways ${whole(giveawayCount)} | Margin ${signed(turnoverMargin)}`],
        ["Field Goal Percentage (FG%)", fieldGoalLine(stats)],
        ["Punting Average", decimal(stats.punting_average, 1)],
        ["Kick/Punt Return Yards", `Kick ${decimal(stats.kick_return_yards_per_game, 1)} / game | Punt ${decimal(stats.punt_return_yards_per_game, 1)} / game`],
        ["Penalties / Penalty Yards", `${whole(stats.penalties)} penalties / ${whole(stats.penalty_yards)} yards`],
      ],
    },
  ];

  return categories.map((category) => `
    <div class="insight-panel stat-category">
      <h3>${escapeHtml(category.name)}</h3>
      ${category.rows.map(([label, value]) => `
        <div class="stat-row compact-stat-row">
          <strong>${escapeHtml(label)}</strong>
          <div class="stat-value">${escapeHtml(value)}</div>
        </div>
      `).join("")}
    </div>
  `).join("");
}

function renderTeamAdvProfileView(intel = {}, driveConversion = {}, stats = {}, games = []) {
  const profile = contextualProfileValues(intel);
  const view = { ...intel, ...profile };
  if (numberOrNull(view.points_per_control_drive) === null) {
    view.points_per_control_drive = driveConversion.points_per_control_drive;
  }
  if (numberOrNull(view.offensive_drives) === null) {
    view.offensive_drives = driveConversion.drives;
  }
  if (
    numberOrNull(view.control_production_rate) === null
    && numberOrNull(view.control_creation_rate) !== null
    && numberOrNull(view.points_per_control_drive) !== null
  ) {
    view.control_production_rate = Number(view.control_creation_rate) * Number(view.points_per_control_drive);
  }
  const specialTeamsAdv = view.sp_adv_srs ?? view.sp_adv ?? view.special_teams_adv ?? view.raw_sp_adv_margin_avg;
  const dce = view.team_season_dce ?? view.dce ?? view.drive_conversion_efficiency;
  const talentYieldLabel = view.tyi_label || talentYieldLabelFromValue(view.talent_yield_index);
  const recentFormLabel = view.recent_form_label || trajectoryPublicLabel(view.trajectory_bucket);
  const outcomeRows = [
    ["ADV Strength Rating (ADV SRS)", decimal(view.adv_srs, 1)],
    ["ADV Rank", view.adv_srs_rank ? `#${view.adv_srs_rank}` : "-"],
    ["Schedule Strength", `${decimal(view.adv_sos_percentile, 1)} percentile`],
    ["Scoreboard Control Gap", decimal(dce, 2)],
    ["Recent Form", recentFormLabel],
    ["Talent Yield", talentYieldLabel, decimal(view.talent_yield_index, 2)],
  ];
  const controlFoundationRows = [
    ["Control Creation", view.control_creation_tier || "-", percentileLabel(view.control_creation_percentile)],
    ["Control Denial", view.control_denial_tier || "-", percentileLabel(view.control_denial_percentile)],
    ["Control Rate (CR)", rate(view.cr ?? view.control_rate ?? (numberOrNull(view.control_rate_pct) !== null ? Number(view.control_rate_pct) / 100 : null)), "Share of possessions that become useful control opportunities"],
    ["Control Foundation", view.control_foundation_tier || "-", percentileLabel(view.control_foundation_percentile)],
  ];
  const scoringPressureRows = [
    [
      "Control Pressure Per Offensive Drive",
      decimal(view.control_production_rate, 2),
      [
        view.control_production_tier,
        percentileLabel(view.control_production_percentile),
        productionSampleLabel(view.control_production_rate, view.offensive_drives, "offensive drives"),
        "Sustainable scoring pressure per possession",
      ].filter(Boolean).join(" · "),
    ],
    [
      "Control Pressure Allowed Per Defensive Drive",
      decimal(view.defensive_control_production_allowed, 2),
      [
        view.defensive_control_production_allowed_tier,
        percentileLabel(view.defensive_control_production_allowed_percentile),
        productionSampleLabel(view.defensive_control_production_allowed, view.defensive_drives, "defensive drives"),
        "Lower is better",
      ].filter(Boolean).join(" · "),
    ],
    ["Control Pressure", view.control_production_tier || "-", percentileLabel(view.control_production_percentile)],
    ["Control Pressure Allowed", view.defensive_control_production_allowed_tier || "-", [percentileLabel(view.defensive_control_production_allowed_percentile), "Lower is better"].filter(Boolean).join(" · ")],
  ];
  const conversionRows = [
    [
      "Control Finish Rate",
      view.control_finish_tier || rate(driveConversion.scoring_conversion_rate),
      [percentileLabel(view.control_finish_percentile), conversionSampleLabel(driveConversion)].filter(Boolean).join(" · "),
    ],
    ["Control Drive Shutout Rate", view.finishing_resistance_tier || "-", percentileLabel(view.finishing_resistance_percentile)],
    ["Points Per Control Drive", decimal(driveConversion.points_per_control_drive, 2), "Scoring output once meaningful control exists"],
    ["TD Control Conversion", rate(driveConversion.td_conversion_rate), ""],
    ["Finish Waste", rate(view.finish_waste_rate), "Control drives that produce no points"],
  ];
  const pressureCompareHtml = renderPressureCompareWindow(view, stats, games);
  const summary = publicProfileSummary(view.contextual_profile_summary)
    || "This profile explains how the team creates control, finishes control, denies control, and produces complete stops after control forms.";
  return `
    <div class="insight-panel">
      <p class="eyebrow">Contextual Football Profile</p>
      <h3>${escapeHtml(view.contextual_profile_label || "Season Identity")}</h3>
      <p class="interpretation">${escapeHtml(summary)}</p>
      <a class="text-link" href="metrics.html">How CFP Advantage metrics work</a>
    </div>
    <div class="insight-panel">
      <p class="eyebrow">Team Identity</p>
      <h3>Control Foundation</h3>
      <p class="guide-note">Can this team create control and deny control?</p>
      <div class="summary-grid">
        ${controlFoundationRows.map(([label, value, note]) => `
          <div>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
            ${note ? `<small>${escapeHtml(note)}</small>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
    <div class="insight-panel">
      <p class="eyebrow">Team Identity</p>
      <h3>Scoring Pressure</h3>
      <p class="guide-note">How much sustainable scoring pressure does this team create or allow?</p>
      <div class="summary-grid">
        ${scoringPressureRows.map(([label, value, note]) => `
          <div>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
            ${note ? `<small>${escapeHtml(note)}</small>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
    <div class="insight-panel">
      <p class="eyebrow">Team Identity</p>
      <h3>Conversion Profile</h3>
      <p class="guide-note">What happens once control exists?</p>
      <div class="summary-grid">
        ${conversionRows.map(([label, value, note]) => `
          <div>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
            ${note ? `<small>${escapeHtml(note)}</small>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
    ${pressureCompareHtml}
    <div class="insight-panel">
      <p class="eyebrow">Outcome & Context</p>
      <h3>Results Context</h3>
      <p class="guide-note">How do the underlying football traits show up in results?</p>
      <div class="summary-grid">
        ${outcomeRows.map(([label, value, note]) => `
          <div>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
            ${note ? `<small>${escapeHtml(note)}</small>` : ""}
          </div>
        `).join("")}
      </div>
      <p class="interpretation">${escapeHtml(scoreboardControlGapRead(dce))}</p>
    </div>
  `;
}

function renderPressureCompareWindow(view = {}, stats = {}, games = []) {
  const scoredGames = (Array.isArray(games) ? games : [])
    .filter((game) => isFiniteNumber(game.team_score) && isFiniteNumber(game.opponent_score));
  const gamesPlayed = numberOrNull(stats.games) || numberOrNull(view.games) || scoredGames.length || null;
  const pointsFor = scoredGames.length
    ? scoredGames.reduce((sum, game) => sum + Number(game.team_score), 0)
    : numberOrNull(stats.drive_points);
  const pointsAgainst = scoredGames.length
    ? scoredGames.reduce((sum, game) => sum + Number(game.opponent_score), 0)
    : numberOrNull(stats.points_allowed);
  const cpo = numberOrNull(view.control_production_rate);
  const cpa = numberOrNull(view.defensive_control_production_allowed);
  const controlFinish = numberOrNull(view.control_finish_rate);
  const redZoneTd = numberOrNull(stats.red_zone_td_rate);
  const creationWaste = numberOrNull(view.creation_waste_rate);
  const pointsPerDrive = numberOrNull(stats.points_per_drive);
  const cpoTier = view.control_production_tier || pressureTier(cpo, false);
  const cpaTier = view.defensive_control_production_allowed_tier || pressureTier(cpa, true);
  const cpoMeta = [cpoTier, percentileLabel(view.control_production_percentile)].filter(Boolean).join(" · ");
  const cpaMeta = [cpaTier, percentileLabel(view.defensive_control_production_allowed_percentile), "Lower is better"].filter(Boolean).join(" · ");

  return `
    <div class="insight-panel pressure-compare-window">
      <p class="eyebrow">Pressure vs Scoreboard</p>
      <h3>Scoring Pressure Read</h3>
      <div class="pressure-compare-grid">
        <div class="pressure-compare-column">
          <span>CFP Identity</span>
          <div>
            <strong>Control Pressure Per Offensive Drive</strong>
            <b>${decimal(cpo, 2)}</b>
            <small>${escapeHtml(cpoMeta || "Sustainable scoring pressure per possession")}</small>
          </div>
          <div>
            <strong>Control Pressure Allowed Per Defensive Drive</strong>
            <b>${decimal(cpa, 2)}</b>
            <small>${escapeHtml(cpaMeta || "Sustainable pressure allowed per defensive possession")}</small>
          </div>
          <div>
            <strong>Control Finish Rate</strong>
            <b>${rate(controlFinish)}</b>
            <small>How often control drives become points</small>
          </div>
          <div>
            <strong>Creation Waste</strong>
            <b>${rate(creationWaste)}</b>
            <small>Possessions that do not become meaningful control</small>
          </div>
        </div>
        <div class="pressure-compare-column scoreboard-output">
          <span>Scoreboard Output</span>
          <div>
            <strong>Points Per Game</strong>
            <b>${pointsPerGame(pointsFor, gamesPlayed)}</b>
            <small>Actual scoring output</small>
          </div>
          <div>
            <strong>Points Allowed Per Game</strong>
            <b>${pointsPerGame(pointsAgainst, gamesPlayed)}</b>
            <small>Actual scoring allowed</small>
          </div>
          <div>
            <strong>Red Zone TD Rate</strong>
            <b>${rate(redZoneTd)}</b>
            <small>Traditional close-range finishing output</small>
          </div>
          <div>
            <strong>Points Per Drive</strong>
            <b>${decimal(pointsPerDrive, 2)}</b>
            <small>Actual scoring efficiency per possession</small>
          </div>
        </div>
      </div>
      <p class="interpretation pressure-model-read">
        Pressure reflects underlying scoring strength; points reflect actual scoring output. CPOd and CPA are not point projections; they show how much repeatable scoring pressure a team creates or allows per possession. When pressure and points move in the same direction, the team is performing close to its underlying identity; when they differ, the scoreboard may be running hotter or colder than the true control profile.
      </p>
    </div>
  `;
}

function pressureTier(value, lowerIsBetter = false) {
  const parsed = numberOrNull(value);
  if (parsed === null) return "";
  if (lowerIsBetter) {
    if (parsed < 1.2) return "Elite";
    if (parsed < 1.9) return "Strong";
    if (parsed < 2.6) return "Average";
    return "Vulnerable";
  }
  if (parsed >= 3.1) return "Elite";
  if (parsed >= 2.4) return "Strong";
  if (parsed >= 1.5) return "Average";
  return "Limited";
}

function contextualProfileValues(intel = {}) {
  const nested = intel.contextual_profile_json;
  let parsed = {};
  if (nested && typeof nested === "object" && !Array.isArray(nested)) parsed = nested;
  if (typeof nested === "string" && nested.trim()) {
    try {
      const value = JSON.parse(nested);
      parsed = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (error) {
      console.warn("Contextual Football Profile payload could not be parsed:", error.message);
    }
  }
  const view = { ...parsed };
  const copyFields = [
    "control_production_rate",
    "control_production_percentile",
    "control_production_tier",
    "defensive_control_production_allowed",
    "defensive_control_production_allowed_percentile",
    "defensive_control_production_allowed_tier",
    "creation_waste_rate",
    "finish_waste_rate",
    "offensive_drives",
    "defensive_drives",
  ];
  copyFields.forEach((field) => {
    if ((view[field] === null || view[field] === undefined || view[field] === "") && intel[field] !== undefined) {
      view[field] = intel[field];
    }
  });
  const creation = numberOrNull(view.control_creation_rate);
  const finish = numberOrNull(view.control_finish_rate);
  const denial = numberOrNull(view.control_denial_rate);
  const pointsPerControl = numberOrNull(view.points_per_control_drive);
  const opponentPointsPerControl = numberOrNull(view.opp_points_per_control_allowed);
  if (numberOrNull(view.control_production_rate) === null && creation !== null && pointsPerControl !== null) {
    view.control_production_rate = creation * pointsPerControl;
  }
  if (
    numberOrNull(view.defensive_control_production_allowed) === null
    && denial !== null
    && opponentPointsPerControl !== null
  ) {
    view.defensive_control_production_allowed = (1 - denial) * opponentPointsPerControl;
  }
  if (numberOrNull(view.creation_waste_rate) === null && creation !== null) view.creation_waste_rate = 1 - creation;
  if (numberOrNull(view.finish_waste_rate) === null && finish !== null) view.finish_waste_rate = 1 - finish;
  return view;
}

function productionSampleLabel(value, drives, denominator) {
  const production = numberOrNull(value);
  const sample = numberOrNull(drives);
  if (production === null) return "";
  const valueLabel = `${production.toFixed(2)} per drive`;
  return sample === null ? valueLabel : `${valueLabel} across ${Math.round(sample)} ${denominator}`;
}

function publicProfileSummary(value) {
  // Older frozen artifacts retain legacy display names; their values stay unchanged.
  return String(value || "")
    .replaceAll("Finishing Resistance", "Control Drive Shutout Rate")
    .replaceAll("Defensive Control Production Allowed", "Control Pressure Allowed")
    .replaceAll("Control Production", "Control Pressure")
    .replaceAll("Control Points", "Control Pressure");
}

function scoreboardControlGapRead(value) {
  const gap = numberOrNull(value);
  if (gap === null) return "Scoreboard Control Gap is unavailable for this team-season.";
  if (Math.abs(gap) < 1) {
    return "The scoreboard has closely matched the team's underlying ADV control profile.";
  }
  if (gap > 0) {
    return `The team's average scoring margin has run ${gap.toFixed(2)} points ahead of its underlying ADV control profile.`;
  }
  return `The team's underlying ADV control profile has run ${Math.abs(gap).toFixed(2)} points stronger than its average scoring margin.`;
}

function percentileLabel(value) {
  const number = numberOrNull(value);
  if (number === null) return "";
  const rounded = Math.round(number);
  const suffix = rounded % 100 >= 11 && rounded % 100 <= 13
    ? "th"
    : ({ 1: "st", 2: "nd", 3: "rd" }[rounded % 10] || "th");
  return `${rounded}${suffix} percentile`;
}

function isFiniteNumber(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function truthyValue(value) {
  return value === true || String(value).toLowerCase() === "true" || String(value) === "1";
}

function numberOrNull(value) {
  return isFiniteNumber(value) ? Number(value) : null;
}

function whole(value) {
  const number = numberOrNull(value);
  return number === null ? "-" : String(Math.round(number));
}

function decimal(value, digits = 1) {
  const number = numberOrNull(value);
  return number === null ? "-" : number.toFixed(digits);
}

function rate(value) {
  const number = numberOrNull(value);
  return number === null ? "-" : `${(number * 100).toFixed(2)}%`;
}

function conversionSampleLabel(values = {}) {
  const scored = numberOrNull(values.scoring_control_drives);
  const control = numberOrNull(values.control_drives);
  if (scored === null || control === null) return "";
  return `${Math.round(scored)} of ${Math.round(control)} control drives`;
}

function conversionRateWithSample(values = {}) {
  const value = rate(values.scoring_conversion_rate);
  const sample = conversionSampleLabel(values);
  return sample ? `${value} (${sample.replace(" control drives", "")})` : value;
}

function trajectoryPublicLabel(value) {
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
  if (!raw) return "-";
  return labels[raw] || raw.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function pregameRatingSourceLabel(context = {}) {
  const labels = {
    anchor_only: "Frozen preseason anchor",
    anchor_live_blend: `Anchor/live blend · ${formatNumber(Number(context.pregame_anchor_weight) * 100, 0)}% anchor`,
    live_only: "Live prior-game ADV",
    anchor_fallback_live_unavailable: "Frozen preseason anchor · live data unavailable",
    live_fallback_anchor_unavailable: "Live prior-game ADV · anchor unavailable",
    unavailable: "Unavailable",
  };
  return labels[context.pregame_adv_rating_source] || "Frozen prior-game snapshot";
}

function percentWhole(value) {
  const number = numberOrNull(value);
  return number === null ? "-" : `${number.toFixed(2)}%`;
}

function signed(value) {
  const number = numberOrNull(value);
  if (number === null) return "-";
  return number > 0 ? `+${Math.round(number)}` : String(Math.round(number));
}

function fieldGoalLine(stats) {
  const made = numberOrNull(stats.field_goals_made);
  const attempts = numberOrNull(stats.field_goals_attempted);
  if (made === null && attempts === null) return "-";
  return `${whole(made)} / ${whole(attempts)} (${rate(stats.field_goal_rate)})`;
}

function conversion(made, attempts, storedRate) {
  const madeNumber = numberOrNull(made);
  const attemptsNumber = numberOrNull(attempts);
  const pct = attemptsNumber ? (madeNumber || 0) / attemptsNumber : numberOrNull(storedRate);
  const pctText = pct === null ? "-" : `${(pct * 100).toFixed(2)}%`;
  return `${whole(madeNumber)} / ${whole(attemptsNumber)} (${pctText})`;
}

function pointsPerGame(points, gamesPlayed) {
  const pointsNumber = numberOrNull(points);
  const gamesNumber = numberOrNull(gamesPlayed);
  return pointsNumber === null || !gamesNumber ? "-" : (pointsNumber / gamesNumber).toFixed(1);
}

function perGame(total, gamesPlayed) {
  const totalNumber = numberOrNull(total);
  const gamesNumber = numberOrNull(gamesPlayed);
  return totalNumber === null || !gamesNumber ? "-" : (totalNumber / gamesNumber).toFixed(1);
}

async function loadRankingsPage() {
  setStatus("Loading ranking seasons...");
  const seasonsPayload = await api("/api/seasons");
  const seasons = seasonsPayload.seasons || [];
  const seasonSelect = $("rankSeasonSelect");
  seasonSelect.innerHTML = seasons.map((season) => `<option value="${season}">${season}</option>`).join("");
  seasonSelect.value = String(seasons[0] || "");
  seasonSelect.addEventListener("change", populateRankWeeks);
  $("loadRankingsButton").addEventListener("click", renderRankingsCompare);
  await populateRankWeeks();
  setStatus("Rankings comparison ready.", "ok");
}

async function populateRankWeeks() {
  const season = $("rankSeasonSelect").value;
  if (!season) return;
  const weekSelect = $("rankWeekSelect");
  weekSelect.innerHTML = '<option value="">Latest available</option>';
  try {
    const payload = await api(`/api/product-a/rankings-compare?season=${encodeURIComponent(season)}`);
    const weeks = payload.available_weeks || [];
    weekSelect.innerHTML = weeks.map((week) => `<option value="${week}">Week ${week}</option>`).join("");
    weekSelect.value = String(payload.week || weeks[weeks.length - 1] || "");
    renderRankingsPayload(payload);
  } catch (error) {
    $("rankingsSummary").innerHTML = `<div class="empty-state">AP poll comparison is not available for this season yet.</div>`;
    $("advTop25Table").innerHTML = "";
    $("apTop25Table").innerHTML = "";
    $("rankCompareTable").innerHTML = "";
  }
}

async function renderRankingsCompare() {
  const season = $("rankSeasonSelect").value;
  const week = $("rankWeekSelect").value;
  if (!season) return;
  setStatus("Loading rankings comparison...");
  const path = `/api/product-a/rankings-compare?season=${encodeURIComponent(season)}${week ? `&week=${encodeURIComponent(week)}` : ""}`;
  try {
    renderRankingsPayload(await api(path));
    setStatus("Rankings comparison loaded.", "ok");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function renderRankingsPayload(payload) {
  const summary = payload.summary || {};
  $("rankingsSummary").innerHTML = `
    <div class="summary-grid">
      <div><span>Season</span><strong>${escapeHtml(payload.season || "-")}</strong></div>
      <div><span>Poll Week</span><strong>${escapeHtml(payload.week || "-")}</strong></div>
      <div><span>Model-Only Strength Board</span><strong>${escapeHtml(summary.adv_only_top_25 ?? "-")}</strong></div>
      <div><span>AP-Only Poll Board</span><strong>${escapeHtml(summary.ap_only_top_25 ?? "-")}</strong></div>
      <div><span>Model Higher</span><strong>${escapeHtml(summary.model_higher ?? "-")}</strong></div>
      <div><span>Poll Higher</span><strong>${escapeHtml(summary.poll_higher ?? "-")}</strong></div>
    </div>
    <p class="interpretation">${escapeHtml(payload.poll_timing_note || "Poll comparison is perception context.")}</p>
  `;
  renderRows("advTop25Table", payload.adv_top_25 || [], [
    { label: "Strength Rank", key: "adv_rank" },
    { label: "Team", key: "team" },
    { label: "Conference", key: "conference" },
    { label: "Strength Rating", render: (row) => formatNumber(row.adv_srs, 2) },
  ]);
  renderRows("apTop25Table", payload.ap_top_25 || [], [
    { label: "AP Rank", key: "ap_rank" },
    { label: "Team", key: "team" },
    { label: "Conference", key: "conference" },
    { label: "Points", key: "points" },
  ]);
  renderRows("rankCompareTable", payload.comparison || [], [
    { label: "Team", key: "team" },
    { label: "Model Strength", render: (row) => row.adv_rank ?? "-" },
    { label: "AP", render: (row) => row.ap_rank ?? "-" },
    { label: "Rank Gap", render: (row) => row.rank_gap ?? "-" },
    { label: "Read", key: "label" },
  ]);
}

let recordPathPayload = null;
let teamLogoCatalogPromise = null;
let activeTeamLogos = {};

function teamInitials(team) {
  return String(team || "-")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

async function loadTeamLogoCatalog() {
  if (!teamLogoCatalogPromise) {
    teamLogoCatalogPromise = fetch("team-logos.json?v=4.0.52", { cache: "force-cache" })
      .then((response) => response.ok ? response.json() : { teams: {} })
      .then((payload) => payload.teams || {})
      .catch(() => ({}));
  }
  return teamLogoCatalogPromise;
}

function teamLogoMarkup(team, logos) {
  const key = String(team || "").trim().toLowerCase();
  const url = logos[key];
  return `
    <span class="hub-team-logo ${url ? "has-logo" : "is-fallback"}" aria-hidden="true">
      <span class="team-logo-fallback">${escapeHtml(teamInitials(team))}</span>
      ${url ? `<img src="${escapeHtml(url)}" alt="" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.remove('has-logo');this.parentElement.classList.add('is-fallback')">` : ""}
    </span>
  `;
}

function homeMatchupLogoMarkup(team, logos) {
  const key = String(team || "").trim().toLowerCase();
  const url = logos[key];
  const teamName = escapeHtml(team || "Unknown team");
  return `<span class="team-logo ${url ? "has-logo" : "is-fallback"}" title="${teamName}" aria-label="${teamName}"><span class="team-logo-fallback" aria-hidden="true">${escapeHtml(teamInitials(team))}</span>${url ? `<img src="${escapeHtml(url)}" alt="" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.remove('has-logo');this.parentElement.classList.add('is-fallback')">` : ""}</span>`;
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

function renderHomeMatchupCard(matchup, logos) {
  const matchupDate = matchupDateLabel(matchup);
  const awayConference = String(matchup.away_conference || "").trim();
  const homeConference = String(matchup.home_conference || "").trim();
  const sameConference = awayConference && homeConference && awayConference.toLowerCase() === homeConference.toLowerCase();
  let conferenceMarkup = "";
  if (sameConference && awayConference) {
    conferenceMarkup = `<div class="matchup-conference-group"><span class="matchup-conference-tag">${escapeHtml(shortConferenceTag(awayConference))}</span></div>`;
  } else if (awayConference && homeConference) {
    conferenceMarkup = `
      <div class="matchup-conference-group">
        <span class="matchup-conference-tag">${escapeHtml(shortConferenceTag(awayConference))}</span>
        <span class="matchup-conference-divider">non-conf</span>
        <span class="matchup-conference-tag">${escapeHtml(shortConferenceTag(homeConference))}</span>
      </div>
    `;
  }
  return `
    <article class="featured-matchup-card matchup-rail-card home-matchup-card">
      <div class="featured-matchup-topline">
        <span>${escapeHtml(matchupDate)}</span>
        <strong>${escapeHtml(matchup.context_label || "Pregame Context")}</strong>
      </div>
      <div class="featured-matchup-title">
        <div>
          <span>Away</span>
          <span class="team-name-with-logo">${homeMatchupLogoMarkup(matchup.away_team, logos)}</span>
        </div>
        <div>
          <b>vs</b>
          ${conferenceMarkup}
        </div>
        <div>
          <span>Home</span>
          <span class="team-name-with-logo">${homeMatchupLogoMarkup(matchup.home_team, logos)}</span>
        </div>
      </div>
      <div class="weekly-projection-strip">
        <div><span>Model Lean</span><strong>${escapeHtml(matchup.projected_winner)}</strong></div>
        <div><span>Projected Margin</span><strong>By ${formatProjectionMargin(matchup.projected_margin_abs)}</strong></div>
        <div><span title="How close the projected margin is, not model confidence">Projection Closeness</span><strong>${formatPercent(matchup.projection_closeness ?? matchup.close_matchup_risk, 0)}</strong></div>
      </div>
    </article>
  `;
}

function scrollHomeMatchups(direction) {
  const rail = $("homeFeaturedMatchups");
  if (!rail) return;
  const card = rail.querySelector(".featured-matchup-card");
  const styles = window.getComputedStyle(rail);
  const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
  rail.scrollBy({ left: direction * ((card?.getBoundingClientRect().width || 430) + gap), behavior: "smooth" });
}

async function loadHomeWeeklySurface() {
  const rail = $("homeFeaturedMatchups");
  const empty = $("homeMatchupsEmpty");
  if (!rail || !empty) return;
  try {
    const [payload, logos] = await Promise.all([
      api("/api/product-a/current-week?limit=8"),
      loadTeamLogoCatalog(),
    ]);
    const matchups = payload.matchups || [];
    const status = payload.status || {};
    $("homeMatchupsLabel").textContent = status.label || `Week ${payload.week || 1}`;
    $("homeMatchupsMessage").textContent = "Certified pregame outlooks for the games that define the week.";
    if (!payload.weekly_snapshot_available || !matchups.length) {
      rail.classList.add("is-hidden");
      empty.querySelector(".home-matchups-spinner")?.classList.add("is-hidden");
      $("homeMatchupsEmptyTitle").textContent = status.label || "Weekly snapshot pending";
      $("homeMatchupsEmptyNote").textContent = payload.weekly_snapshot_note || status.message || "Featured matchup outlooks are not available yet.";
      return;
    }
    rail.innerHTML = matchups.map((matchup) => renderHomeMatchupCard(matchup, logos)).join("");
    rail.classList.remove("is-hidden");
    empty.classList.add("is-hidden");
    const week = payload.week || status.selected_week || 1;
    const cta = $("homeMatchupsCta");
    const explore = $("homeMatchupsExplore");
    const destination = new URLSearchParams({ full_slate: "1" });
    if (LOCAL_API_OVERRIDE) destination.set("api", LOCAL_API_OVERRIDE);
    explore.textContent = `Explore All Week ${week} Matchups`;
    explore.href = `matchups.html?${destination.toString()}#full-slate`;
    cta.classList.remove("is-hidden");
    $("homeMatchupPrevious")?.addEventListener("click", () => scrollHomeMatchups(-1));
    $("homeMatchupNext")?.addEventListener("click", () => scrollHomeMatchups(1));
  } catch (error) {
    console.error("CFP Advantage home matchups failed:", error);
    empty.querySelector(".home-matchups-spinner")?.classList.add("is-hidden");
    $("homeMatchupsLabel").textContent = "Games Of The Week";
    $("homeMatchupsEmptyTitle").textContent = "Featured matchups are reconnecting";
    $("homeMatchupsEmptyNote").textContent = "The full weekly slate remains available on the Matchups page.";
  }
}

async function loadHomeProductStatus() {
  const note = $("homeValidationNote");
  if (!note) return;
  try {
    const payload = await api("/api/product-a/live-tracker?season=2026");
    const summary = payload.summary || {};
    const graded = Number(summary.games_graded || 0);
    $("homePublishedPicks").textContent = String(summary.games_published ?? 0);
    $("homeWinnerAccuracy").textContent = summary.winner_accuracy === null || summary.winner_accuracy === undefined
      ? "Pending"
      : formatPercent(summary.winner_accuracy, 1);
    $("homeMarginMae").textContent = summary.margin_mae === null || summary.margin_mae === undefined
      ? "Pending"
      : formatNumber(summary.margin_mae, 2);
    $("homeGradedPicks").textContent = String(graded);
    note.textContent = graded
      ? "Updated after the latest certified grading run."
      : "Published before kickoff. Grading begins after certified finals.";
  } catch (error) {
    console.error("CFP Advantage home validation snapshot failed:", error);
    note.textContent = "The certified season snapshot is temporarily unavailable.";
  }
}

function unofficialResultCard(result, logos) {
  const tone = result.model_result === "W" ? "is-win" : result.model_result === "L" ? "is-loss" : "is-push";
  const outcome = result.model_result === "W" ? "Win" : result.model_result === "L" ? "Loss" : "Push";
  return `
    <article class="home-unofficial-result ${tone}">
      <div class="home-unofficial-result-topline">
        <span>Final</span>
        <b>${outcome}</b>
      </div>
      <div class="home-unofficial-scoreline">
        <span>${teamLogoMarkup(result.away_team, logos)}<strong>${escapeHtml(result.away_team)} ${escapeHtml(result.away_score)}</strong></span>
        <em>-</em>
        <span>${teamLogoMarkup(result.home_team, logos)}<strong>${escapeHtml(result.home_team)} ${escapeHtml(result.home_score)}</strong></span>
      </div>
      <small>ADV pick: ${escapeHtml(result.projected_winner)} by ${formatProjectionMargin(result.projected_margin_abs)}</small>
    </article>
  `;
}

async function loadHomeUnofficialWeeklyPicks() {
  const current = await api("/api/product-a/current-week?limit=8");
  const season = Number(current.status?.season);
  const week = Number(current.status?.selected_week);
  if (!Number.isInteger(season) || season < 1 || !Number.isInteger(week) || week < 1) {
    throw new Error("No published week is available for unofficial results.");
  }
  // The unpinned current-week feed removes past games; results need the entire frozen week.
  const snapshot = await api(`/api/product-a/current-week?season=${season}&week=${week}&limit=150`);
  if (!snapshot.weekly_snapshot_available || !snapshot.matchups?.length) {
    throw new Error("The frozen weekly picks are temporarily unavailable.");
  }
  return snapshot;
}

async function loadHomeUnofficialResults() {
  const host = $("homeUnofficialResultsList");
  const label = $("homeUnofficialResultsLabel");
  if (!host || !label) return;

  try {
    const [picksPayload, scoreResponse, logos] = await Promise.all([
      loadHomeUnofficialWeeklyPicks(),
      fetch(`${API_BASE}/api/game-day/scoreboard?classification=fbs`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      }),
      loadTeamLogoCatalog(),
    ]);
    if (!scoreResponse.ok) throw new Error(`Scoreboard request failed with ${scoreResponse.status}`);

    const scorePayload = await scoreResponse.json();
    const picks = Array.isArray(picksPayload.matchups) ? picksPayload.matchups : [];
    const pickByGame = new Map(picks.map((pick) => [String(pick.game_id), pick]));
    const finals = (Array.isArray(scorePayload.games) ? scorePayload.games : [])
      .filter((game) => game.status === "completed" && pickByGame.has(String(game.game_id)))
      .filter((game) => Number.isFinite(game.away_team?.points) && Number.isFinite(game.home_team?.points))
      .map((game) => {
        const pick = pickByGame.get(String(game.game_id));
        const awayScore = Number(game.away_team?.points);
        const homeScore = Number(game.home_team?.points);
        const actualWinner = awayScore === homeScore
          ? null
          : awayScore > homeScore ? pick.away_team : pick.home_team;
          
        const projectedWinnerScore = pick.projected_winner === pick.away_team ? awayScore : homeScore;
        const projectedLoserScore = pick.projected_winner === pick.away_team ? homeScore : awayScore;
        const actualProjectedWinnerMargin = projectedWinnerScore - projectedLoserScore;
        const marginError = Math.abs(actualProjectedWinnerMargin - Number(pick.projected_margin_abs));
        return {
          game_id: String(game.game_id),
          start_date: game.start_date,
          away_team: pick.away_team,
          home_team: pick.home_team,
          away_score: awayScore,
          home_score: homeScore,
          projected_winner: pick.projected_winner,
          projected_margin_abs: pick.projected_margin_abs,
          model_result: actualWinner === null ? "P" : actualWinner === pick.projected_winner ? "W" : "L",
          margin_error: marginError,
        };
      })
      .sort((left, right) => new Date(right.start_date).getTime() - new Date(left.start_date).getTime());

    const wins = finals.filter((game) => game.model_result === "W").length;
    const losses = finals.filter((game) => game.model_result === "L").length;
    const pushes = finals.filter((game) => game.model_result === "P").length;
    const completedGames = finals.length;
    const decidedGames = wins + losses;
    
    const winnerAccuracy = decidedGames ? (wins / decidedGames) * 100 : 0;
    const averageMarginError = completedGames 
      ? finals.reduce((sum, game) => sum + game.margin_error, 0) / completedGames 
      : null;
    const week = picksPayload.status?.selected_week || picks[0]?.week || 1;
    label.textContent = `Week ${week}`;
    $("homeUnofficialCompleted").textContent = String(completedGames);
    $("homeUnofficialModelRecord").textContent = `${wins}-${losses}${pushes ? `-${pushes}` : ""}`;
    $("homeUnofficialAccuracy").textContent = `${winnerAccuracy.toFixed(1)}%`;
    $("homeUnofficialMae").textContent = averageMarginError === null
      ? "-"
      : averageMarginError.toFixed(1);
    unofficialResultsData = finals;
    unofficialResultsLogos = logos;
    unofficialResultsPage = 0;
    host.innerHTML = finals.length
      ? finals.slice(0, 4).map((result) => unofficialResultCard(result, logos)).join("")
      : '<span class="home-unofficial-empty">Completed games will appear here as live finals become available.</span>';
  } catch (error) {
    console.error("CFP Advantage unofficial results failed:", error);
    for (const id of ["homeUnofficialCompleted", "homeUnofficialModelRecord", "homeUnofficialAccuracy", "homeUnofficialMae"]) {
      $(id).textContent = "-";
    }
    host.innerHTML = '<span class="home-unofficial-empty">The live results feed is reconnecting. Certified records remain unchanged.</span>';
  }
}

function renderUnofficialResultsModal() {
  const modalList = $("homeUnofficialModalList");
  const pageLabel = $("homeUnofficialPageLabel");
  const previousButton = $("homeUnofficialPrevious");
  const nextButton = $("homeUnofficialNext");
  const summary = $("homeUnofficialModalSummary");

  if (!modalList || !pageLabel) return;

  const total = unofficialResultsData.length;
  const totalPages = Math.max(
    1,
    Math.ceil(total / UNOFFICIAL_RESULTS_PAGE_SIZE)
  );

  unofficialResultsPage = Math.min(
    unofficialResultsPage,
    totalPages - 1
  );

  const start =
    unofficialResultsPage * UNOFFICIAL_RESULTS_PAGE_SIZE;

  const visibleResults = unofficialResultsData.slice(
    start,
    start + UNOFFICIAL_RESULTS_PAGE_SIZE
  );

  const wins = unofficialResultsData.filter(
    (game) => game.model_result === "W"
  ).length;

  const losses = unofficialResultsData.filter(
    (game) => game.model_result === "L"
  ).length;

  const pushes = unofficialResultsData.filter(
    (game) => game.model_result === "P"
  ).length;

  const decidedGames = wins + losses;

  const accuracy = decidedGames
    ? (wins / decidedGames) * 100
    : 0;

  const mae = total
    ? unofficialResultsData.reduce(
        (sum, game) => sum + game.margin_error,
        0
      ) / total
    : null;

  summary.innerHTML = `
    <div>
      <span>Completed Games</span>
      <strong>${total}</strong>
    </div>

    <div>
      <span>Model Record</span>
      <strong>${wins}-${losses}${pushes ? `-${pushes}` : ""}</strong>
    </div>

    <div>
      <span>Winner Accuracy</span>
      <strong>${accuracy.toFixed(1)}%</strong>
    </div>

    <div>
      <span>Average Margin Error</span>
      <strong>${mae === null ? "-" : mae.toFixed(1)}</strong>
    </div>
  `;

  modalList.innerHTML = visibleResults.length
    ? visibleResults
        .map((result) =>
          unofficialResultCard(
            result,
            unofficialResultsLogos
          )
        )
        .join("")
    : '<span class="home-unofficial-empty">No completed games yet.</span>';

  pageLabel.textContent =
    `Page ${unofficialResultsPage + 1} of ${totalPages}`;

  previousButton.disabled =
    unofficialResultsPage === 0;

  nextButton.disabled =
    unofficialResultsPage >= totalPages - 1;
}

async function loadHomeScoreStrip() {
  const host = $("homeScoreboardStrip");
  if (!host || !window.CFPAdvantageScoreboard) return;
  await window.CFPAdvantageScoreboard.load({ host, apiBase: API_BASE, compact: true, limit: 4 });
}

function renderHubPick(matchup, logos) {
  const date = hubKickoffLabel(matchup);
  const projection = matchup.projection_unavailable
    ? "Schedule only"
    : `${matchup.projection_limited ? "Limited projection: " : ""}${matchup.projected_winner || "Model lean pending"} by ${formatProjectionMargin(matchup.projected_margin_abs)}`;
  return `
    <article class="hub-pick-row">
      <div class="hub-pick-teams">
        <div>${teamLogoMarkup(matchup.away_team, logos)}<strong>${escapeHtml(matchup.away_team)}</strong></div>
        <span>at</span>
        <div>${teamLogoMarkup(matchup.home_team, logos)}<strong>${escapeHtml(matchup.home_team)}</strong></div>
      </div>
      <div class="hub-pick-read">
        <span>${escapeHtml(date)}</span>
        <strong>${escapeHtml(projection)}</strong>
        <small>${escapeHtml(matchup.context_label || "Pregame Context")}</small>
      </div>
    </article>
  `;
}

function hubKickoffLabel(matchup) {
  const fallback = matchupDateLabel(matchup);
  if (matchup.kickoff_time_tbd) return `${fallback} · Time TBD`;
  if (!matchup.kickoff_at) return fallback;
  const kickoff = new Date(matchup.kickoff_at);
  if (Number.isNaN(kickoff.getTime())) return fallback;
  const kickoffDate = kickoff.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
  const kickoffTime = kickoff.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
  return `${kickoffDate} · ${kickoffTime} ET`;
}

function hubChronologicalValue(matchup) {
  if (matchup.kickoff_at) {
    const kickoff = new Date(matchup.kickoff_at).getTime();
    if (Number.isFinite(kickoff)) return kickoff;
  }
  const fallback = new Date(`${matchup.date || "9999-12-31"}T23:59:59`).getTime();
  return Number.isFinite(fallback) ? fallback : Number.MAX_SAFE_INTEGER;
}

function featuredGameDayMatchups(matchups, limit = 20) {
  const selected = [...matchups]
    .sort((left, right) => {
      const leftSupported = left.projection_unavailable || left.projection_limited ? 0 : 1;
      const rightSupported = right.projection_unavailable || right.projection_limited ? 0 : 1;
      if (leftSupported !== rightSupported) return rightSupported - leftSupported;
      const scoreDifference = Number(right.feature_score || -999) - Number(left.feature_score || -999);
      if (scoreDifference) return scoreDifference;
      const dateDifference = String(left.date || "").localeCompare(String(right.date || ""));
      if (dateDifference) return dateDifference;
      return String(left.away_team || "").localeCompare(String(right.away_team || ""));
    })
    .slice(0, limit);
  return selected.sort((left, right) => {
    const kickoffDifference = hubChronologicalValue(left) - hubChronologicalValue(right);
    if (kickoffDifference) return kickoffDifference;
    return String(left.away_team || "").localeCompare(String(right.away_team || ""));
  });
}

async function loadHubGameDayCenter() {
  const status = $("hubPicksStatus");
  const list = $("hubPicksList");
  if (!status || !list) return;
  installHubLiveScoreboard();
  try {
    const refreshQuery = forceRefreshActive() ? "&refresh=true" : "";
    const [payload, logos] = await Promise.all([
      api(`/api/product-a/current-week?limit=150&include_schedule_only=true${refreshQuery}`),
      loadTeamLogoCatalog(),
    ]);
    const allMatchups = payload.matchups || [];
    const matchups = featuredGameDayMatchups(allMatchups);
    const heading = $("hubPicksHeading");
    if (heading) heading.textContent = payload.status?.label || `2026 Week ${payload.week || 1} Model Board`;
    list.innerHTML = matchups.length
      ? matchups.map((matchup) => renderHubPick(matchup, logos)).join("")
      : '<div class="empty-state compact">Published Week 1 picks are temporarily unavailable.</div>';
    status.textContent = matchups.length
      ? `${matchups.length} featured games shown from the ${allMatchups.length}-game slate. Certified projections remain frozen before kickoff.`
      : "The public receipt is preserved while the matchup feed reconnects.";
    status.className = `status-line ${matchups.length ? "ok" : "warn"}`;
  } catch (error) {
    console.error("CFP Advantage Hub picks failed:", error);
    status.textContent = "Published picks are temporarily unavailable here. The public receipt remains preserved.";
    status.className = "status-line warn";
    list.innerHTML = '<div class="empty-state compact">Open Matchups or the public pick receipts to view the frozen Week 1 board.</div>';
  }
}

function installHubLiveScoreboard() {
  const button = $("loadHubLiveScoreboard");
  if (!button || button.dataset.bound === "true") return;
  button.addEventListener("click", async () => {
    const embed = $("hubLiveScoreboardEmbed");
    const host = $("hubLiveScoreboardFrame");
    if (!embed || !host) return;
    const hidden = embed.classList.contains("is-hidden");
    if (!hidden) {
      embed.classList.add("is-hidden");
      button.setAttribute("aria-expanded", "false");
      button.textContent = "Show Scores";
      return;
    }
    embed.classList.remove("is-hidden");
    button.setAttribute("aria-expanded", "true");
    button.textContent = "Refreshing Scores...";
    await window.CFPAdvantageScoreboard.load({ host, apiBase: API_BASE });
    button.textContent = "Hide Scores";
  });
  button.dataset.bound = "true";
}

async function loadLive2026Page() {
  installValidationModal();
  installGridironReportModal();
  installOffenseReportModal();
  await Promise.all([loadSeasonTracker(), loadHubGameDayCenter()]);
  const status = $("recordPathStatus");
  if (!status) return;
  try {
    status.textContent = "Loading 2026 record paths...";
    const refreshQuery = forceRefreshActive() ? "&refresh=true" : "";
    recordPathPayload = await api(`/api/product-a/record-probabilities?season=2026&limit=136${refreshQuery}`);
    populateRecordTeamSelect(recordPathPayload);
    renderRecordPathBoard();
    status.textContent = recordPathPayload.method_note || "Record paths loaded.";
    status.className = "status-line ok";
  } catch (error) {
    status.textContent = "Record paths are not available yet.";
    status.className = "status-line warn";
    $("recordPathSummary").innerHTML = `
      <div><span>Display Status</span><strong>API Update Pending</strong></div>
      <div><span>Method</span><strong>Exact Distribution</strong><small>Game probabilities drive record paths</small></div>
      <div><span>Pac-12 Flex Teams</span><strong>Held Out</strong><small>Until final matchup is set</small></div>
      <div><span>Update Policy</span><strong>Certified Runs</strong><small>Paths update through the documented weekly process</small></div>
    `;
    $("recordPathDetail").innerHTML = `
      <div class="record-team-card">
        <p class="eyebrow">Record Paths</p>
        <h3>Record Paths Are Temporarily Unavailable</h3>
        <p>
          The certified record-path data could not be loaded. Team matchup projections remain available,
          and this board will return automatically when the data service is available.
        </p>
      </div>
    `;
    $("recordPathLeaderboard").innerHTML = "";
  }
}

async function loadSeasonTracker() {
  const status = $("seasonTrackerStatus");
  if (!status) return;
  try {
    const refreshQuery = forceRefreshActive() ? "&refresh=true" : "";
    const payload = await api(`/api/product-a/live-tracker?season=2026${refreshQuery}`);
    const summary = payload.summary || {};
    const graded = Number(summary.games_graded || 0);
    const accuracy = summary.winner_accuracy === null || summary.winner_accuracy === undefined
      ? "-"
      : formatPercent(summary.winner_accuracy, 1);
    const marginMae = summary.margin_mae === null || summary.margin_mae === undefined
      ? "-"
      : formatNumber(summary.margin_mae, 2);
    $("seasonTrackerSummary").innerHTML = `
      <div><span>Published Picks</span><strong>${escapeHtml(summary.games_published ?? 0)}</strong></div>
      <div><span>Graded</span><strong>${escapeHtml(graded)}</strong></div>
      <div><span>Pending</span><strong>${escapeHtml(summary.games_pending ?? 0)}</strong></div>
      <div><span>Winner Accuracy</span><strong>${accuracy}</strong><small>${graded ? "Completed picks only" : "Begins after final scores"}</small></div>
      <div><span>Margin MAE</span><strong>${marginMae}</strong><small>${graded ? "Average absolute error" : "Begins after final scores"}</small></div>
    `;
    const weeks = payload.weeks || [];
    $("seasonTrackerWeeks").innerHTML = weeks.length ? weeks.map((row) => {
      const weekGraded = Number(row.games_graded || 0);
      const state = weekGraded
        ? `${weekGraded} graded`
        : `${Number(row.games_pending || 0)} awaiting finals`;
      const weekAccuracy = row.winner_accuracy === null || row.winner_accuracy === undefined
        ? "-"
        : formatPercent(row.winner_accuracy, 1);
      return `
        <article>
          <div><span>Week ${escapeHtml(row.week)}</span><strong>${escapeHtml(state)}</strong></div>
          <div><span>Winner Accuracy</span><strong>${weekAccuracy}</strong></div>
          <div><span>Margin MAE</span><strong>${row.margin_mae === null || row.margin_mae === undefined ? "-" : formatNumber(row.margin_mae, 2)}</strong></div>
          <small>Receipt v${escapeHtml(row.receipt_version || 1)} · ${escapeHtml(String(row.publication_status || "preliminary").replaceAll("-", " "))}</small>
        </article>
      `;
    }).join("") : '<div class="empty-state compact">No certified weekly receipts are available yet.</div>';
    const updated = payload.updated_at_utc ? new Date(payload.updated_at_utc) : null;
    $("seasonTrackerUpdated").textContent = updated && !Number.isNaN(updated.getTime())
      ? `Last certified update: ${updated.toLocaleString()}. ${payload.update_policy || ""}`
      : (payload.update_policy || "Updated after each certified weekly run.");
    status.textContent = graded ? "Certified season results are current." : "Week 1 picks are published and awaiting final scores.";
    status.className = "status-line ok";
  } catch (error) {
    console.error("CFP Advantage season tracker failed:", error);
    status.textContent = "The certified season tracker is temporarily unavailable.";
    status.className = "status-line warn";
    $("seasonTrackerSummary").innerHTML = "";
    $("seasonTrackerWeeks").innerHTML = "";
    $("seasonTrackerUpdated").textContent = "Public timestamped receipts remain available in the validation repository.";
  }
}

function installGridironReportModal() {
  const modal = document.querySelector("[data-gridiron-modal]");
  if (!modal || modal.dataset.bound === "true") return;
  document.querySelectorAll("[data-open-gridiron-report]").forEach((trigger) => {
    trigger.addEventListener("click", openGridironReportModal);
  });
  document.querySelectorAll("[data-close-gridiron-report]").forEach((trigger) => {
    trigger.addEventListener("click", closeGridironReportModal);
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeGridironReportModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("is-hidden")) {
      closeGridironReportModal();
    }
  });
  modal.dataset.bound = "true";
}

function openGridironReportModal() {
  const modal = document.querySelector("[data-gridiron-modal]");
  if (!modal) return;
  modal.classList.remove("is-hidden");
  document.body.classList.add("modal-open");
  modal.querySelector("[data-close-gridiron-report]")?.focus();
}

function closeGridironReportModal() {
  const modal = document.querySelector("[data-gridiron-modal]");
  if (!modal) return;
  modal.classList.add("is-hidden");
  document.body.classList.remove("modal-open");
}

function installOffenseReportModal() {
  const modal = document.querySelector("[data-offense-report-modal]");
  if (!modal || modal.dataset.bound === "true") return;
  document.querySelectorAll("[data-open-offense-report]").forEach((trigger) => {
    trigger.addEventListener("click", openOffenseReportModal);
  });
  document.querySelectorAll("[data-close-offense-report]").forEach((trigger) => {
    trigger.addEventListener("click", closeOffenseReportModal);
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeOffenseReportModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("is-hidden")) {
      closeOffenseReportModal();
    }
  });
  modal.dataset.bound = "true";
}

function openOffenseReportModal() {
  const modal = document.querySelector("[data-offense-report-modal]");
  if (!modal) return;
  modal.classList.remove("is-hidden");
  document.body.classList.add("modal-open");
  modal.querySelector("[data-close-offense-report]")?.focus();
}

function closeOffenseReportModal() {
  const modal = document.querySelector("[data-offense-report-modal]");
  if (!modal) return;
  modal.classList.add("is-hidden");
  document.body.classList.remove("modal-open");
}

function installValidationModal() {
  const modal = document.querySelector("[data-validation-modal]");
  if (!modal || modal.dataset.bound === "true") return;
  document.querySelectorAll("[data-open-validation]").forEach((trigger) => {
    trigger.addEventListener("click", openValidationModal);
  });
  document.querySelectorAll("[data-close-validation]").forEach((trigger) => {
    trigger.addEventListener("click", closeValidationModal);
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeValidationModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("is-hidden")) {
      closeValidationModal();
    }
  });
  modal.dataset.bound = "true";
}

function openValidationModal() {
  const modal = document.querySelector("[data-validation-modal]");
  if (!modal) return;
  modal.classList.remove("is-hidden");
  document.body.classList.add("modal-open");
  modal.querySelector("[data-close-validation]")?.focus();
}

function closeValidationModal() {
  const modal = document.querySelector("[data-validation-modal]");
  if (!modal) return;
  modal.classList.add("is-hidden");
  document.body.classList.remove("modal-open");
}

function populateRecordTeamSelect(payload) {
  const select = $("recordTeamSelect");
  if (!select) return;
  const options = (payload.team_options || [])
    .filter((row) => row.status === "active")
    .sort((a, b) => String(a.team || "").localeCompare(String(b.team || "")));
  select.innerHTML = options.map((row) => (
    `<option value="${escapeHtml(row.team)}">${escapeHtml(row.team)}</option>`
  )).join("");
  const firstTeam = (payload.teams || []).find((row) => row.status === "active")?.team || options[0]?.team || "";
  select.value = firstTeam;
  if (!select.dataset.bound) {
    select.addEventListener("change", () => renderRecordPathBoard({ scroll: true }));
    select.dataset.bound = "true";
  }
}

function selectedRecordTeam() {
  const selected = $("recordTeamSelect")?.value;
  const teams = recordPathPayload?.teams || [];
  return teams.find((row) => row.team === selected) || teams.find((row) => row.status === "active") || null;
}

function recordDistributionBars(distribution = {}) {
  const entries = Object.entries(distribution)
    .map(([record, probability]) => ({ record, probability: Number(probability) }))
    .filter((row) => Number.isFinite(row.probability))
    .sort((a, b) => {
      const winsA = Number(String(a.record).split("-")[0]);
      const winsB = Number(String(b.record).split("-")[0]);
      return winsB - winsA;
    });
  if (!entries.length) return '<div class="empty-state compact">Record distribution unavailable.</div>';
  return `
    <div class="record-distribution-bars">
      ${entries.map((row) => `
        <div class="record-bar-row">
          <span>${escapeHtml(row.record)}</span>
          <div class="record-bar-track"><i style="width:${Math.max(2, Math.min(100, row.probability * 100))}%"></i></div>
          <strong>${formatPercent(row.probability, 1)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function locationLabel(side) {
  if (side === "home") return "vs";
  if (side === "away") return "at";
  return "vs";
}

function recordPathCard(team = {}) {
  const fallback = {
    team: team.team,
    expected_wins: team.expected_wins,
    most_likely_record: team.likely_record,
    most_likely_record_probability: team.likely_record_probability,
    median_record: team.median_record,
    prob_10_plus_wins: team.prob_10_plus_wins,
    prob_11_plus_wins: team.prob_11_plus_wins,
    prob_12_plus_wins: team.prob_12_plus_wins ?? team.prob_undefeated,
    playoff_range_probability: team.prob_10_plus_wins,
    recent_3yr_regular_wins_avg: team.recent_3yr_regular_wins_avg,
    expected_vs_recent_3yr_regular_wins_gap: team.expected_vs_recent_3yr_regular_wins_gap,
    expected_losses: team.expected_loss_games || [],
    loss_risk_games: [],
    upside_flip_path: team.upside_flip_path || [],
    locked_path_scenarios: [],
    why_distribution_is_cautious: [],
    public_read: "This is a schedule-path view from today's frozen assumptions.",
  };
  return { ...fallback, ...(team.record_path_card || {}) };
}

function renderPathRiskGames(card = {}) {
  const losses = Array.isArray(card.expected_losses) ? card.expected_losses : [];
  const riskGames = Array.isArray(card.loss_risk_games) ? card.loss_risk_games : [];
  const seen = new Set();
  const games = [...losses, ...riskGames].filter((game) => {
    const key = game.game_id || `${game.week}:${game.side}:${game.opponent}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!games.length) {
    return '<div class="empty-state compact">No path-risk games are available for this team.</div>';
  }
  const helpText = losses.length
    ? "Expected losses are listed first. The remaining rows are favored games with the highest individual loss risk and path impact."
    : "The team is favored in every game, but these games carry the highest individual loss risk and can still make one loss more likely than an unbeaten season.";
  return `
    <p class="interpretation compact">${escapeHtml(helpText)}</p>
    <div class="expected-loss-list">
      ${games.slice(0, 10).map((game) => {
        const winProbability = Number(game.win_probability);
        const lossProbability = Number.isFinite(Number(game.loss_probability))
          ? Number(game.loss_probability)
          : Number.isFinite(winProbability) ? 1 - winProbability : null;
        const pathClass = game.path_class === "expected_loss" ? "Expected loss" : "Loss-risk game";
        const tenWin = formatSignedPercentPoints(game.win_prob_10_plus_delta);
        const tenLoss = formatSignedPercentPoints(game.loss_prob_10_plus_delta);
        const elevenWin = formatSignedPercentPoints(game.win_prob_11_plus_delta);
        const elevenLoss = formatSignedPercentPoints(game.loss_prob_11_plus_delta);
        return `
        <div class="expected-loss-row">
          <div>
            <strong>${escapeHtml(locationLabel(game.side))} ${escapeHtml(game.opponent || "-")}</strong>
            <small>${escapeHtml(pathClass)} · Week ${escapeHtml(game.week || "-")} · ${escapeHtml(game.date || "")}</small>
            <small>10+ path: win ${tenWin} · loss ${tenLoss}</small>
            <small>11+ path: win ${elevenWin} · loss ${elevenLoss}</small>
          </div>
          <div>
            <span>${formatPercent(game.win_probability, 1)} win</span>
            <small>${formatPercent(lossProbability, 1)} loss risk · ${formatNumber(game.expected_margin_team, 1)} pts</small>
          </div>
        </div>
      `;
      }).join("")}
    </div>
  `;
}

function pathRiskTitle(card = {}) {
  const losses = Array.isArray(card.expected_losses) ? card.expected_losses : [];
  const riskGames = Array.isArray(card.loss_risk_games) ? card.loss_risk_games : [];
  if (losses.length && riskGames.length) return "Expected Losses & Top Loss-Risk Games";
  if (losses.length) return "Current Expected Losses";
  if (riskGames.length) return "Top Loss-Risk Games";
  return "Schedule Risk";
}

function upsideStepLabel(step = {}, fallbackCount = 0) {
  const count = Number(step.flipped_expected_losses || fallbackCount);
  const pathType = step.path_type || "expected_loss_flip";
  if (pathType === "loss_risk_hold") {
    return `Protect ${count} loss-risk game${count === 1 ? "" : "s"}`;
  }
  return `Flip ${count} expected loss${count === 1 ? "" : "es"}`;
}

function upsideMetricLine(step = {}) {
  if (step.path_type === "loss_risk_hold") {
    return `11+ ${formatPercent(step.prob_11_plus, 1)} · 12-0 ${formatPercent(step.prob_12_plus, 1)}`;
  }
  return `10+ ${formatPercent(step.prob_10_plus, 1)} · 11+ ${formatPercent(step.prob_11_plus, 1)}`;
}

function renderCautiousReasons(card = {}) {
  const reasons = Array.isArray(card.why_distribution_is_cautious) ? card.why_distribution_is_cautious : [];
  if (!reasons.length) {
    return '<div class="empty-state compact">No major caution flags are attached to this path.</div>';
  }
  return `
    <ul class="record-reason-list">
      ${reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
    </ul>
  `;
}

function renderUpsidePath(card = {}) {
  const scenarios = Array.isArray(card.locked_path_scenarios) ? card.locked_path_scenarios : [];
  if (scenarios.length) {
    return `
      <div class="upside-path-list">
        ${scenarios.map((scenario) => {
          const locked = Array.isArray(scenario.locked_games) ? scenario.locked_games : [];
          const games = locked.map((game) => `${locationLabel(game.side)} ${game.opponent}`).join(", ");
          return `
            <div class="upside-path-row">
              <div>
                <strong>Lock ${escapeHtml(scenario.locked_game_count || locked.length)} key win${Number(scenario.locked_game_count || locked.length) === 1 ? "" : "s"}</strong>
                <small>${escapeHtml(games || "Key path games")}</small>
              </div>
              <div>
                <span>${escapeHtml(scenario.likely_record || "-")}</span>
                <small>10+ ${formatPercent(scenario.prob_10_plus, 1)} · 11+ ${formatPercent(scenario.prob_11_plus, 1)}</small>
              </div>
            </div>
          `;
        }).join("")}
      </div>
      <p class="interpretation compact">Locked scenarios hold all other game probabilities constant. They show how the record path changes if the highest-impact games are fixed as wins; they do not update team strength after the result.</p>
    `;
  }
  const path = Array.isArray(card.upside_flip_path) ? card.upside_flip_path : [];
  if (!path.length) {
    return '<div class="empty-state compact">No locked path scenario is available for this team.</div>';
  }
  return `
    <div class="upside-path-list">
      ${path.map((step) => {
        const flipped = Array.isArray(step.flipped_games) ? step.flipped_games : [];
        const games = flipped.map((game) => `${locationLabel(game.side)} ${game.opponent}`).join(", ");
        return `
          <div class="upside-path-row">
            <div>
              <strong>${escapeHtml(upsideStepLabel(step, flipped.length))}</strong>
              <small>${escapeHtml(games || "Expected-loss path")}</small>
            </div>
            <div>
              <span>${escapeHtml(step.likely_record || "-")}</span>
              <small>${escapeHtml(upsideMetricLine(step))}</small>
            </div>
          </div>
        `;
      }).join("")}
    </div>
    ${card.upside_path_read ? `<p class="interpretation compact">${escapeHtml(card.upside_path_read)}</p>` : ""}
  `;
}

function renderHingeGame(team) {
  const hinge = team?.hinge_game || {};
  if (!hinge.opponent) {
    return '<div class="empty-state compact">Hinge game unavailable for this team.</div>';
  }
  const location = hinge.side === "home" ? "vs" : hinge.side === "away" ? "at" : "vs";
  const pathRows = [
    ["10+ Wins", "baseline_prob_10_plus", "win_prob_10_plus", "loss_prob_10_plus"],
    ["11+ Wins", "baseline_prob_11_plus", "win_prob_11_plus", "loss_prob_11_plus"],
    ["Unbeaten", "baseline_prob_undefeated", "win_prob_undefeated", "loss_prob_undefeated"],
  ];
  const bars = pathRows.map(([label, baselineKey, winKey, lossKey]) => {
    const baseline = Number(hinge[baselineKey]);
    const win = Number(hinge[winKey]);
    const loss = Number(hinge[lossKey]);
    const boost = Number.isFinite(win) && Number.isFinite(baseline) ? win - baseline : null;
    const damage = Number.isFinite(loss) && Number.isFinite(baseline) ? loss - baseline : null;
    const bar = (value, className) => `
      <div class="hinge-path-bar ${className}">
        <span style="width:${Math.max(2, Math.min(100, (Number(value) || 0) * 100))}%"></span>
        <strong>${formatPercent(value, 1)}</strong>
      </div>
    `;
    return `
      <div class="hinge-path-row">
        <div>
          <strong>${escapeHtml(label)}</strong>
          <small>Win ${formatSignedPercentPoints(boost)} · Loss ${formatSignedPercentPoints(damage)}</small>
        </div>
        <div class="hinge-path-bars">
          <label>Base</label>${bar(baseline, "baseline")}
          <label>Win</label>${bar(win, "win")}
          <label>Loss</label>${bar(loss, "loss")}
        </div>
      </div>
    `;
  }).join("");
  return `
    <article class="hinge-card">
      <p class="eyebrow">Single-Game Locked Result</p>
      <h3>${escapeHtml(location)} ${escapeHtml(hinge.opponent)}</h3>
      <div class="hinge-grid">
        <div>
          <span>Locked As Win</span>
          <strong>${escapeHtml(hinge.win_likely_record || "-")}</strong>
          <small>Expected wins: ${formatNumber(hinge.win_expected_wins, 2)}</small>
        </div>
        <div>
          <span>Locked As Loss</span>
          <strong>${escapeHtml(hinge.loss_likely_record || "-")}</strong>
          <small>Expected wins: ${formatNumber(hinge.loss_expected_wins, 2)}</small>
        </div>
        <div>
          <span>Game Win Probability</span>
          <strong>${formatPercent(hinge.win_probability, 1)}</strong>
          <small>Week ${escapeHtml(hinge.week || "-")} · ${escapeHtml(hinge.date || "")}</small>
        </div>
      </div>
      <div class="hinge-path-swing">
        <h4>How This Game Moves The Path</h4>
        ${bars}
      </div>
      <p class="interpretation compact">This holds all other game probabilities constant. It is not a team-strength update after the result.</p>
    </article>
  `;
}

function renderFullSchedulePathImpact(team = {}) {
  const games = Array.isArray(team.hinge_games) ? [...team.hinge_games] : [];
  if (!games.length) {
    return '<div class="empty-state compact">Full schedule path impact is unavailable for this team.</div>';
  }
  games.sort((a, b) => Number(a.week || 99) - Number(b.week || 99) || String(a.date || "").localeCompare(String(b.date || "")));
  return `
    <div class="schedule-impact-list">
      ${games.map((game) => {
        const location = locationLabel(game.side);
        return `
          <div class="schedule-impact-row">
            <div>
              <strong>${escapeHtml(location)} ${escapeHtml(game.opponent || "-")}</strong>
              <small>Week ${escapeHtml(game.week || "-")} · ${escapeHtml(game.date || "")}</small>
            </div>
            <div>
              <span>${formatPercent(game.win_probability, 1)} win</span>
              <small>If win: ${escapeHtml(game.win_likely_record || "-")} · If loss: ${escapeHtml(game.loss_likely_record || "-")}</small>
            </div>
            <div>
              <small>10+ path</small>
              <strong>${formatSignedPercentPoints(game.win_prob_10_plus_delta)} / ${formatSignedPercentPoints(game.loss_prob_10_plus_delta)}</strong>
            </div>
            <div>
              <small>11+ path</small>
              <strong>${formatSignedPercentPoints(game.win_prob_11_plus_delta)} / ${formatSignedPercentPoints(game.loss_prob_11_plus_delta)}</strong>
            </div>
          </div>
        `;
      }).join("")}
    </div>
    <p class="interpretation compact">Path impact shows how winning or losing each game changes the team's 10+ and 11+ win chances compared with the current baseline.</p>
  `;
}

function ensureRecordPathModal() {
  let modal = document.querySelector("[data-record-path-modal]");
  if (modal) return modal;
  modal = document.createElement("section");
  modal.className = "record-path-modal is-hidden";
  modal.dataset.recordPathModal = "true";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Record path detail");
  modal.innerHTML = `
    <div class="record-path-modal-card">
      <button class="modal-close" type="button" data-close-record-path aria-label="Close record path detail">Close</button>
      <div data-record-path-modal-content></div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeRecordPathModal();
  });
  modal.querySelector("[data-close-record-path]")?.addEventListener("click", closeRecordPathModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("is-hidden")) closeRecordPathModal();
  });
  return modal;
}

function openRecordPathModal(title, html) {
  const modal = ensureRecordPathModal();
  const content = modal.querySelector("[data-record-path-modal-content]");
  if (!content) return;
  content.innerHTML = `
    <p class="eyebrow">Record Path Detail</p>
    <h2>${escapeHtml(title)}</h2>
    ${html}
  `;
  modal.classList.remove("is-hidden");
  document.body.classList.add("modal-open");
  modal.querySelector("[data-close-record-path]")?.focus();
}

function closeRecordPathModal() {
  const modal = document.querySelector("[data-record-path-modal]");
  if (!modal) return;
  modal.classList.add("is-hidden");
  document.body.classList.remove("modal-open");
}

function scrollRecordPathToTop() {
  const panel = document.querySelector(".record-path-panel") || $("recordPathDetail");
  panel?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderRecordPathBoard(options = {}) {
  if (!recordPathPayload) return;
  const summary = recordPathPayload.summary || {};
  const teams = recordPathPayload.teams || [];
  const active = teams.filter((row) => row.status === "active");
  const team = selectedRecordTeam();
  $("recordPathSummary").innerHTML = `
    <div><span>Active Teams</span><strong>${escapeHtml(summary.teams_active ?? active.length)}</strong></div>
    <div><span>Pac-12 Holdouts</span><strong>${escapeHtml(summary.teams_holdout_pac12_flex ?? recordPathPayload.holdouts?.length ?? "-")}</strong></div>
    <div><span>Method</span><strong>Exact Distribution</strong><small>No random simulation noise</small></div>
    <div><span>Display Status</span><strong>Preliminary</strong><small>Use with caution during buildout</small></div>
  `;
  if (!team) {
    $("recordPathDetail").innerHTML = '<div class="empty-state">No active record paths are available.</div>';
    return;
  }
  const card = recordPathCard(team);
  if (options.scroll) {
    window.requestAnimationFrame(scrollRecordPathToTop);
  }
  const gap = numberOrNull(card.expected_vs_recent_3yr_regular_wins_gap);
  const gapLabel = gap === null ? "" : `${gap > 0 ? "+" : ""}${formatNumber(gap, 2)} vs recent baseline`;
  $("recordPathDetail").innerHTML = `
    <div class="record-team-card">
      <div>
        <p class="eyebrow">${escapeHtml(team.conference || "2026")} Record Path</p>
        <h3>${escapeHtml(team.team)}</h3>
        <p>${escapeHtml(card.public_read || team.public_note || recordPathPayload.public_note || "")}</p>
      </div>
      <div class="summary-grid record-path-metrics">
        <div><span>Expected Wins</span><strong>${formatNumber(card.expected_wins, 2)}</strong><small>Average schedule outcome</small></div>
        <div><span>Most Likely Record</span><strong>${escapeHtml(card.most_likely_record || team.likely_record || "-")}</strong><small>${formatPercent(card.most_likely_record_probability, 1)}</small></div>
        <div><span>Median Record</span><strong>${escapeHtml(card.median_record || "-")}</strong><small>Middle of distribution</small></div>
        <div><span>10+ Wins</span><strong>${formatPercent(card.prob_10_plus_wins, 1)}</strong><small>Playoff-range path proxy</small></div>
        <div><span>11+ Wins</span><strong>${formatPercent(card.prob_11_plus_wins, 1)}</strong></div>
        <div><span>Recent Program Baseline</span><strong>${formatNumber(card.recent_3yr_regular_wins_avg, 1)}</strong><small>${escapeHtml(gapLabel || "Regular-season wins avg")}</small></div>
      </div>
      <div class="record-public-read">
        <section>
          <h4>${escapeHtml(pathRiskTitle(card))}</h4>
          ${renderPathRiskGames(card)}
        </section>
        <section>
          <h4>Upside Path</h4>
          ${renderUpsidePath(card)}
        </section>
        <section>
          <h4>Why The Distribution Is Cautious</h4>
          ${renderCautiousReasons(card)}
        </section>
      </div>
      <div class="record-path-columns">
        <section>
          <h4>Record Distribution</h4>
          ${recordDistributionBars(team.record_distribution)}
          <p class="interpretation compact">Being favored in most games does not mean the team is expected to win all of them. Moderate loss risk across several games accumulates over the full schedule.</p>
        </section>
        <section>
          ${renderHingeGame(team)}
        </section>
      </div>
      <section class="schedule-impact-card compact">
        <div>
          <h4>Full Schedule Path</h4>
          <p class="interpretation compact">Open the full game-by-game path view to see how each locked win or loss changes the 10+ and 11+ win thresholds.</p>
        </div>
        <button type="button" class="secondary-action" data-open-record-path="full-schedule">View Full Schedule Path</button>
      </section>
    </div>
  `;
  $("recordPathDetail").querySelector("[data-open-record-path='full-schedule']")?.addEventListener("click", () => {
    openRecordPathModal(`${team.team} Full Schedule Path`, renderFullSchedulePathImpact(team));
  });
  const leaders = active.slice(0, 12);
  $("recordPathLeaderboard").innerHTML = `
    <h3>Teams With Highest Average Wins</h3>
    <div class="leaderboard-list">
      ${leaders.map((row, index) => `
        <button type="button" data-record-team="${escapeHtml(row.team)}">
          <span>${index + 1}. ${escapeHtml(row.team)}</span>
          <strong>${formatNumber(row.expected_wins, 2)}</strong>
          <small>Avg Wins</small>
          <em>Likely Record: ${escapeHtml(row.likely_record || "-")}</em>
        </button>
      `).join("")}
    </div>
  `;
  document.querySelectorAll("[data-record-team]").forEach((button) => {
    button.addEventListener("click", () => {
      const select = $("recordTeamSelect");
      if (select) select.value = button.dataset.recordTeam || "";
      renderRecordPathBoard({ scroll: true });
    });
  });
}

function setupUnofficialResultsModal() {
  const modal = $("homeUnofficialModal");
  const openButton = $("homeUnofficialViewAll");
  const closeButton = $("homeUnofficialModalClose");
  const previousButton = $("homeUnofficialPrevious");
  const nextButton = $("homeUnofficialNext");

  if (!modal || !openButton) return;

  openButton.addEventListener("click", () => {
    unofficialResultsPage = 0;
    renderUnofficialResultsModal();
    modal.classList.remove("is-hidden");
    document.body.classList.add("modal-open");
  });

  closeButton?.addEventListener("click", () => {
    modal.classList.add("is-hidden");
    document.body.classList.remove("modal-open");
  });

  previousButton?.addEventListener("click", () => {
    if (unofficialResultsPage > 0) {
      unofficialResultsPage -= 1;
      renderUnofficialResultsModal();
    }
  });

  nextButton?.addEventListener("click", () => {
    const totalPages = Math.ceil(
      unofficialResultsData.length /
      UNOFFICIAL_RESULTS_PAGE_SIZE
    );

    if (unofficialResultsPage < totalPages - 1) {
      unofficialResultsPage += 1;
      renderUnofficialResultsModal();
    }
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.classList.add("is-hidden");
      document.body.classList.remove("modal-open");
    }
  });
}

async function boot() {
  const page = document.body.dataset.page;
  try {
    setupSiteChrome();
    if (page === "home") {setupUnofficialResultsModal();}
    if (page === "metrics") await loadMetricPage();
    if (page === "historical") await loadHistoricalPage();
    if (page === "bracket") await loadBracketPage();
    if (page === "legal") await loadLegalPage();
    if (page === "news") await loadNewsPage("newsList", 20, false);
    if (page === "home") await Promise.all([
      loadHomeWeeklySurface(),
      loadHomeProductStatus(),
      loadHomeUnofficialResults(),
      loadHomeScoreStrip(),
      loadNewsPage("homeNewsList", 3, true),
    ]);
    if (page === "team") await loadTeamPage();
    if (page === "recap") await loadStandaloneRecapPage();
    if (page === "rankings") await loadRankingsPage();
    if (page === "live-2026") await loadLive2026Page();
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
  }
}

boot();

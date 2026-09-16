(() => {
  const CONFIG = window.CFP_ADV_CONFIG || {};
  const isLocal = ["127.0.0.1", "localhost"].includes(window.location.hostname);
  const localOverride = isLocal ? new URLSearchParams(window.location.search).get("api") : "";
  const apiBase = (localOverride || CONFIG.API_BASE_URL || "https://api.cfpadvantage.com").replace(/\/$/, "");
  const closesAt = new Date("2026-12-12T04:59:59Z");
  const form = document.querySelector("[data-giveaway-form]");
  const status = document.querySelector("[data-giveaway-status]");

  if (!form || !status) return;

  const setStatus = (message, state = "") => {
    status.textContent = message;
    status.className = `giveaway-form-status${state ? ` is-${state}` : ""}`;
  };

  const entryFingerprint = async (email) => {
    if (!window.crypto?.subtle) return "";
    const bytes = new TextEncoder().encode(email.trim().toLowerCase());
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  };

  const errorMessages = {
    giveaway_not_open: "The giveaway entry period has not opened yet.",
    giveaway_closed: "The giveaway entry period has ended.",
    giveaway_rate_limited: "Too many entry attempts were sent from this connection. Please wait about 15 minutes and try again.",
    giveaway_entry_unavailable: "Giveaway entry is temporarily unavailable. Please try again shortly.",
    rules_acceptance_required: "Please confirm your eligibility and agreement to the Official Rules.",
    first_name_required: "Please enter your first name.",
    first_name_invalid: "Please enter a valid first name.",
    last_name_required: "Please enter your last name.",
    last_name_invalid: "Please enter a valid last name.",
    valid_email_required: "Please enter a valid email address.",
  };

  if (Date.now() > closesAt.getTime()) {
    form.querySelectorAll("input, button").forEach((element) => { element.disabled = true; });
    setStatus("The Road to 500 Giveaway entry period ended December 11, 2026.", "error");
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button[type='submit']");
    const firstName = form.elements.first_name.value.trim();
    const lastName = form.elements.last_name.value.trim();
    const email = form.elements.email.value.trim().toLowerCase();
    const rulesAccepted = form.elements.rules_accepted.checked;

    if (!firstName) {
      setStatus("Please enter your first name.", "error");
      form.elements.first_name.focus();
      return;
    }
    if (!lastName) {
      setStatus("Please enter your last name.", "error");
      form.elements.last_name.focus();
      return;
    }
    if (!email || !form.elements.email.checkValidity()) {
      setStatus("Please enter a valid email address.", "error");
      form.elements.email.focus();
      return;
    }
    if (!rulesAccepted) {
      setStatus("Please confirm your eligibility and agreement to the Official Rules.", "error");
      form.elements.rules_accepted.focus();
      return;
    }

    const fingerprint = await entryFingerprint(email);
    if (fingerprint && sessionStorage.getItem(`cfp-giveaway-entry:${fingerprint}`)) {
      setStatus("This email was already submitted during this browser session. Only the original entry counts.", "duplicate");
      return;
    }

    setStatus("Submitting your entry...");
    button.disabled = true;
    try {
      const response = await fetch(`${apiBase}/api/giveaway/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          rules_accepted: rulesAccepted,
          marketing_opt_in: form.elements.marketing_opt_in.checked,
          website: form.elements.website.value,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const pydanticError = Array.isArray(body.detail) ? body.detail[0]?.type : "";
        const code = body.detail?.error || body.error || pydanticError || "giveaway_entry_failed";
        throw new Error(code);
      }
      if (fingerprint) sessionStorage.setItem(`cfp-giveaway-entry:${fingerprint}`, "accepted");
      form.reset();
      setStatus("Your submission was accepted. If this email was previously entered, the original entry remains your one eligible entry.", "success");
    } catch (error) {
      setStatus(
        errorMessages[error.message] || "Your entry could not be submitted. Check your connection and try again.",
        "error",
      );
    } finally {
      button.disabled = false;
    }
  });
})();

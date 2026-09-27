import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StandardPage from "../components/StandardPage";
import { apiUrl } from "../lib/api";

const ERROR_MESSAGES = {
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

async function entryFingerprint(email) {
  if (!window.crypto?.subtle) return "";
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function GiveawayPage() {
  const [status, setStatus] = useState("");
  const [state, setState] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!window.location.hash) return;
    window.requestAnimationFrame(() => document.querySelector(window.location.hash)?.scrollIntoView({ behavior: "smooth" }));
  }, []);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const emailInput = form.elements.email;
    const payload = {
      first_name: String(data.get("first_name") || "").trim(),
      last_name: String(data.get("last_name") || "").trim(),
      email: String(data.get("email") || "").trim().toLowerCase(),
      rules_accepted: Boolean(data.get("rules_accepted")),
      marketing_opt_in: Boolean(data.get("marketing_opt_in")),
      website: String(data.get("website") || ""),
    };
    if (!payload.first_name || !payload.last_name || !payload.email || !emailInput.checkValidity() || !payload.rules_accepted) {
      setState("error");
      setStatus(!payload.first_name ? ERROR_MESSAGES.first_name_required : !payload.last_name ? ERROR_MESSAGES.last_name_required : (!payload.email || !emailInput.checkValidity()) ? ERROR_MESSAGES.valid_email_required : ERROR_MESSAGES.rules_acceptance_required);
      return;
    }
    const fingerprint = await entryFingerprint(payload.email);
    if (fingerprint && sessionStorage.getItem(`cfp-giveaway-entry:${fingerprint}`)) {
      setState("duplicate");
      setStatus("This email was already submitted during this browser session. Only the original entry counts.");
      return;
    }
    setSending(true); setState(""); setStatus("Submitting your entry...");
    try {
      const response = await fetch(apiUrl("/api/giveaway/entries"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const validationCode = Array.isArray(body.detail) ? body.detail[0]?.type : "";
        throw new Error(body.detail?.error || body.error || validationCode || "giveaway_entry_failed");
      }
      if (fingerprint) sessionStorage.setItem(`cfp-giveaway-entry:${fingerprint}`, "accepted");
      form.reset(); setState("success");
      setStatus("Your submission was accepted. If this email was previously entered, the original entry remains your one eligible entry.");
    } catch (error) {
      setState("error"); setStatus(ERROR_MESSAGES[error.message] || "Your entry could not be submitted. Check your connection and try again.");
    } finally { setSending(false); }
  }

  return <StandardPage className="giveaway-shell">
    <section className="giveaway-hero" aria-labelledby="giveawayPrizeTitle"><div><p className="eyebrow">September 16 – December 11, 2026</p><h2 id="giveawayPrizeTitle">$100 Gift Card</h2><p className="giveaway-winner-count">One winner. One free entry per person.</p><a className="primary-action" href="#entry-form">Enter Giveaway</a><a className="secondary-action" href="#official-rules">Official Rules</a></div><div className="giveaway-goal" aria-label="Road to 500 community goal"><span>Community Goal</span><strong>500</strong><small>Facebook followers</small></div></section>
    <aside className="giveaway-disclosure"><strong>No purchase, payment, or contribution necessary.</strong><span>Support does not increase your odds of winning.</span><span>Following CFP Advantage is not required to enter.</span></aside>
    <section className="giveaway-grid">
      <article className="giveaway-card giveaway-entry-card" id="entry-form"><p className="eyebrow">Free Entry</p><h2>Enter the Giveaway</h2><p>Submit this form once during the Giveaway Period. Facebook activity and financial support are not entry methods.</p><form className="giveaway-form" onSubmit={submit} noValidate><div className="giveaway-name-grid"><label><span>First Name</span><input name="first_name" autoComplete="given-name" maxLength="80" required /></label><label><span>Last Name</span><input name="last_name" autoComplete="family-name" maxLength="80" required /></label></div><label><span>Email Address</span><input name="email" type="email" autoComplete="email" maxLength="254" required /></label><label className="giveaway-honeypot" aria-hidden="true"><span>Website</span><input name="website" tabIndex="-1" autoComplete="off" /></label><label className="giveaway-check"><input name="rules_accepted" type="checkbox" required /><span>I confirm that I am at least 18 years old, meet the eligibility requirements, and agree to the <a href="#official-rules">Official Rules</a>.</span></label><label className="giveaway-check"><input name="marketing_opt_in" type="checkbox" /><span>I would like to receive CFP Advantage updates by email. <em>Optional</em></span></label><p className="giveaway-form-note">Entry information is used only to administer the giveaway unless you separately choose the optional email update box.</p><p className={`giveaway-form-status${state ? ` is-${state}` : ""}`} aria-live="polite">{status}</p><button className="primary-action giveaway-submit" disabled={sending} type="submit">{sending ? "Submitting..." : "Enter Giveaway"}</button></form></article>
      <article className="giveaway-card"><p className="eyebrow">Grow</p><h2>The Road to 500</h2><p>Our goal is to grow the CFP Advantage community to 500 Facebook followers. The follower goal and the giveaway are separate.</p><p>You do not need to follow CFP Advantage to enter, and reaching 500 followers is not required for the prize to be awarded.</p><p>Commenting <strong>500</strong> on designated Facebook posts may return the latest campaign status. It does not enter you in the giveaway.</p></article>
    </section>
    <section className="giveaway-card giveaway-prize-section"><p className="eyebrow">Community Prize</p><h2>A $100 Prize With Community Milestones</h2><p>Community support can increase the prize available to every eligible entrant. Supporting CFP Advantage does not provide additional entries or improve your odds of winning.</p><div className="giveaway-tiers"><div><span>$0+ support</span><strong>$100</strong></div><div><span>$100+ support</span><strong>$125</strong></div><div><span>$250+ support</span><strong>$175</strong></div><div><span>$500+ support</span><strong>$250</strong></div><div><span>$1,000+ support</span><strong>$500</strong></div></div></section>
    <section className="giveaway-grid"><article className="giveaway-card"><p className="eyebrow">Optional Support</p><h2>Support CFP Advantage</h2><p>Community support helps fund data access, research, development tracking, and continued development.</p><Link className="primary-action" to="/support">Support CFP Advantage</Link><p className="giveaway-inline-disclosure">Support is optional and is not required to enter or win.</p></article><article className="giveaway-card"><p className="eyebrow">Founders Recognition</p><h2>Recognizing Early Support</h2><p>Supporters may choose to have their name recognized on a planned CFP Advantage Founders Page.</p><p>Recognition is separate from the giveaway and does not provide additional entries or increase the odds of winning.</p></article></section>
    <section className="giveaway-card official-rules" id="official-rules"><p className="eyebrow">Road to 500 Giveaway</p><h2>Official Rules</h2><p className="rules-emphasis">NO PURCHASE, PAYMENT, OR CONTRIBUTION NECESSARY TO ENTER OR WIN. A PURCHASE, PAYMENT, OR CONTRIBUTION WILL NOT INCREASE YOUR CHANCES OF WINNING.</p>
      <h3>1. Sponsor</h3><p>The CFP Advantage Road to 500 Giveaway (the “Giveaway”) is sponsored by CFP Advantage (“Sponsor”). This Giveaway is not sponsored, endorsed, administered by, or associated with Facebook, Meta, or any gift-card issuer.</p>
      <h3>2. Giveaway Period</h3><p>The Giveaway begins September 16, 2026 and ends at 11:59 p.m. Eastern Time on December 11, 2026. All entries must be received during that period.</p>
      <h3>3. Eligibility</h3><p>Open to legal residents of the 50 United States and District of Columbia who are 18 or older at entry. Employees, contractors, people directly involved in administration, and members of their immediate households are ineligible. Void where prohibited or restricted by law.</p>
      <h3>4. How to Enter</h3><p>During the Giveaway Period, visit <Link to="/giveaway">cfpadvantage.com/giveaway</Link> and submit the official entry form. Follows, likes, comments, shares, donations, purchases, and other social-media activity are not entries. Limit one entry per person.</p>
      <h3>5. Road to 500 Community Campaign</h3><p>The 500-follower goal is separate from entry. Reaching it is not required to award the prize. Commenting “500” on designated posts may return campaign status but is not an entry.</p>
      <h3>6. Prize</h3><p>One eligible entrant will receive a gift card worth at least $100. Sponsor may increase it according to qualifying support: $0–$99.99, $100 prize; $100–$249.99, $125; $250–$499.99, $175; $500–$999.99, $250; $1,000 or more, $500.</p><p>The final amount uses successfully processed support before the period ends and excludes refunded, reversed, disputed, or fraudulent transactions. The prize is non-transferable. Sponsor may substitute equal or greater value if needed. The winner is responsible for taxes.</p>
      <h3>7. Community Support</h3><p>Support is voluntary and is not an entry method. It provides no additional entry, preference, or improved odds. It may increase the prize available to all eligible entrants under the stated milestones.</p>
      <h3>8. Founders Recognition</h3><p>Supporters may opt into planned public recognition. Recognition is separate from the Giveaway and provides no advantage. Sponsor may decline fraudulent, misleading, offensive, impersonating, or inappropriate display names.</p>
      <h3>9. Winner Selection</h3><p>After the period ends, one potential winner will be selected at random from all eligible unique entries. Odds depend on the number of eligible entries.</p>
      <h3>10. Winner Notification</h3><p>The potential winner will be emailed and must respond within seven calendar days. If unreachable, ineligible, late, or declining, Sponsor may randomly select an alternate. CFP Advantage will never require payment to receive the prize.</p>
      <h3>11. Verification</h3><p>Sponsor may verify eligibility and compliance. Automated, fraudulent, duplicate, incomplete, manipulated, or otherwise invalid entries may be disqualified.</p>
      <h3>12. Privacy</h3><p>Submitted information is used to administer the Giveaway, contact the potential winner, prevent duplicate or fraudulent entries, and fulfill promotion obligations. Entry does not enroll entrants in marketing email without separate affirmative consent. See the <Link to="/legal#privacy">Privacy Policy</Link>.</p>
      <h3>13. General Conditions</h3><p>Sponsor may suspend, modify, extend, or cancel the Giveaway if fraud, technical failures, legal requirements, platform failures, events beyond reasonable control, or other circumstances materially affect integrity or administration. If ended early, a winner may be selected from prior eligible entries where lawful and appropriate. Administration decisions are final subject to applicable law.</p>
      <h3>14. Social Media Disclaimer</h3><p>This Giveaway is not sponsored, endorsed, administered by, or associated with Facebook or Meta. Entrants provide information to CFP Advantage and release Facebook and Meta from related claims.</p>
      <h3>15. Questions</h3><p>Questions should be sent to <a href="mailto:support@cfpadvantage.com">support@cfpadvantage.com</a>.</p>
    </section>
  </StandardPage>;
}

export default GiveawayPage;

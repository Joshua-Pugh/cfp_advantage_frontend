import { FaFacebookF } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { Link } from "react-router-dom";


const SUPPORT_EMAIL = "support@cfpadvantage.com";
const DONATE_URL = "https://buy.stripe.com/4gM28r9skgpj5KQ7BL8N200";

function Footer() {
  const supportHref =
    DONATE_URL ||
    `mailto:${SUPPORT_EMAIL}?subject=Support%20CFP%20Advantage`;

  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <img
          className="footer-logo"
          src="/assets/adv-logo.png"
          alt="CFP Advantage"
        />

        <div className="footer-brand-copy">
          <strong>CFP Advantage</strong>
          <p>Advantage Through Contextual Football Profiles.</p>
          <small>
            Independent football intelligence platform. Not affiliated with
            the CFP, NCAA, conferences, or universities.
          </small>
          <div className="footer-socials">
            <a
              href="https://x.com/cfpadvantage"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="CFP Advantage on X"
              title="CFP Advantage on X"
            >
              <FaXTwitter />
            </a>

            <a
              href="https://www.facebook.com/search/top?q=cfp%20advantage"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="CFP Advantage on Facebook"
              title="CFP Advantage on Facebook"
            >
              <FaFacebookF />
            </a>
          </div>
        </div>
      </div>

      <div className="footer-column">
        <span className="footer-heading">Explore</span>

        <nav className="footer-links">
          <Link to="/about">About</Link>
          <Link to="/live-2026">2026 Live</Link>
          <Link to="/metrics">Metrics Guide</Link>
          <Link to="/metric-relationships">Metric Relationships</Link>
          <Link to="/model-record">Model Record</Link>
          <Link to="/news">News</Link>
          <Link to="/updates">
            Updates <span className="site-version">v2.4</span>
          </Link>
        </nav>
      </div>

      <div className="footer-column">
        <span className="footer-heading">Support & Legal</span>

        <nav className="footer-links">
          <Link to="/contact">Contact</Link>
          <Link to="/giveaway">Road to 500</Link>

          <a
            className="support-link"
            href={supportHref}
            target={DONATE_URL ? "_blank" : undefined}
            rel={DONATE_URL ? "noopener noreferrer" : undefined}
          >
            Support
          </a>

          <Link to="/legal#terms">Terms</Link>
          <Link to="/legal#privacy">Privacy</Link>
          <Link to="/legal#disclaimer">Disclaimer</Link>
          <Link to="/legal#refunds">Refund Policy</Link>
        </nav>
      </div>

      <div className="footer-bottom">
        <p className="footer-legal-notice">
          By using CFP Advantage, you acknowledge the{" "}
          <Link to="/legal#terms">Terms</Link>,{" "}
          <Link to="/legal#privacy">Privacy Policy</Link>, and{" "}
          <Link to="/legal#disclaimer">Disclaimer</Link>.
        </p>

        <p className="footer-copyright">
          Copyright 2026 CFP Advantage. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;

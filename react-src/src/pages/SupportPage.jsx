import StandardPage from "../components/StandardPage";

const SUPPORT_URL = "https://buy.stripe.com/4gM28r9skgpj5KQ7BL8N200";
function SupportPage() {
  return (
    <StandardPage>
      <section className="insight-panel support-page-copy">
        <p className="eyebrow">Support CFP Advantage</p>
        <h2>Help Build Independent Football Intelligence</h2>
        <p>Support helps cover data, hosting, and the work required to keep public team profiles, matchup context, and weekly receipts available.</p>
        <p>Support is optional and does not change giveaway odds, model outputs, or access to the free 2026 public season.</p>
        <a className="primary-action" href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">Open Secure Stripe Support</a>
      </section>
    </StandardPage>
  );
}
export default SupportPage;

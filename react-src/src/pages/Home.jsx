import { useEffect, useState } from "react";
import { api } from "../lib/api";
import Header from "../components/Header";
import SeasonValidationCard from "../components/SeasonValidationCard";
import Footer from "../components/Footer";
import GamesOfWeek from "../components/GamesOfWeek";
import UnofficialResults from "../components/UnofficialResults";
import ScoreStrip from "../components/ScoreStrip";
import ProductAreas from "../components/ProductAreas";
import NewsPreview from "../components/NewsPreview";

function Home() {
  const [validation, setValidation] = useState(null);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    async function loadValidation() {
      try {
        const payload = await api(
          "/api/product-a/live-tracker?season=2026"
        );

        setValidation(payload.summary || {});
      } catch (error) {
        console.error(
          "CFP Advantage home validation snapshot failed:",
          error
        );

        setValidationError(
          "The certified season snapshot is temporarily unavailable."
        );
      }
    }

    loadValidation();
  }, []);

  return (
    <main className="app-shell home-shell">
      <Header />
      <section className="home-hero">
        <div>
          <p className="eyebrow">Current Season</p>

          <h2>2026 Is Live</h2>

          <p>
            CFP Advantage is tracking every published pick from its pregame
            receipt through the final score. The 2026 season is an active
            development run, with clean prospective validation restarting in 2027.
          </p>

          <div className="hero-actions">
            <a className="primary-action" href="/model-record">
              View Public Model Record
            </a>

            <a className="secondary-action" href="/teams">
              Explore Teams
            </a>
          </div>
        </div>
        <SeasonValidationCard
          validation={validation}
          validationError={validationError}
        />
        <UnofficialResults />
      </section>
      <GamesOfWeek />
      <ScoreStrip />
      <ProductAreas />
      <NewsPreview />
      <Footer />
    </main>
  );
}

export default Home;

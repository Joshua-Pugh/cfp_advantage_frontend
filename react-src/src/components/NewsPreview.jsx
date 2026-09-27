import { useEffect, useState } from "react";

import { api } from "../lib/api";
import LoadingDots from "./LoadingDots";

function NewsPreview() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadNews() {
      try {
        setLoading(true);
        setError("");

        const payload = await api(
          "/api/news/latest?limit=4"
        );

        setItems(
          Array.isArray(payload.items)
            ? payload.items.slice(0, 4)
            : []
        );
      } catch (loadError) {
        console.error(
          "CFP Advantage news preview failed:",
          loadError
        );

        setError(
          "College football headlines are temporarily unavailable."
        );
      } finally {
        setLoading(false);
      }
    }

    loadNews();
  }, []);

  return (
    <section className="home-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Latest News</p>
          <h2>College Football Wire</h2>
        </div>

        <a
          className="text-link"
          href="/news"
        >
          View News Page
        </a>
      </div>

      <div
        className="news-preview"
        aria-live="polite"
      >
        {loading ? (
          <article className="news-item">
            <LoadingDots text="Loading college football headlines" />
          </article>
        ) : error ? (
          <article className="news-item">
            <span>News Feed</span>
            <h3>Headlines are reconnecting</h3>
            <p>{error}</p>
          </article>
        ) : items.length ? (
          items.map((item, index) => (
            <article
              className="news-item"
              key={`${item.link || item.title}-${index}`}
            >
              <span>
                {item.source || "College Football"}
              </span>

              <h3>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.title}
                </a>
              </h3>

              <p>
                {item.published || "Recent"}
              </p>
            </article>
          ))
        ) : (
          <article className="news-item">
            <span>News Feed</span>
            <h3>No headlines available</h3>
            <p>
              The backend news cache did not return
              current headlines.
            </p>
          </article>
        )}
      </div>
    </section>
  );
}

export default NewsPreview;

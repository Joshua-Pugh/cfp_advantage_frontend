import { useEffect } from "react";

const SITE_URL = "https://cfpadvantage.com";

function ensureMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  return element;
}

function ensureCanonical() {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  return element;
}

function PageMetadata({ title, description, path, structuredData }) {
  useEffect(() => {
    const canonicalUrl = new URL(path || window.location.pathname, SITE_URL).href;
    document.title = title;
    ensureMeta('meta[name="description"]', { name: "description", content: description });
    ensureMeta('meta[property="og:title"]', { property: "og:title", content: title });
    ensureMeta('meta[property="og:description"]', { property: "og:description", content: description });
    ensureMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    ensureMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    ensureMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary" });
    ensureCanonical().href = canonicalUrl;

    document.getElementById("cfp-advantage-static-structured-data")?.remove();

    const id = "cfp-advantage-page-structured-data";
    let script = document.getElementById(id);
    if (structuredData) {
      if (!script) {
        script = document.createElement("script");
        script.id = id;
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    } else if (script) {
      script.remove();
    }

    return () => {
      const current = document.getElementById(id);
      if (current) current.remove();
    };
  }, [description, path, structuredData, title]);

  return null;
}

export default PageMetadata;

const productAreas = [
{
    eyebrow: "Model Guide",
    title: "Understand The Metrics",
    description:
      "Plain-English definitions for ADV Strength Rating (ADV SRS), Control Rate (CR), Scoreboard Control Gap, schedule context, Control Finish Rate, and traditional football stats.",
    linkText: "Open Metrics Guide",
    href: "/metrics",
  },
  {
    eyebrow: "Team Intelligence",
    title: "Explore Contextual Football Profiles",
    description:
      "See how teams create control, finish opportunities, deny opponents, and translate those mechanics into season-long production.",
    linkText: "Explore Team Profiles",
    href: "/teams",
  },
  {
    eyebrow: "Bracket Room",
    title: "Title Path Intelligence",
    description:
      "Explore title probability, projected path difficulty, close-matchup risk, and contender context as CFP Advantage moves toward 2026.",
    linkText: "Open Bracket Room",
    href: "/bracket-room",
  },
];

function ProductAreas() {
  return (
    <section
      className="home-grid"
      aria-label="Product areas"
    >
      {productAreas.map((area) => (
        <article
          className="home-card"
          key={area.title}
        >
          <p className="eyebrow">
            {area.eyebrow}
          </p>

          <h3>{area.title}</h3>

          <p>{area.description}</p>

          <a
            className="home-card-link"
            href={area.href}
          >
            {area.linkText}
          </a>
        </article>
      ))}
    </section>
  );
}

export default ProductAreas;

import StandardPage from "../components/StandardPage";

const lenses = [
  ["Team Strength", "How strong a team has played across the season."],
  ["Offense & Defense", "How each side of the ball contributes to the full profile."],
  ["Schedule Context", "How opponent quality shapes the read."],
  ["Control Consistency", "How reliably a team creates meaningful game control."],
  ["Drive Conversion", "How often control becomes points."],
  ["Matchup Intelligence", "How two profiles compare in a specific game."],
];

function AboutPage() {
  return (
    <StandardPage>
      <section className="insight-panel">
        <p className="eyebrow">Advantage Through Contextual Football Profiles</p>
        <h2>Football Should Be Evaluated In Context</h2>
        <p>Traditional statistics tell us what happened. CFP Advantage uses play-by-play and drive-level data to help explain how a game was played.</p>
        <p>The platform focuses on team strength, game control, matchup dynamics, schedule context, and season performance beyond the final scoreboard.</p>
      </section>
      <section className="insight-panel">
        <p className="eyebrow">The Starting Question</p>
        <h2>Let The Data Explain The Game</h2>
        <p>What if team strength could be measured from how football is actually played, rather than from polls, reputation, or final scores alone?</p>
        <p>That question led to the ADV framework: a drive-level and play-by-play approach built around context, control, and execution.</p>
      </section>
      <section className="insight-panel">
        <p className="eyebrow">Multiple Lenses</p>
        <h2>One Football Profile</h2>
        <div className="guide-grid">{lenses.map(([title, text]) => <article className="guide-card compact" key={title}><h4>{title}</h4><p>{text}</p></article>)}</div>
      </section>
      <section className="insight-panel">
        <p className="eyebrow">Mission</p>
        <h2>Better Questions, Better Football Conversations</h2>
        <p>CFP Advantage is not a poll and does not promise certainty. It supplies evidence for exploring teams, recaps, matchups, and playoff paths.</p>
        <p className="interpretation">Question assumptions. Follow the evidence. Let the data explain the game.</p>
      </section>
    </StandardPage>
  );
}
export default AboutPage;

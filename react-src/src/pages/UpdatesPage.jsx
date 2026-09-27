import StandardPage from "../components/StandardPage";

const releases = [
  {date:"September 22, 2026",title:"Matchup Context Repair",items:["Recent Form and Talent Yield now use the same certified common-cutoff context as team profiles.","All Week 4 ratings, winners, margins, and published receipts remained unchanged.","The Learning Hub and ADV Gridiron Report were retired until stronger supporting research is ready."]},
  {date:"September 19, 2026",title:"2026 Development Model",items:["The original frozen validation stopped after an early-season opponent-adjustment defect was found.","Weeks 1–3 receipts and grades remain preserved exactly as published.","Week 4 forward uses the corrected prior-regularized SRS system and retained universal margin translation; clean prospective validation restarts in 2027."]},
  {date:"September 3, 2026",title:"CFP Advantage 1.1",items:["Expanded team profiles, recaps, live scores, and schedule context.","Added shareable Framework Cards and clearer metric guidance.","Established 2016 as the first public season with complete Control Framework coverage."]},
];
function UpdatesPage(){return <StandardPage><section className="insight-panel updates-page"><p className="eyebrow">Release Notes</p><h2>Product Updates</h2><div className="release-list">{releases.map((release)=><article className="context-callout release-note" key={release.date}><p className="eyebrow">{release.date}</p><h3>{release.title}</h3><ul>{release.items.map((item)=><li key={item}>{item}</li>)}</ul></article>)}</div></section></StandardPage>}
export default UpdatesPage;

const ADVANTAGE_TRANSLATIONS = {
  "Stronger Control Creation": "creates meaningful drives more consistently",
  "Stronger Control Denial": "does a better job preventing opponents from controlling drives",
  "More efficient Control Finish": "turns controlled drives into points more efficiently",
  "Higher Control Drive Shutout Rate": "keeps more opponent-controlled drives off the scoreboard",
  "Higher overall ADV strength": "has the stronger opponent-adjusted team profile",
  "Stronger schedule context": "has built its profile against stronger opposition",
  "More consistent Control Rate": "controls possessions more consistently",
  "Creates more Control Pressure": "creates sustainable scoring pressure more often",
  "Limits Control Pressure better": "limits sustainable scoring pressure more effectively",
};

const CONVICTION_RISKS = {
  "Baseline Only": "This read has limited framework support, so the projected edge carries added uncertainty.",
  "Context Pushback": "Some matchup context pushes against the initial team-strength lean.",
  "Fragile Edge": "The edge is modest and has historically been easier to overturn.",
  "Strong Separation": "The teams show meaningful separation, but game-day variance can still narrow the result.",
  "Supported Edge": "The main framework signals support the pick, though they do not remove game-day uncertainty.",
};

function teamKey(matchup, side) {
  const shortName = matchup?.[`${side}_team`];
  const fullName = matchup?.[`${side}_full_name`];
  const keys = Object.keys(matchup?.key_advantages || {});
  return keys.find((key) => key === shortName || key === fullName)
    || keys.find((key) => String(fullName || "").toLowerCase().includes(String(key).toLowerCase()))
    || shortName;
}

function projectedSide(matchup) {
  const winner = String(matchup?.projected_winner_full_name || matchup?.projected_winner || "").toLowerCase();
  if ([matchup?.away_team, matchup?.away_full_name].some((value) => winner.includes(String(value || "").toLowerCase()))) return "away";
  if ([matchup?.home_team, matchup?.home_full_name].some((value) => winner.includes(String(value || "").toLowerCase()))) return "home";
  return null;
}

function translateAdvantage(value) {
  return ADVANTAGE_TRANSLATIONS[value] || String(value || "").replace(/^Higher /, "has a higher ").replace(/^Stronger /, "has stronger ").replace(/^More /, "has more ").toLowerCase();
}

function joinReasons(reasons) {
  if (reasons.length < 2) return reasons[0] || "receives the official pregame lean after opponent and venue adjustment";
  return `${reasons[0]} and ${reasons[1]}`;
}

export function matchupNarrative(matchup) {
  const side = projectedSide(matchup);
  const winner = matchup?.projected_winner_full_name || matchup?.projected_winner || "The projected winner";
  if (!side) {
    return {
      why: "A complete plain-language matchup read is not available for this game.",
      risk: matchup?.projection_limited ? "One side is outside full FBS framework coverage." : "Pregame evidence remains limited.",
      conviction: matchup?.matchup_conviction?.label || "Limited read",
    };
  }

  const opponentSide = side === "away" ? "home" : "away";
  const winnerKey = teamKey(matchup, side);
  const opponentKey = teamKey(matchup, opponentSide);
  const winnerAdvantages = matchup?.key_advantages?.[winnerKey] || [];
  const opponentAdvantages = matchup?.key_advantages?.[opponentKey] || [];
  const reasons = winnerAdvantages.slice(0, 2).map(translateAdvantage);
  const opponent = matchup?.[`${opponentSide}_full_name`] || matchup?.[`${opponentSide}_team`] || "The opponent";
  const conviction = matchup?.matchup_conviction?.label || "Pregame edge";

  const why = `ADV gives ${winner} the edge because the team ${joinReasons(reasons)}.`;
  const risk = opponentAdvantages.length
    ? `The countercase for ${opponent} is that the team ${translateAdvantage(opponentAdvantages[0])}.`
    : CONVICTION_RISKS[conviction] || matchup?.matchup_conviction?.note || "The projection still carries normal game-day uncertainty.";

  return { why, risk, conviction };
}

export function plainAdvantage(value) {
  return translateAdvantage(value);
}

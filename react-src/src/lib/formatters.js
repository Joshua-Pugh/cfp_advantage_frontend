export function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  const pct = Math.abs(number) <= 1 ? number * 100 : number;

  return `${pct.toFixed(digits)}%`;
}

export function formatProjectionMargin(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  if (number !== 0 && Math.abs(number) < 0.5) {
    return "0.5";
  }

  const rounded =
    Math.sign(number) *
    (Math.round((Math.abs(number) + Number.EPSILON) * 2) / 2);

  return rounded.toFixed(1);
}

export function matchupDateLabel(matchup) {
  const kickoff =
    !matchup.kickoff_time_tbd && matchup.kickoff_at
      ? new Date(matchup.kickoff_at)
      : null;

  if (kickoff && Number.isFinite(kickoff.getTime())) {
    return kickoff.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "America/New_York",
    });
  }

  const date = matchup.date
    ? new Date(`${matchup.date}T12:00:00`)
    : null;

  return date && Number.isFinite(date.getTime())
    ? date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : `Week ${matchup.week || 1}`;
}

export function shortConferenceTag(conference) {
  const raw = String(conference || "").trim();

  if (!raw) {
    return "";
  }

  const normalized = raw
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tagMap = {
    "american athletic conference": "AAC",
    "american athletic": "AAC",
    "big ten conference": "B1G",
    "big ten": "B1G",
    "big 12 conference": "XII",
    "big 12": "XII",
    "fbs independents": "Ind.",
    "fbs independent": "Ind.",
    independents: "Ind.",
    independent: "Ind.",
  };

  if (tagMap[normalized]) {
    return tagMap[normalized];
  }

  const shorthand = raw
    .replace(/\bconference\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (shorthand.length <= 8) {
    return shorthand;
  }

  return shorthand
    .split(" ")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1).toLowerCase()
    )
    .join(" ");
}

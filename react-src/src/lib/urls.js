export function slugifyTeam(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function teamProfilePath(season, team) {
  return `/teams/${encodeURIComponent(String(season))}/${slugifyTeam(team)}`;
}

export function matchupPath(gameId) {
  return `/matchups/${encodeURIComponent(String(gameId))}`;
}

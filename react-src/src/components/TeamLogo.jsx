function teamInitials(team) {
  return String(team || "-")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function TeamLogo({ team, logos = {}, label = team }) {
  const key = String(team || "").trim().toLowerCase();
  const url = logos[key];
  const displayName = String(label || team || "Team").trim();

  return (
    <span
      className={`team-logo ${url ? "has-logo" : "is-fallback"}`}
      title={displayName}
      aria-label={displayName}
    >
      <span className="team-logo-fallback" aria-hidden="true">
        {teamInitials(team)}
      </span>

      {url && (
        <img
          src={url}
          alt=""
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
            event.currentTarget.parentElement?.classList.remove("has-logo");
            event.currentTarget.parentElement?.classList.add("is-fallback");
          }}
        />
      )}
    </span>
  );
}

export default TeamLogo;

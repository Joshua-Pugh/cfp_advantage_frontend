import { useEffect, useState } from "react";

import Header from "../components/Header";
import Footer from "../components/Footer";
import LoadingDots from "../components/LoadingDots";
import TeamLogo from "../components/TeamLogo";
import TeamContextTags from "../components/TeamContextTags";
import TeamSchedule from "../components/TeamSchedule";
import TeamStats from "../components/TeamStats";
import TeamPlayerStats from "../components/TeamPlayerStats";
import TeamCfpProfile from "../components/TeamCfpProfile";

import { api } from "../lib/api";

function Team() {
  const [seasons, setSeasons] = useState([]);
  const [season, setSeason] = useState("");

  const [teams, setTeams] = useState([]);
  const [team, setTeam] = useState("");
  const [teamIdentities, setTeamIdentities] = useState({});

  const [logos, setLogos] = useState({});

  const [profile, setProfile] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [frameworkReference, setFrameworkReference] = useState({});

  const [activeTab, setActiveTab] = useState("schedule");

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPage() {
      try {
        setLoadingPage(true);
        setError("");

        const [
          seasonPayload,
          logoPayload,
          identityPayload,
        ] = await Promise.all([
          api("/api/seasons"),

          fetch("/team-logos.json")
            .then((response) =>
              response.ok
                ? response.json()
                : { teams: {} }
            )
            .catch(() => ({ teams: {} })),

          api("/api/team-identities").catch(() => ({
            teams: [],
          })),
        ]);

        const availableSeasons =
          seasonPayload.seasons || [];

        setSeasons(availableSeasons);

        if (availableSeasons.length) {
          setSeason(String(availableSeasons[availableSeasons.length - 1]));
        }

        setLogos(logoPayload.teams || {});

        const identityMap = Object.fromEntries(
          (identityPayload.teams || [])
            .map((identity) => [identity.team || identity.school || identity.name, identity])
            .filter(([name]) => name)
        );

        setTeamIdentities(identityMap);
      } catch (loadError) {
        console.error(
          "CFP Advantage team page setup failed:",
          loadError
        );

        setError(
          "The Team Intelligence page could not be loaded."
        );
      } finally {
        setLoadingPage(false);
      }
    }

    loadPage();
  }, []);

  useEffect(() => {
    if (!season) return;

    async function loadTeams() {
      try {
        setLoadingTeams(true);
        setError("");

        setTeam("");
        setTeams([]);
        setProfile(null);
        setSchedule([]);

        const payload = await api(
          `/api/teams?season=${encodeURIComponent(
            season
          )}&tier=fbs`
        );

        const rows = (
          payload.team_options ||
          payload.teams ||
          []
        )
          .map((row) =>
            typeof row === "string"
              ? { team: row }
              : {
                  ...row,
                  team: row.team || row.name,
                }
          )
          .filter((row) => row.team)
          .sort((a, b) =>
            String(a.team).localeCompare(
              String(b.team)
            )
          );

        setTeams(rows);

        if (rows.length) {
          setTeam(rows[0].team);
        }
      } catch (loadError) {
        console.error(
          "CFP Advantage team list failed:",
          loadError
        );

        setError(
          "Teams are temporarily unavailable for this season."
        );
      } finally {
        setLoadingTeams(false);
      }
    }

    loadTeams();
  }, [season]);

  async function loadTeamProfile() {
    if (!season || !team) return;

    try {
      setLoadingProfile(true);
      setError("");

      const [
        profilePayload,
        schedulePayload,
        frameworkPayload,
      ] = await Promise.all([
        api(
          `/api/team/${encodeURIComponent(
            season
          )}/${encodeURIComponent(team)}`
        ),

        api(
          `/api/team/${encodeURIComponent(
            season
          )}/${encodeURIComponent(
            team
          )}/schedule?view=full`
        ),

        api(
          "/api/product-a/framework-reference"
        ).catch(() => ({})),
      ]);

      setProfile(profilePayload);

      setSchedule(
        Array.isArray(schedulePayload.schedule)
          ? schedulePayload.schedule
          : []
      );

      setFrameworkReference(
        frameworkPayload || {}
      );

      setActiveTab("schedule");
    } catch (loadError) {
      console.error(
        "CFP Advantage team profile failed:",
        loadError
      );

      setError(
        `The ${
          teamIdentities[team]?.full_name || team
        } team profile could not be loaded.`
      );
    } finally {
      setLoadingProfile(false);
    }
  }

  const intel =
    profile?.intelligence || {};

  const stats =
    profile?.comparison_stats || {};

  const record =
    profile?.record || {};

  const driveConversion =
    profile?.drive_conversion ||
    profile?.drive_conversion_context ||
    {};

  const selectedTeamName =
    profile?.full_name ||
    teamIdentities[team]?.full_name ||
    team;

  return (
    <main className="app-shell">
      <Header />

      <section className="workspace-view static-page team-page">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              Team Intelligence
            </p>

            <h2>Season Profile</h2>

            <p className="panel-note">
              Explore team performance,
              schedule results, traditional
              statistics, and the CFP Advantage
              Control Framework.
            </p>
          </div>
        </div>

        {loadingPage ? (
          <div className="team-page-loading">
            <LoadingDots text="Loading Team Intelligence" />
          </div>
        ) : (
          <>
            <div className="matchup-controls page-controls">
              <label>
                <span>Season</span>

                <select
                  value={season}
                  onChange={(event) =>
                    setSeason(
                      event.target.value
                    )
                  }
                >
                  {seasons.map((value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Team</span>

                <select
                  value={team}
                  disabled={loadingTeams}
                  onChange={(event) =>
                    setTeam(
                      event.target.value
                    )
                  }
                >
                  {loadingTeams ? (
                    <option>
                      Loading teams...
                    </option>
                  ) : (
                    teams.map((row) => (
                      <option
                        key={row.team}
                        value={row.team}
                      >
                        {teamIdentities[
                          row.team
                        ]?.full_name ||
                          row.full_name ||
                          row.team}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <button
                type="button"
                className="primary-action"
                disabled={
                  loadingProfile ||
                  loadingTeams ||
                  !team
                }
                onClick={loadTeamProfile}
              >
                {loadingProfile
                  ? "Loading..."
                  : "Load Team"}
              </button>
            </div>

            {error && (
              <div className="empty-state team-page-error">
                {error}
              </div>
            )}

            {!profile &&
              !loadingProfile &&
              !error && (
                <div className="empty-state">
                  Choose a season and team,
                  then load the Team Intelligence
                  profile.
                </div>
              )}

            {loadingProfile && (
              <div className="team-page-loading">
                <LoadingDots
                  text={`Loading ${
                    teamIdentities[team]
                      ?.full_name || team
                  } profile`}
                />
              </div>
            )}

            {profile &&
              !loadingProfile && (
                <>
                  <div className="team-profile-brand">
                    <TeamLogo
                      team={team}
                      logos={logos}
                    />

                    <div>
                      <span>
                        {season} Team Profile
                      </span>

                      <strong>
                        {selectedTeamName}
                      </strong>

                      <TeamContextTags
                        ranking={profile.national_ranking}
                        conference={profile.identity?.conference}
                      />
                    </div>
                  </div>

                  <nav
                    className="workspace-tabs"
                    aria-label="Team views"
                  >
                    <button
                      type="button"
                      className={`workspace-tab ${
                        activeTab ===
                        "schedule"
                          ? "is-active"
                          : ""
                      }`}
                      onClick={() =>
                        setActiveTab(
                          "schedule"
                        )
                      }
                    >
                      Schedule & Record
                    </button>

                    <button
                      type="button"
                      className={`workspace-tab ${
                        activeTab === "stats"
                          ? "is-active"
                          : ""
                      }`}
                      onClick={() =>
                        setActiveTab("stats")
                      }
                    >
                      Season Stats
                    </button>

                    <button
                      type="button"
                      className={`workspace-tab ${activeTab === "players" ? "is-active" : ""}`}
                      onClick={() => setActiveTab("players")}
                    >
                      Player Stats
                    </button>

                    <button
                      type="button"
                      className={`workspace-tab ${
                        activeTab === "adv"
                          ? "is-active"
                          : ""
                      }`}
                      onClick={() =>
                        setActiveTab("adv")
                      }
                    >
                      Contextual Football
                      Profile
                    </button>
                  </nav>

                  <div className="page-result">
                    {activeTab === "schedule" && (
                      <TeamSchedule
                        team={team}
                        fullName={selectedTeamName}
                        season={season}
                        record={record}
                        games={schedule}
                        logos={logos}
                        teamIdentities={teamIdentities}
                      />
                    )}


                    {activeTab === "stats" && (
                      <TeamStats
                        intel={intel}
                        stats={stats}
                        games={schedule}
                      />
                    )}

                    {activeTab ===
                      "adv" && (
                      <TeamCfpProfile
                        season={season}
                        team={team}
                        teamName={selectedTeamName}
                        identity={profile.identity || teamIdentities[team] || {}}
                        logos={logos}
                        intel={intel}
                        stats={stats}
                        record={record}
                        driveConversion={driveConversion}
                        frameworkReference={frameworkReference}
                      />
                    )}

                    {activeTab === "players" && (
                      <TeamPlayerStats
                        key={`${season}-${team}`}
                        season={season}
                        team={team}
                        teamName={selectedTeamName}
                      />
                    )}
                  </div>
                </>
              )}
          </>
        )}
      </section>

      <Footer />
    </main>
  );
}

export default Team;

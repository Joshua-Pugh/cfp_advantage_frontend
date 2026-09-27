import { useEffect, useRef, useState } from "react";
import { FiArrowLeft, FiDownload } from "react-icons/fi";
import { Link, useSearchParams } from "react-router-dom";

import Footer from "../components/Footer";
import FrameworkCard from "../components/FrameworkCard";
import Header from "../components/Header";
import LoadingDots from "../components/LoadingDots";
import { api, apiUrl } from "../lib/api";

function safeFilePart(value) {
  return String(value || "team").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function dataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("A card image could not be prepared"));
    reader.readAsDataURL(blob);
  });
}

async function inlineExternalImages(card) {
  const originals = [];
  for (const image of card.querySelectorAll("img")) {
    const source = image.currentSrc || image.src;
    if (!source || new URL(source, window.location.href).origin === window.location.origin) continue;
    const response = await fetch(apiUrl(`/api/assets/team-logo?url=${encodeURIComponent(source)}`));
    if (!response.ok) throw new Error("The team logo could not be included in the PNG");
    originals.push([image, image.src]);
    image.src = await dataUrl(await response.blob());
    if (image.decode) await image.decode().catch(() => undefined);
  }
  return () => originals.forEach(([image, source]) => { image.src = source; });
}

function FrameworkCardPage() {
  const [params, setParams] = useSearchParams();
  const requestedSeason = params.get("season") || "";
  const requestedTeam = params.get("team") || "";
  const cardRef = useRef(null);
  const [seasons, setSeasons] = useState([]);
  const [season, setSeason] = useState("");
  const [teams, setTeams] = useState([]);
  const [team, setTeam] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState("Loading teams...");
  const [error, setError] = useState("");

  async function fetchTeams(nextSeason, preferredTeam = "") {
    setLoadingTeams(true);
    try {
      const board = await api(`/api/product-a/team-board?season=${encodeURIComponent(nextSeason)}&limit=300`);
      const rows = (board.teams || board.rows || [])
        .filter((row) => row.team)
        .sort((a, b) => String(a.full_name || a.team).localeCompare(String(b.full_name || b.team)));
      setTeams(rows);
      const nextTeam = rows.some((row) => row.team === preferredTeam) ? preferredTeam : (rows[0]?.team || "");
      setTeam(nextTeam);
      return nextTeam;
    } finally {
      setLoadingTeams(false);
    }
  }

  async function buildCard(nextSeason = season, nextTeam = team) {
    if (!nextSeason || !nextTeam) return;
    setLoading(true);
    setError("");
    setStatus("Building framework card...");
    try {
      const [profile, frameworkReference] = await Promise.all([
        api(`/api/team/${encodeURIComponent(nextSeason)}/${encodeURIComponent(nextTeam)}`),
        api("/api/product-a/framework-reference"),
      ]);
      setData({ profile, frameworkReference, season: nextSeason, team: nextTeam });
      setParams({ season: nextSeason, team: nextTeam }, { replace: true });
      setStatus("Framework card ready.");
    } catch (loadError) {
      console.error("Framework card failed to load:", loadError);
      setError("This framework card could not be loaded.");
      setStatus("Framework card unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function boot() {
      try {
        const seasonPayload = await api("/api/seasons");
        const availableSeasons = seasonPayload.seasons || [];
        const initialSeason = availableSeasons.map(String).includes(requestedSeason) ? requestedSeason : String(availableSeasons[0] || "");
        setSeasons(availableSeasons);
        setSeason(initialSeason);
        const initialTeam = await fetchTeams(initialSeason, requestedTeam);
        await buildCard(initialSeason, initialTeam);
      } catch (loadError) {
        console.error("Framework card setup failed:", loadError);
        setError("The framework-card builder could not be loaded.");
        setStatus("Framework card unavailable.");
        setLoading(false);
      }
    }
    boot();
    // URL parameters are intentionally read once when the builder opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeSeason(event) {
    const nextSeason = event.target.value;
    setSeason(nextSeason);
    setData(null);
    setStatus("Choose a team, then build its card.");
    await fetchTeams(nextSeason);
  }

  async function downloadPng() {
    if (!cardRef.current || !window.html2canvas || !data) {
      setError("The PNG renderer is still loading. Try again in a moment.");
      return;
    }
    let restoreImages = () => undefined;
    try {
      setExporting(true);
      setStatus("Preparing PNG...");
      restoreImages = await inlineExternalImages(cardRef.current);
      const canvas = await window.html2canvas(cardRef.current, {
        backgroundColor: "#101820",
        scale: 2,
        useCORS: false,
        logging: false,
        windowWidth: 1400,
        onclone: (clonedDocument) => {
          clonedDocument.documentElement.removeAttribute("data-theme");
          const clonedCard = clonedDocument.querySelector(".download-framework-card");
          if (clonedCard) {
            clonedCard.style.width = "1400px";
            clonedCard.style.minWidth = "1400px";
          }
        },
      });
      const link = document.createElement("a");
      link.download = `cfp-advantage-${data.season}-${safeFilePart(data.team)}-framework.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setStatus("PNG downloaded.");
    } catch (exportError) {
      console.error("Framework PNG export failed:", exportError);
      setError("The PNG could not be generated. Please try again.");
      setStatus("PNG download failed.");
    } finally {
      restoreImages();
      setExporting(false);
    }
  }

  const profile = data?.profile || {};
  const identity = profile.identity || {};
  const teamName = profile.full_name || identity.full_name || data?.team || team;

  return (
    <main className="app-shell">
      <Header />
      <section className="workspace-view static-page framework-card-page">
        <div className="framework-builder-heading">
          <div>
            <p className="eyebrow">Contextual Football Profile</p>
            <h2>Build A Team Framework Card</h2>
            <p>Choose a team to turn its CFP metrics into one concise football identity.</p>
          </div>
          <div className="framework-card-actions">
            <Link className="secondary-action" to="/teams"><FiArrowLeft aria-hidden="true" /> Back to Teams</Link>
            <button className="secondary-action" type="button" onClick={downloadPng} disabled={!data || exporting}>
              <FiDownload aria-hidden="true" /> {exporting ? "Preparing PNG..." : "Download PNG"}
            </button>
          </div>
        </div>

        <div className="matchup-controls page-controls framework-card-controls">
          <label><span>Season</span><select value={season} onChange={changeSeason}>{seasons.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label><span>Team</span><select value={team} disabled={loadingTeams} onChange={(event) => setTeam(event.target.value)}>{teams.map((row) => <option key={row.team} value={row.team}>{row.full_name || row.team}</option>)}</select></label>
          <button className="primary-action" type="button" onClick={() => buildCard()} disabled={!season || !team || loading || loadingTeams}>{loading ? "Building..." : "Build Card"}</button>
        </div>

        <p className="framework-card-status" aria-live="polite">{status}</p>
        {loading && !data && <div className="team-page-loading"><LoadingDots text="Building Framework Card" /></div>}
        {error && <div className="empty-state team-page-error">{error}</div>}
        {data && (
          <div className="framework-card-mount">
            <FrameworkCard
              season={data.season} teamName={teamName} identity={identity}
              intel={profile.intelligence || {}} stats={profile.comparison_stats || {}} record={profile.record || {}}
              driveConversion={profile.drive_conversion || profile.drive_conversion_context || {}}
              frameworkReference={data.frameworkReference} cardRef={cardRef}
            />
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}

export default FrameworkCardPage;

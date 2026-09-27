import "./styles.css";
import {Routes, Route, Navigate} from "react-router-dom"
import Home from "./pages/Home";
import Teams from "./pages/TeamPage";
import Matchups from "./pages/MatchUpPage";
import BracketRoom from "./pages/BracketRoomPage";
import About from "./pages/AboutPage";
import Live2026 from "./pages/Live2026Page";
import MetricsGuide from "./pages/MetricsGuidePage";
import News from "./pages/NewsPage";
import Updates from "./pages/UpdatesPage";
import Contact from "./pages/ContactPage";
import Support from "./pages/SupportPage";
import Legal from "./pages/LegalPage";
import FrameworkCardPage from "./pages/FrameworkCardPage";
import GiveawayPage from "./pages/GiveawayPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/teams" element={<Teams />} />
      <Route path="/matchups" element={<Matchups />} />
      <Route path="/bracket-room" element={<BracketRoom />} />
      <Route path="/probability-board" element={<Navigate replace to="/bracket-room" />} />
      <Route path="/about" element={<About />} />
      <Route path="/live-2026" element={<Live2026 />} />
      <Route path="/metrics" element={<MetricsGuide />} />
      <Route path="/news" element={<News />} />
      <Route path="/updates" element={<Updates />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/support" element={<Support />} />
      <Route path="/legal" element={<Legal />} />
      <Route path="/framework-card" element={<FrameworkCardPage />} />
      <Route path="/giveaway" element={<GiveawayPage />} />
      <Route path="/index.html" element={<Navigate replace to="/" />} />
      <Route path="/team.html" element={<Navigate replace to="/teams" />} />
      <Route path="/matchups.html" element={<Navigate replace to="/matchups" />} />
      <Route path="/bracket-room.html" element={<Navigate replace to="/bracket-room" />} />
      <Route path="/live-2026.html" element={<Navigate replace to="/live-2026" />} />
      <Route path="/metrics.html" element={<Navigate replace to="/metrics" />} />
      <Route path="/about.html" element={<Navigate replace to="/about" />} />
      <Route path="/news.html" element={<Navigate replace to="/news" />} />
      <Route path="/updates.html" element={<Navigate replace to="/updates" />} />
      <Route path="/contact.html" element={<Navigate replace to="/contact" />} />
      <Route path="/legal.html" element={<Navigate replace to="/legal" />} />
      <Route path="/framework-card.html" element={<Navigate replace to="/framework-card" />} />
      <Route path="/giveaway.html" element={<Navigate replace to="/giveaway" />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export default App;

import { NavLink } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

function Header() {
  return (
    <header className="site-header">
      <div className="header-theme-control">
        <ThemeToggle />
      </div>

      <img
        className="site-brand-mark"
        src="/assets/adv-logo.png"
        alt="CFP Advantage"
      />

      <p className="eyebrow">CFP ADVANTAGE</p>

      <h1>Football Intelligence</h1>

      <p className="home-subtitle">
        Model-driven team strength, matchup context, and football-control
        intelligence for the 2026 college football season.
      </p>

      <nav className="page-nav centered" aria-label="Site pages">
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? "is-active" : "")}
        >
          Home
        </NavLink>

        <NavLink
          to="/teams"
          className={({ isActive }) => (isActive ? "is-active" : "")}
        >
          Teams
        </NavLink>

        <NavLink
          to="/matchups"
          className={({ isActive }) => (isActive ? "is-active" : "")}
        >
          Matchups
        </NavLink>

        <NavLink
          to="/bracket-room"
          className={({ isActive }) => (isActive ? "is-active" : "")}
        >
          Bracket Room
        </NavLink>

      </nav>
    </header>
  );
}

export default Header;

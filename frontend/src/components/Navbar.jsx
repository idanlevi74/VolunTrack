import { NavLink, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

export default function Navbar() {
  const location = useLocation();
  const { isAuth, user, logout } = useAuth();

  const [open, setOpen] = useState(false);

  const navClass = ({ isActive }) => `nav__link ${isActive ? "active" : ""}`;

  const role = (user?.role || "").toUpperCase();
  const isOrg = isAuth && role === "ORG";

  // לסגור תפריט כשעוברים עמוד
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const onLogout = () => {
    setOpen(false);
    logout();
  };

  return (
    <header className="topbar">
      <div className="container topbar__inner">
        <Link className="brand" to="/">
          VolunTrack <span className="brand__dot">♥</span>
        </Link>

        {/* Desktop nav */}
        <nav className="nav" aria-label="Main navigation">
          <NavLink to="/" end className={navClass}>דף הבית</NavLink>

          {isOrg ? (
            <NavLink to="/createevent" className={navClass}>הקמת אירוע</NavLink>
          ) : (
            <NavLink to="/explore" className={navClass}>חיפוש התנדבויות</NavLink>
          )}

          <NavLink to="/organizations" className={navClass}>עמותות</NavLink>

          {isAuth && <NavLink to="/dashboard" className={navClass}>אזור אישי</NavLink>}

          {!isAuth ? (
            <>
              <NavLink to="/auth" className={navClass}>התחברות</NavLink>
              <NavLink to="/signup" className={navClass}>הרשמה</NavLink>
            </>
          ) : (
            <button className="nav__link" type="button" onClick={logout}>
              התנתקות
            </button>
          )}
        </nav>

        {/* Mobile burger */}
        <button
          className="burger"
          type="button"
          aria-label={open ? "סגור תפריט" : "פתח תפריט"}
          aria-expanded={open}
          aria-controls="mobileNav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav id="mobileNav" className="mobileNav" aria-label="Mobile navigation">
          <NavLink to="/" end className={navClass}>דף הבית</NavLink>

          {isOrg ? (
            <NavLink to="/createevent" className={navClass}>הקמת אירוע</NavLink>
          ) : (
            <NavLink to="/explore" className={navClass}>חיפוש התנדבויות</NavLink>
          )}

          <NavLink to="/organizations" className={navClass}>עמותות</NavLink>

          {isAuth && <NavLink to="/dashboard" className={navClass}>אזור אישי</NavLink>}

          {!isAuth ? (
            <>
              <NavLink to="/auth" className={navClass}>התחברות</NavLink>
              <NavLink to="/signup" className={navClass}>הרשמה</NavLink>
            </>
          ) : (
            <button className="nav__link" type="button" onClick={onLogout}>
              התנתקות
            </button>
          )}
        </nav>
      )}
    </header>
  );
}

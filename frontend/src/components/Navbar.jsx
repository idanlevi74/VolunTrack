import { NavLink, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // סוגר את תפריט המובייל בכל מעבר עמוד
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const navClass = ({ isActive }) => `nav__link ${isActive ? "active" : ""}`;

  return (
    <header className="topbar">
      <div className="container topbar__inner">
        <Link className="brand" to="/">
          VolunTrack <span className="brand__dot">♥</span>
        </Link>

        <nav className="nav">
          <NavLink to="/" end className={navClass}>
            דף הבית
          </NavLink>
          <NavLink to="/ExploreEvents" className={navClass}>
            חיפוש התנדבויות
          </NavLink>
          <NavLink to="/organizations" className={navClass}>
            עמותות
          </NavLink>
          <NavLink to="/dashboard" className={navClass}>
            אזור אישי
          </NavLink>
          <NavLink to="/auth" className={navClass}>
            התחברות
          </NavLink>
        </nav>

        <button
          className="burger"
          onClick={() => setOpen((v) => !v)}
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
        >
          ☰
        </button>
      </div>

      {open && (
        <div className="mobileNav">
          <Link to="/">דף הבית</Link>
          <Link to="/ExploreEvents">חיפוש התנדבויות</Link>
          <Link to="/organizations">עמותות</Link>
          <Link to="/dashboard">אזור אישי</Link>
          <Link to="/auth">התחברות</Link>
        </div>
      )}
    </header>
  );
}

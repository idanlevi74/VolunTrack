import { NavLink, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { isAuth, user, logout } = useAuth(); // ✅ מקור אמת

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
          <NavLink to="/" end className={navClass}>דף הבית</NavLink>
          <NavLink to="/explore" className={navClass}>חיפוש התנדבויות</NavLink>
          <NavLink to="/organizations" className={navClass}>עמותות</NavLink>

          {isAuth && (
            <NavLink to="/dashboard" className={navClass}>
              אזור אישי
            </NavLink>
          )}

          {!isAuth ? (
            <NavLink to="/auth" className={navClass}>התחברות</NavLink>
          ) : (
            <button className="nav__link" onClick={logout}>
              התנתקות
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

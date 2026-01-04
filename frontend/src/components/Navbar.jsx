import { NavLink, Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

// אם יש לך AuthContext – תשתמשי בזה:
// import { useAuth } from "../auth/AuthContext";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // אם אין עדיין AuthContext, זה fallback טוב:
  const isAuth = useMemo(() => !!localStorage.getItem("accessToken"), []);

  // אם יש לך AuthContext, החליפי את 2 השורות מעל בזה:
  // const { isAuth, user, logout } = useAuth();

  // סוגר תפריט מובייל בכל מעבר עמוד
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const navClass = ({ isActive }) => `nav__link ${isActive ? "active" : ""}`;

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    // אם יש לך logout מה-context — תקראי לו במקום
    window.location.href = "/"; // פשוט ונקי
  };

  return (
    <header className="topbar" dir="rtl">
      <div className="container topbar__inner">
        <Link className="brand" to="/">
          VolunTrack <span className="brand__dot">♥</span>
        </Link>

        <nav className="nav" aria-label="ניווט ראשי">
          <NavLink to="/" end className={navClass}>
            דף הבית
          </NavLink>

          <NavLink to="/explore" className={navClass}>
            חיפוש התנדבויות
          </NavLink>

          <NavLink to="/organizations" className={navClass}>
            עמותות
          </NavLink>

          {isAuth && (
            <NavLink to="/dashboard" className={navClass}>
              אזור אישי
            </NavLink>
          )}

          {!isAuth ? (
            <NavLink to="/auth" className={navClass}>
              התחברות
            </NavLink>
          ) : (
            <button
              type="button"
              className="nav__link"
              onClick={handleLogout}
              style={{ background: "transparent", border: 0, cursor: "pointer" }}
            >
              התנתקות
            </button>
          )}
        </nav>

        <button
          className="burger"
          onClick={() => setOpen((v) => !v)}
          type="button"
          aria-label={open ? "סגור תפריט" : "פתח תפריט"}
          aria-expanded={open}
          aria-controls="mobileNav"
        >
          ☰
        </button>
      </div>

      <div
        id="mobileNav"
        className="mobileNav"
        style={{ display: open ? "block" : "none" }}
        aria-hidden={!open}
      >
        <NavLink to="/" end onClick={() => setOpen(false)}>
          דף הבית
        </NavLink>
        <NavLink to="/explore" onClick={() => setOpen(false)}>
          חיפוש התנדבויות
        </NavLink>
        <NavLink to="/organizations" onClick={() => setOpen(false)}>
          עמותות
        </NavLink>

        {isAuth && (
          <NavLink to="/dashboard" onClick={() => setOpen(false)}>
            אזור אישי
          </NavLink>
        )}

        {!isAuth ? (
          <NavLink to="/auth" onClick={() => setOpen(false)}>
            התחברות
          </NavLink>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className="btnSmall"
            style={{ width: "100%", marginTop: 10 }}
          >
            התנתקות
          </button>
        )}
      </div>
    </header>
  );
}

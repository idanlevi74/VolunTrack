import React, { useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
export default function ExploreEvents() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const [category, setCategory] = useState("כל הקטגוריות");
  const [location, setLocation] = useState("מיקום");
  const [q, setQ] = useState("");

  // TODO: החליפי את זה בדאטה מה-API שלך
  const events = useMemo(
    () => [
      // דוגמא לאירוע:
      // { id: 1, title: "חלוקת מזון למשפחות", org: "לב טוב", category: "חלוקת מזון", location: "תל אביב" },
    ],
    []
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return events.filter((e) => {
      const catOk = category === "כל הקטגוריות" || e.category === category;
      const locOk = location === "מיקום" || e.location === location;
      const qOk =
        !query ||
        (e.title || "").toLowerCase().includes(query) ||
        (e.org || "").toLowerCase().includes(query) ||
        (e.category || "").toLowerCase().includes(query);

      return catOk && locOk && qOk;
    });
  }, [events, category, location, q]);

  const clearFilters = () => {
    setCategory("כל הקטגוריות");
    setLocation("מיקום");
    setQ("");
  };

  return (
    <div lang="he" dir="rtl">
      <header className="topbar">
        <div className="container topbar__inner">
          <Link className="brand" to="/">
            VolunTrack <span className="brand__dot">♥</span>
          </Link>

          <nav className="nav" aria-label="ניווט ראשי">
            <NavLink to="/" className={({ isActive }) => "nav__link" + (isActive ? " active" : "")}>
              דף הבית
            </NavLink>
            <NavLink
              to="/explore-events"
              className={({ isActive }) => "nav__link" + (isActive ? " active" : "")}
            >
              חיפוש התנדבויות
            </NavLink>
            <NavLink
              to="/organizations"
              className={({ isActive }) => "nav__link" + (isActive ? " active" : "")}
            >
              עמותות
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => "nav__link" + (isActive ? " active" : "")}
            >
              אזור אישי
            </NavLink>
          </nav>

          <button
            className="burger"
            aria-label={mobileOpen ? "סגור תפריט" : "פתח תפריט"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            type="button"
          >
            ☰
          </button>
        </div>

        {mobileOpen && (
          <div className="mobileNav" role="navigation" aria-label="ניווט מובייל">
            <Link to="/" onClick={() => setMobileOpen(false)}>
              דף הבית
            </Link>
            <Link to="/explore-events" onClick={() => setMobileOpen(false)}>
              חיפוש התנדבויות
            </Link>
            <Link to="/organizations" onClick={() => setMobileOpen(false)}>
              עמותות
            </Link>
            <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
              אזור אישי
            </Link>
          </div>
        )}
      </header>

      <main className="page">
        <div className="container">
          <h1 className="pageTitle">מצאו את ההתנדבות הבאה שלכם</h1>
          <p className="pageSub">חפשו בין מאות אירועים, סננו לפי מיקום או תחום עניין, והירשמו בקליק.</p>

          <div className="box boxPad">
            <div className="filters">
              <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>כל הקטגוריות</option>
                <option>חלוקת מזון</option>
                <option>קשישים</option>
                <option>ילדים</option>
                <option>סביבה</option>
              </select>

              <select className="select" value={location} onChange={(e) => setLocation(e.target.value)}>
                <option>מיקום</option>
                <option>תל אביב</option>
                <option>ירושלים</option>
                <option>חיפה</option>
                <option>באר שבע</option>
              </select>

              <input
                className="input"
                type="search"
                placeholder="חיפוש אירוע, עמותה או תחום..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {filtered.length === 0 ? (
              <div className="searchEmpty">
                <div className="searchIcon">🔎</div>
                לא נמצאו אירועים
                <br />
                <span style={{ fontWeight: 700 }}>נסו לשנות את סינוני החיפוש או לנקות הכל</span>
                <div style={{ marginTop: 14 }}>
                  <button className="btnSmall" type="button" onClick={clearFilters}>
                    ניקוי כל הסינונים
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid">
                {filtered.map((e) => (
                  <div key={e.id} className="card">
                    <div className="cardTitle">{e.title}</div>
                    <div className="cardMeta">
                      {e.org} • {e.location} • {e.category}
                    </div>
                    <div className="cardActions">
                      <Link className="btnSmall" to={`/events/${e.id}`}>
                        לפרטים
                      </Link>
                      <button className="btnSmall" type="button">
                        הרשמה
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="container footer__bottom">
          <span>© 2025 VolunTrack</span>
        </div>
      </footer>
    </div>
  );
}

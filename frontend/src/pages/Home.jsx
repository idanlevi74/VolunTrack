import { useEffect, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import "../styles/style.css";

export default function Home() {
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("nav-open", navOpen);
    return () => document.body.classList.remove("nav-open");
  }, [navOpen]);

  return (
    <>
      <header className="topbar">
        <div className="container topbar__inner">
          <Link className="brand" to="/" onClick={() => setNavOpen(false)}>
            VolunTrack <span className="brand__dot">♥</span>
          </Link>

          <nav className="nav">
            <NavLink to="/" end className={({ isActive }) => `nav__link ${isActive ? "active" : ""}`}>
              דף הבית
            </NavLink>
            <NavLink to="/explore" className={({ isActive }) => `nav__link ${isActive ? "active" : ""}`}>
              חיפוש התנדבויות
            </NavLink>
            <NavLink to="/organizations" className={({ isActive }) => `nav__link ${isActive ? "active" : ""}`}>
              עמותות
            </NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => `nav__link ${isActive ? "active" : ""}`}>
              אזור אישי
            </NavLink>
          </nav>

          <button
            className="burger"
            aria-label="פתח תפריט"
            onClick={() => setNavOpen((v) => !v)}
          >
            ☰
          </button>
        </div>

        <div className="mobileNav" onClick={() => setNavOpen(false)}>
          <Link to="/">דף הבית</Link>
          <Link to="/explore">חיפוש התנדבויות</Link>
          <Link to="/organizations">עמותות</Link>
          <Link to="/dashboard">אזור אישי</Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero__inner">
            <h1 className="hero__title">
              הפכו את העולם לטוב יותר,<br />
              <span className="hero__accent">שעה אחת בכל פעם</span>
            </h1>

            <p className="hero__subtitle">
              VolunTrack מחברת בין מתנדבים לעמותות בדרך הקלה והחכמה ביותר.
              מצאו את ההתנדבות שמתאימה לכם, עקבו אחר ההשפעה שלכם, ותרמו לקהילה.
            </p>

            <div className="hero__actions">
              <Link className="btn btn--primary" to="/explore">
                מצאו התנדבות עכשיו
              </Link>
              <Link className="btn btn--ghost" to="/organizations">
                גלו עמותות
              </Link>
            </div>
          </div>

          <div className="container">
            <div className="stats">
              <div className="stat">
                <div className="stat__icon">♡</div>
                <div className="stat__value">₪15,000</div>
                <div className="stat__label">תרומות שנצברו</div>
              </div>
              <div className="stat">
                <div className="stat__icon">📅</div>
                <div className="stat__value">+450</div>
                <div className="stat__label">שעות התנדבות</div>
              </div>
              <div className="stat">
                <div className="stat__icon">👥</div>
                <div className="stat__value">+120</div>
                <div className="stat__label">מתנדבים פעילים</div>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section__head">
              <div>
                <h2 className="section__title">הזדמנויות התנדבות חמות</h2>
                <p className="section__desc">
                  אירועים שקרובים ודורשים עזרה עכשיו. כל התנדבות נחשבת.
                </p>
              </div>
              <Link className="section__link" to="/explore">
                לכל האירועים ←
              </Link>
            </div>

            <div className="grid3">
              {[1, 2, 3].map((i) => (
                <article className="card" key={i}>
                  <div className="card__thumb"></div>
                  <div className="card__body">
                    <h3 className="card__title">כותרת אירוע</h3>
                    <p className="card__meta">תאריך • מיקום • עמותה</p>
                    <div className="card__actions">
                      <Link className="btnSmall" to="/event/1">
                        לפרטים
                      </Link>
                      <button className="btnSmall" type="button">
                        להרשמה
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--alt">
          <div className="container split">
            <div className="split__media">
              {/* אם יש לך תמונה—שימי אותה ב /public/assets/images/home/team.jpg */}
              <img
                className="split__img"
                src="/assets/images/home/team.jpg"
                alt="ניהול התנדבות"
              />
            </div>

            <div className="split__content">
              <span className="pill">למה VolunTrack?</span>
              <h2 className="split__title">הדרך החכמה לנהל את הנתינה שלכם</h2>
              <p className="split__desc">
                המערכת שלנו בנויה כדי לתת לכם את כל הכלים להיות מעורבים חברתית, בקלות ובנוחות —
                בין אם אתם מתנדבים ובין אם אתם מנהלי עמותות.
              </p>

              <ul className="checks">
                <li><span className="check">✓</span> פרופיל מתנדב חכם — צברו נקודות, תגמולים והיסטוריה.</li>
                <li><span className="check">✓</span> סנכרון מלא — התממשקות ליומן Google כדי שלא תפספסו אף אירוע.</li>
                <li><span className="check">✓</span> שקיפות ואמינות — דירוג ומשוב דו־כיווני למתנדבים ולעמותות.</li>
                <li><span className="check">✓</span> תרומות מאובטחות — ניהול תרומות ותשלומים בצורה מסודרת.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="cta">
          <div className="container cta__inner">
            <h2 className="cta__title">מוכנים להתחיל להשפיע?</h2>
            <p className="cta__desc">הצטרפו לאלפי מתנדבים שכבר עושים שינוי אמיתי בקהילה.</p>
            <Link className="btn btn--light" to="/register">
              הצטרפו עכשיו בחינם
            </Link>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer__grid">
          <div>
            <div className="brand">
              VolunTrack <span className="brand__dot">♥</span>
            </div>
            <p className="footer__text">
              מחברים בין אנשים טובים למטרות חשובות. מערכת לניהול התנדבויות, תרומות וקהילה.
            </p>
          </div>

          <div>
            <h4 className="footer__title">ניווט</h4>
            <Link className="footer__link" to="/">דף הבית</Link>
            <Link className="footer__link" to="/explore">חיפוש התנדבויות</Link>
            <Link className="footer__link" to="/organizations">עמותות וארגונים</Link>
            <Link className="footer__link" to="/dashboard">אזור אישי</Link>
          </div>

          <div>
            <h4 className="footer__title">משפטי</h4>
            <a className="footer__link" href="#">תנאי שימוש</a>
            <a className="footer__link" href="#">מדיניות פרטיות</a>
            <a className="footer__link" href="#">נגישות</a>
          </div>
        </div>

        <div className="container footer__bottom">
          <span>© 2025 VolunTrack. נבנה באהבה ♥ ע״י סטודנטים למען הקהילה.</span>
        </div>
      </footer>
    </>
  );
}

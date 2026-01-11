import { Link } from "react-router-dom";
import "../styles/style.css";

export default function Home() {
  return (
    <main>
      {/* HERO */}
      <section className="hero">
        <div className="container hero__inner">
          <h1 className="hero__title">
            הפכו את העולם לטוב יותר,
            <br />
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

      {/* HOT VOLUNTEER EVENTS */}
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
                    <Link className="btnSmall" to={`/events/${i}`}>
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

      {/* WHY VOLUNTRACK */}
      <section className="section section--alt">
        <div className="container split">
          <div className="split__media">
            <img
              className="split__img"
              src="/assets/images/home/team.jpg"
              alt="ניהול התנדבויות"
            />
          </div>

          <div className="split__content">
            <span className="pill">למה VolunTrack?</span>

            <h2 className="split__title">
              הדרך החכמה לנהל את הנתינה שלכם
            </h2>

            <p className="split__desc">
              המערכת שלנו נבנתה כדי לאפשר מעורבות חברתית בצורה קלה, נגישה וחכמה —
              בין אם אתם מתנדבים ובין אם אתם מנהלי עמותות.
            </p>

            <ul className="checks">
              <li>
                <span className="check">✓</span>
                פרופיל מתנדב חכם עם היסטוריה ונקודות
              </li>
              <li>
                <span className="check">✓</span>
                סנכרון ליומן – כדי שלא תפספסו אף אירוע
              </li>
              <li>
                <span className="check">✓</span>
                שקיפות מלאה – דירוג ומשוב הדדי
              </li>
              <li>
                <span className="check">✓</span>
                ניהול תרומות מאובטח ונוח
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="container cta__inner">
          <h2 className="cta__title">מוכנים להתחיל להשפיע?</h2>
          <p className="cta__desc">
            הצטרפו לאלפי מתנדבים שכבר עושים שינוי אמיתי בקהילה.
          </p>

          <Link className="btn btn--light" to="/register">
            הצטרפו עכשיו בחינם
          </Link>
        </div>
      </section>
    </main>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/style.css";

// אם יש לך VITE_API_BASE_URL בקובץ .env של הפרונט – מעולה.
// אחרת ייפול ל-"" (אותו דומיין).
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// עוזר קטן ל-DRF pagination
function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload?.results && Array.isArray(payload.results)) return payload.results;
  return [];
}

// fetch קטן שמחזיר JSON (גם כשיש שגיאה – מחזיר טקסט אם לא JSON)
async function fetchJson(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg =
      (data && (data.detail || data.error)) ||
      (typeof data === "string" ? data : "") ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  // dateStr צפוי להיות "YYYY-MM-DD"
  try {
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString("he-IL");
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  // timeStr יכול להיות "HH:MM:SS" או "HH:MM"
  return String(timeStr).slice(0, 5);
}

export default function Home() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState("");

  // לפי מה שהיה לך בפרויקט: אם את שומרת accessToken בשם אחר – תעדכני פה
  const accessToken = localStorage.getItem("accessToken");

  useEffect(() => {
    let ignore = false;

    async function loadHotEvents() {
      setLoadingEvents(true);
      setEventsError("");

      try {
        // תעדכני את ה-query לפי מה שתומך אצלך בשרת:
        // למשל: /api/events/?ordering=date&limit=3
        // או /api/events/?page_size=3
        const data = await fetchJson("/api/events/");
        const list = asList(data);

        // "חמים" = 3 הראשונים (אם אין פילטר בשרת)
        const top3 = list.slice(0, 3);

        if (!ignore) setEvents(top3);
      } catch (e) {
        if (!ignore) setEventsError(e.message || "נכשלה טעינת אירועים");
      } finally {
        if (!ignore) setLoadingEvents(false);
      }
    }

    loadHotEvents();
    return () => {
      ignore = true;
    };
  }, []);

  const cards = useMemo(() => events || [], [events]);

  const handleSignup = async (eventId) => {
    // אם ההרשמה אצלך היא ציבורית – אפשר להסיר את הבדיקה הזו
    if (!accessToken) {
      navigate("/auth");
      return;
    }

    try {
      // תעדכני את ה-endpoint לפי מה שיש אצלך בפועל:
      // לדוגמה: POST /api/events/{id}/signup/
      await fetchJson(`/api/events/${eventId}/signup/`, {
        method: "POST",
        token: accessToken,
        body: {}, // אם צריך payload – תוסיפי פה
      });

      alert("נרשמת בהצלחה ✅");
    } catch (e) {
      alert(e.message || "שגיאה בהרשמה");
    }
  };

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
            VolunTrack מחברת בין מתנדבים לעמותות בדרך הקלה והחכמה ביותר. מצאו את
            ההתנדבות שמתאימה לכם, עקבו אחר ההשפעה שלכם, ותרמו לקהילה.
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

          {/* מצבי טעינה/שגיאה */}
          {loadingEvents ? (
            <div className="card" style={{ padding: 16 }}>
              טוען אירועים...
            </div>
          ) : eventsError ? (
            <div className="card" style={{ padding: 16 }}>
              <b>לא הצלחתי לטעון אירועים.</b>
              <div style={{ marginTop: 6, opacity: 0.8 }}>{eventsError}</div>
            </div>
          ) : cards.length === 0 ? (
            <div className="card" style={{ padding: 16 }}>
              עדיין אין אירועים זמינים 😅
            </div>
          ) : (
            <div className="grid3">
              {cards.map((e) => {
                const when = [formatDate(e.date), formatTime(e.time)]
                  .filter(Boolean)
                  .join(" • ");

                const meta = [
                  when,
                  e.location || "",
                  e.org_name || e.org || "",
                ]
                  .filter(Boolean)
                  .join(" • ");

                return (
                  <article className="card" key={e.id}>
                      <div className="card__thumb"></div>

                      <div className="card__body">
                        <h3 className="card__title">{e.title || "אירוע"}</h3>
                        <p className="card__meta">{meta || "תאריך • מיקום • עמותה"}</p>

                        {/* ✅ נרשמו / נדרש + progress (כמו באקספלור) */}
                        {(() => {
                          const signed = Number(e?.signups_count ?? 0);
                          const needed = Number(e?.needed_volunteers ?? 0);
                          const hasLimit = Number.isFinite(needed) && needed > 0;
                          const pct = hasLimit ? Math.min(100, Math.round((signed / needed) * 100)) : 0;
                          const isFull = hasLimit && signed >= needed;

                          return (
                            <div className="homeStatsRow">
                              <span className={`homeStatPill ${isFull ? "homeStatPill--full" : ""}`} title="נרשמו / נדרש">
                                👥 {signed}{hasLimit ? `/${needed}` : ""} רשומים{isFull ? " (מלא)" : ""}
                              </span>

                              {hasLimit && (
                                <div className={`homeProgress ${isFull ? "homeProgress--full" : ""}`}>
                                  <div className="homeProgress__bar" style={{ width: `${pct}%` }} aria-label={`התקדמות הרשמה: ${pct}%`} />
                                  <span className="homeProgress__label">{pct}%</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        <div className="card__actions">
                          <Link className="btnSmall" to={`/events/${e.id}`}>
                            לפרטים
                          </Link>

                          <button className="btnSmall" type="button" onClick={() => handleSignup(e.id)}>
                            להרשמה
                          </button>
                        </div>
                      </div>
                    </article>

                );
              })}
            </div>
          )}
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

            <h2 className="split__title">הדרך החכמה לנהל את הנתינה שלכם</h2>

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
          <p className="cta__desc">הצטרפו לאלפי מתנדבים שכבר עושים שינוי אמיתי בקהילה.</p>

          <Link className="btn btn--light" to="/register">
            הצטרפו עכשיו בחינם
          </Link>
        </div>
      </section>
    </main>
  );
}

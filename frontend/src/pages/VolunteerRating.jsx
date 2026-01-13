// VolunteerRating.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../api/client"; // אצלך כבר קיים בפרויקט

// --- התאימי את הנתיבים האלה למה שיש אצלך ב-API ---
const SIGNUPS_ENDPOINT_PRIMARY = (eventId) => `/api/events/${eventId}/signups/`; // מומלץ
const SIGNUPS_ENDPOINT_FALLBACK = (eventId) => `/api/event-signups/?event=${eventId}`; // חלופה אם אין nested route

// TODO: תחליפי לזה endpoint אמיתי אצלך (אופציה 1: POST לכל דירוג; אופציה 2: bulk)
const SAVE_RATING_ENDPOINT = () => `/api/volunteer-ratings/`;

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload?.results && Array.isArray(payload.results)) return payload.results;
  return [];
}

function emptyRating() {
  return {
    role: "",
    taskDesc: "",
    hours: "",
    reliability: "",
    execution: "",
    teamwork: "",
    notes: "",
    saved: false,
    saving: false,
    error: "",
  };
}

function RatingScale({ name, value, onChange, label }) {
  return (
    <div className="rating">
      <h3>{label}</h3>
      <div className="scale" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="pill">
            <input
              type="radio"
              name={name}
              value={String(n)}
              checked={String(value) === String(n)}
              onChange={(e) => onChange(e.target.value)}
              required
            />
            {n}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function VolunteerRating() {
  const { eventId } = useParams();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [eventName, setEventName] = useState(""); // אם יש לך endpoint אירוע, אפשר למלא אוטומטית
  const [raterName, setRaterName] = useState(""); // אם יש לך "me" אפשר למלא אוטומטית

  const [signups, setSignups] = useState([]);
  const [ratings, setRatings] = useState({}); // { [signupId]: ratingState }

  const signupIds = useMemo(() => signups.map((s) => s.id), [signups]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        // 1) נסה endpoint ראשי
        let payload;
        try {
          payload = await apiFetch(SIGNUPS_ENDPOINT_PRIMARY(eventId));
        } catch (e) {
          // 2) fallback אם הראשי לא קיים
          payload = await apiFetch(SIGNUPS_ENDPOINT_FALLBACK(eventId));
        }

        const list = asList(payload);

        if (!alive) return;

        setSignups(list);

        // אתחל state דירוג לכל נרשם/ת
        setRatings((prev) => {
          const next = { ...prev };
          for (const s of list) {
            if (!next[s.id]) next[s.id] = emptyRating();
          }
          return next;
        });
      } catch (e) {
        if (!alive) return;
        setLoadError(
          typeof e?.message === "string"
            ? e.message
            : "שגיאה בטעינת הרשומים לאירוע"
        );
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [eventId]);

  // ניקוי ratings של מי שכבר לא מופיע ברשימה (נדיר, אבל עוזר)
  useEffect(() => {
    setRatings((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (!signupIds.includes(Number(key)) && !signupIds.includes(key)) {
          delete next[key];
        }
      }
      return next;
    });
  }, [signupIds]);

  function updateRating(signupId, patch) {
    setRatings((prev) => ({
      ...prev,
      [signupId]: {
        ...(prev[signupId] || emptyRating()),
        ...patch,
        saved: false,
        error: "",
      },
    }));
  }

  function validateOne(r) {
    if (!r.role) return "חובה לבחור תפקיד";
    if (!r.hours) return "חובה למלא שעות / נוכחות";
    if (!r.reliability || !r.execution || !r.teamwork) return "חובה לדרג 1–5 בכל הקריטריונים";
    return "";
  }

  async function saveOne(signup) {
    const sid = signup.id;
    const r = ratings[sid] || emptyRating();
    const err = validateOne(r);
    if (err) {
      updateRating(sid, { error: err });
      return;
    }

    updateRating(sid, { saving: true, error: "" });

    try {
      // התאימי payload לשדות של המודל אצלך ב-Backend
      const payload = {
        event: eventId,
        signup: sid,
        volunteer_name: signup.volunteer_name, // אופציונלי
        event_name: eventName || undefined, // אופציונלי
        rater_name: raterName || undefined, // אופציונלי
        role: r.role,
        task_desc: r.taskDesc,
        hours: r.hours,
        reliability: Number(r.reliability),
        execution: Number(r.execution),
        teamwork: Number(r.teamwork),
        notes: r.notes,
      };

      await apiFetch(SAVE_RATING_ENDPOINT(), {
        method: "POST",
        body: payload,
      });

      updateRating(sid, { saving: false, saved: true });
    } catch (e) {
      updateRating(sid, {
        saving: false,
        error:
          typeof e?.message === "string"
            ? e.message
            : "שמירה נכשלה. בדקי endpoint/שדות בשרת.",
      });
    }
  }

  return (
    <div className="vr-page" lang="he" dir="rtl">
      <style>{`
        :root{
          --bg:#f6f7fb;
          --card:#ffffff;
          --text:#111827;
          --muted:#6b7280;
          --border:#e5e7eb;
          --focus:#2563eb;
          --shadow: 0 10px 25px rgba(0,0,0,.06);
          --radius: 16px;
        }
        *{ box-sizing:border-box; }
        .vr-page{
          margin:0;
          font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
          background: var(--bg);
          color: var(--text);
          line-height:1.4;
          min-height: 100vh;
        }
        .container{
          width:min(980px, 92vw);
          margin: 40px auto;
        }
        header{
          display:flex;
          justify-content:space-between;
          align-items:flex-end;
          gap:16px;
          margin-bottom:18px;
        }
        h1{
          margin:0;
          font-size: clamp(22px, 2.6vw, 30px);
          letter-spacing:.2px;
        }
        .hint{
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 14px;
        }
        .card{
          background: var(--card);
          border:1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 18px;
        }
        .topbar{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          align-items:center;
          justify-content:flex-start;
          margin-top: 10px;
        }
        .link{
          color: var(--focus);
          text-decoration: none;
          font-weight: 700;
        }
        form{
          display:grid;
          gap: 16px;
        }
        .grid{
          display:grid;
          gap: 14px;
          grid-template-columns: repeat(12, 1fr);
        }
        .field{
          grid-column: span 12;
          display:flex;
          flex-direction:column;
          gap:8px;
        }
        .field label{
          font-size: 14px;
          color: var(--muted);
        }
        input, select, textarea{
          width:100%;
          padding: 12px 12px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background:#fff;
          color: var(--text);
          font-size: 15px;
          outline:none;
          transition: border-color .15s, box-shadow .15s;
        }
        textarea{ min-height: 110px; resize: vertical; }
        input:focus, select:focus, textarea:focus{
          border-color: var(--focus);
          box-shadow: 0 0 0 4px rgba(37,99,235,.12);
        }
        .row-title{
          margin: 6px 0 0;
          font-size: 16px;
          font-weight: 700;
        }
        .sub{
          margin: 2px 0 0;
          color: var(--muted);
          font-size: 13px;
        }
        .ratings{
          display:grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 12px;
          padding-top: 6px;
        }
        .rating{
          grid-column: span 12;
          border: 1px dashed var(--border);
          border-radius: 14px;
          padding: 12px;
          background: #fafafa;
        }
        .rating h3{
          margin:0 0 8px;
          font-size: 15px;
        }
        .scale{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          align-items:center;
        }
        .pill{
          display:flex;
          align-items:center;
          gap:8px;
          padding: 8px 10px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background:#fff;
          cursor:pointer;
          user-select:none;
        }
        .pill input{
          width:auto;
          margin:0;
          accent-color: var(--focus);
        }
        .vol-card{
          border: 1px solid var(--border);
          border-radius: 16px;
          background: #fff;
          padding: 14px;
          box-shadow: 0 6px 16px rgba(0,0,0,.04);
        }
        .vol-head{
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap: 10px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .vol-name{
          font-weight: 900;
          font-size: 16px;
          margin: 0;
        }
        .badge{
          font-size: 12px;
          color: var(--muted);
          border: 1px solid var(--border);
          padding: 6px 10px;
          border-radius: 999px;
          background: #fafafa;
        }
        .actions{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          justify-content:flex-start;
          border-top:1px solid var(--border);
          padding-top: 14px;
          margin-top: 10px;
        }
        button{
          border: 0;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 15px;
          cursor:pointer;
        }
        .btn-primary{
          background: var(--focus);
          color:#fff;
        }
        .btn-ghost{
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text);
        }
        .note{
          color: var(--muted);
          font-size: 13px;
          margin: 0;
        }
        .error{
          color: #b91c1c;
          font-size: 13px;
          margin: 0;
          font-weight: 700;
        }
        .success{
          color: #065f46;
          font-size: 13px;
          margin: 0;
          font-weight: 700;
        }
        @media (min-width: 720px){
          .col-6{ grid-column: span 6; }
          .col-4{ grid-column: span 4; }
          .col-8{ grid-column: span 8; }
          .rating{ grid-column: span 4; }
        }
      `}</style>

      <div className="container">
        <header>
          <div>
            <h1>דירוג מתנדבים — סיכום אירוע</h1>
            <p className="hint">
              בחרת אירוע #{eventId} — נטען את כל הרשומים ונאפשר דירוג לכל אחד.
            </p>

            <div className="topbar">
              <Link className="link" to="/dashboard">
                ← חזרה לדשבורד
              </Link>
            </div>
          </div>
        </header>

        <section className="card">
          {/* פרטים כלליים (כמו ב-HTML המקורי) */}
          <div className="grid">
            <div className="field col-6">
              <label htmlFor="eventName">שם האירוע</label>
              <input
                id="eventName"
                name="eventName"
                type="text"
                placeholder="לדוגמה: חלוקת מזון — שכונת התקווה"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              />
            </div>

            <div className="field col-6">
              <label htmlFor="raterName">שם המדרג/ת</label>
              <input
                id="raterName"
                name="raterName"
                type="text"
                placeholder="לדוגמה: רכז/ת מתנדבים"
                value={raterName}
                onChange={(e) => setRaterName(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            {loading && <p className="note">טוען רשומים לאירוע…</p>}
            {!loading && loadError && <p className="error">{loadError}</p>}

            {!loading && !loadError && signups.length === 0 && (
              <p className="note">אין רשומים לאירוע הזה עדיין.</p>
            )}

            {!loading && !loadError && signups.length > 0 && (
              <div style={{ display: "grid", gap: 12 }}>
                {signups.map((s) => {
                  const r = ratings[s.id] || emptyRating();

                  return (
                    <div key={s.id} className="vol-card">
                      <div className="vol-head">
                        <p className="vol-name">{s.volunteer_name || "מתנדב/ת"}</p>
                        <span className="badge">Signup #{s.id}</span>
                      </div>

                      <div className="grid">
                        <div className="field col-6">
                          <label>תפקיד</label>
                          <select
                            value={r.role}
                            onChange={(e) =>
                              updateRating(s.id, { role: e.target.value })
                            }
                          >
                            <option value="" disabled>
                              בחר תפקיד
                            </option>
                            <option>קבלה ורישום</option>
                            <option>לוגיסטיקה וסידור</option>
                            <option>חלוקה בשטח</option>
                            <option>הדרכה והכוונה</option>
                            <option>תפעול עמדות</option>
                            <option>סיוע כללי</option>
                            <option>אחר</option>
                          </select>
                        </div>

                        <div className="field col-6">
                          <label>שעות / נוכחות</label>
                          <input
                            type="text"
                            placeholder="לדוגמה: 10:00–14:00 / 4 שעות"
                            value={r.hours}
                            onChange={(e) =>
                              updateRating(s.id, { hours: e.target.value })
                            }
                          />
                        </div>

                        <div className="field col-12">
                          <label>תיאור קצר של מה שבוצע</label>
                          <input
                            type="text"
                            placeholder="שורה-שתיים: מה בדיוק עשה/עשתה"
                            value={r.taskDesc}
                            onChange={(e) =>
                              updateRating(s.id, { taskDesc: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <p className="row-title">דירוג 1–5</p>
                        <p className="sub">
                          1 = חלש, 5 = מצוין. לבחור ערך אחד לכל קריטריון.
                        </p>

                        <div className="ratings">
                          <RatingScale
                            name={`reliability_${s.id}`}
                            label="אמינות"
                            value={r.reliability}
                            onChange={(val) =>
                              updateRating(s.id, { reliability: val })
                            }
                          />
                          <RatingScale
                            name={`execution_${s.id}`}
                            label="ביצוע"
                            value={r.execution}
                            onChange={(val) =>
                              updateRating(s.id, { execution: val })
                            }
                          />
                          <RatingScale
                            name={`teamwork_${s.id}`}
                            label="עבודת צוות"
                            value={r.teamwork}
                            onChange={(val) =>
                              updateRating(s.id, { teamwork: val })
                            }
                          />
                        </div>
                      </div>

                      <div className="field" style={{ marginTop: 10 }}>
                        <label>הערות</label>
                        <textarea
                          placeholder="דוגמאות קצרות, נקודות לשיפור, התנהלות חריגה אם קיימת (ענייני ומכבד)."
                          value={r.notes}
                          onChange={(e) =>
                            updateRating(s.id, { notes: e.target.value })
                          }
                        />
                      </div>

                      <div className="actions">
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => saveOne(s)}
                          disabled={r.saving}
                        >
                          {r.saving ? "שומר…" : "שמור דירוג"}
                        </button>

                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => updateRating(s.id, emptyRating())}
                        >
                          נקה דירוג למתנדב/ת
                        </button>

                        {r.error && <p className="error">{r.error}</p>}
                        {r.saved && !r.error && (
                          <p className="success">נשמר ✅</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

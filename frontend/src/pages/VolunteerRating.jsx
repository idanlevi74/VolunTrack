// VolunteerRating.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import "../styles/VolunteerRating.css";

// API routes
const EVENT_DETAILS_ENDPOINT = (eventId) => `/api/events/${eventId}/`;
const SIGNUPS_ENDPOINT = (eventId) => `/api/events/${eventId}/signups/`;
// TODO: החליפי ל-endpoint האמיתי שלך לשמירת דירוג
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
    <div className="vrMetric">
      <div className="vrMetricTitle">{label}</div>
      <div className="vrScale" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={`vrPill ${String(value) === String(n) ? "isOn" : ""}`}>
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

  const [event, setEvent] = useState(null);
  const [me, setMe] = useState(null);

  const [signups, setSignups] = useState([]);
  const [ratings, setRatings] = useState({}); // { [signupId]: ratingState }
  const [savingAll, setSavingAll] = useState(false);

  const signupIds = useMemo(() => signups.map((s) => s.id), [signups]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        // נטען במקביל: פרטי אירוע, me, רשומים
        const [ev, meRes, signupsRes] = await Promise.all([
          apiFetch(EVENT_DETAILS_ENDPOINT(eventId)),
          apiFetch("/api/me/"),
          apiFetch(SIGNUPS_ENDPOINT(eventId)),
        ]);

        if (!alive) return;

        setEvent(ev);
        setMe(meRes);

        const list = asList(signupsRes);
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
        setLoadError(typeof e?.message === "string" ? e.message : "שגיאה בטעינת הדף");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [eventId]);

  // ניקוי ratings של מי שכבר לא מופיע ברשימה
  useEffect(() => {
    setRatings((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        const kNum = Number(key);
        if (!signupIds.includes(kNum)) delete next[key];
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
      return false;
    }

    updateRating(sid, { saving: true, error: "" });

    try {
      const payload = {
        event: Number(eventId),
        signup: sid,
        // לא שולחים event_name / org_name — מיותר, השרת יודע לפי eventId
        role: r.role,
        task_desc: r.taskDesc,
        hours: r.hours,
        reliability: Number(r.reliability),
        execution: Number(r.execution),
        teamwork: Number(r.teamwork),
        notes: r.notes,
        // אם בכל זאת תרצי לשמור מי דירג:
        rater_name: me?.full_name || me?.username || me?.email || undefined,
      };

      await apiFetch(SAVE_RATING_ENDPOINT(), { method: "POST", body: payload });

      updateRating(sid, { saving: false, saved: true });
      return true;
    } catch (e) {
      updateRating(sid, {
        saving: false,
        error: typeof e?.message === "string" ? e.message : "שמירה נכשלה",
      });
      return false;
    }
  }

  const progress = useMemo(() => {
    const total = signups.length;
    if (!total) return { total: 0, done: 0, left: 0 };
    const done = signups.reduce((acc, s) => acc + (ratings[s.id]?.saved ? 1 : 0), 0);
    return { total, done, left: Math.max(0, total - done) };
  }, [signups, ratings]);

  async function saveAll() {
    if (!signups.length) return;
    setSavingAll(true);

    // נשמור רק את מי שלא נשמר עדיין
    const targets = signups.filter((s) => !ratings[s.id]?.saved);
    for (const s of targets) {
      // eslint-disable-next-line no-await-in-loop
      await saveOne(s);
    }

    setSavingAll(false);
  }

  const eventTitle = event?.title || `אירוע #${eventId}`;

  return (
    <div className="vrPage" lang="he" dir="rtl">
      <div className="vrContainer">
        <header className="vrHeader">
          <div>
            <h1 className="vrH1">דירוג משתתפים · {eventTitle}</h1>
            <p className="vrHint">
              {progress.total
                ? `נשמרו ${progress.done}/${progress.total}. נשארו ${progress.left} לדירוג.`
                : "טוענים משתתפים…"}
            </p>
          </div>

          <div className="vrHeaderActions">
            <Link className="vrLink" to="/dashboard">
              ← חזרה לדשבורד
            </Link>

            <button
              type="button"
              className="vrBtn vrBtnPrimary"
              onClick={saveAll}
              disabled={loading || savingAll || !signups.length}
              title="שומר את כל מי שעדיין לא נשמר"
            >
              {savingAll ? "שומר הכל…" : "שמור הכל"}
            </button>
          </div>
        </header>

        <section className="vrCard">
          {loading && (
            <div className="vrState">
              <div className="vrEmoji">⏳</div>
              טוען רשומים לאירוע…
            </div>
          )}

          {!loading && loadError && (
            <div className="vrState vrStateError">
              <div className="vrEmoji">😅</div>
              {loadError}
            </div>
          )}

          {!loading && !loadError && signups.length === 0 && (
            <div className="vrState">
              <div className="vrEmoji">👥</div>
              אין רשומים לאירוע הזה עדיין.
            </div>
          )}

          {!loading && !loadError && signups.length > 0 && (
            <div className="vrList">
              {signups.map((s) => {
                const r = ratings[s.id] || emptyRating();
                const title = s.volunteer_name || "מתנדב/ת";

                return (
                  <article key={s.id} className="vrVolCard">
                    <div className="vrVolTop">
                      <div>
                        <div className="vrVolName">{title}</div>
                        <div className="vrVolSub">
                          {r.saved ? <span className="vrOk">נשמר ✅</span> : <span className="vrPending">טרם נשמר</span>}
                          {r.error ? <span className="vrErr"> · {r.error}</span> : null}
                        </div>
                      </div>

                      <div className="vrVolTopActions">
                        <button
                          type="button"
                          className="vrBtn vrBtnGhost"
                          onClick={() => updateRating(s.id, emptyRating())}
                          disabled={r.saving}
                        >
                          נקה
                        </button>

                        <button
                          type="button"
                          className="vrBtn vrBtnPrimary"
                          onClick={() => saveOne(s)}
                          disabled={r.saving}
                        >
                          {r.saving ? "שומר…" : "שמור"}
                        </button>
                      </div>
                    </div>

                    <div className="vrGrid">
                      <div className="vrField vrCol6">
                        <label>תפקיד</label>
                        <select
                          value={r.role}
                          onChange={(e) => updateRating(s.id, { role: e.target.value })}
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

                      <div className="vrField vrCol6">
                        <label>שעות / נוכחות</label>
                        <input
                          type="text"
                          placeholder="לדוגמה: 10:00–14:00 / 4 שעות"
                          value={r.hours}
                          onChange={(e) => updateRating(s.id, { hours: e.target.value })}
                        />
                      </div>

                      <div className="vrField vrCol12">
                        <label>תיאור קצר</label>
                        <input
                          type="text"
                          placeholder="שורה-שתיים: מה בדיוק עשה/עשתה"
                          value={r.taskDesc}
                          onChange={(e) => updateRating(s.id, { taskDesc: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="vrSection">
                      <div className="vrSectionTitle">דירוג 1–5</div>
                      <div className="vrSectionSub">1 = חלש, 5 = מצוין</div>

                      <div className="vrMetrics">
                        <RatingScale
                          name={`reliability_${s.id}`}
                          label="אמינות"
                          value={r.reliability}
                          onChange={(val) => updateRating(s.id, { reliability: val })}
                        />
                        <RatingScale
                          name={`execution_${s.id}`}
                          label="ביצוע"
                          value={r.execution}
                          onChange={(val) => updateRating(s.id, { execution: val })}
                        />
                        <RatingScale
                          name={`teamwork_${s.id}`}
                          label="עבודת צוות"
                          value={r.teamwork}
                          onChange={(val) => updateRating(s.id, { teamwork: val })}
                        />
                      </div>
                    </div>

                    <div className="vrField">
                      <label>הערות</label>
                      <textarea
                        placeholder="דוגמאות קצרות, נקודות לשיפור, הערות ענייניות"
                        value={r.notes}
                        onChange={(e) => updateRating(s.id, { notes: e.target.value })}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

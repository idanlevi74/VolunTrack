// VolunteerRating.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import "../styles/VolunteerRating.css";

// API routes
const EVENT_DETAILS_ENDPOINT = (eventId) => `/api/events/${eventId}/`;
const SIGNUPS_ENDPOINT = (eventId) => `/api/events/${eventId}/signups/`;
const SAVE_RATING_ENDPOINT = (eventId) => `/api/events/${eventId}/rate/`;

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
    saved: false,   // UI בלבד
    saving: false,  // UI בלבד
    error: "",      // UI בלבד
    // אפשר לשמור גם meta תצוגה:
    ratedAt: null,
    ratingAvg: null,
  };
}

function isRatedFromServer(s) {
  // מספיק אחד מהבאים כדי להבין שיש דירוג שמור
  return (
    s?.rated_at != null ||
    s?.rating != null ||
    (s?.rating_reliability != null &&
      s?.rating_execution != null &&
      s?.rating_teamwork != null)
  );
}

function hydrateFromServerSignup(s) {
  const rated = isRatedFromServer(s);

  return {
    ...emptyRating(),
    role: s?.role || "",
    taskDesc: s?.task_desc || "",
    hours: s?.hours || "",
    reliability: s?.rating_reliability ?? "",
    execution: s?.rating_execution ?? "",
    teamwork: s?.rating_teamwork ?? "",
    notes: s?.notes || "",
    saved: rated,
    ratedAt: s?.rated_at || null,
    ratingAvg: s?.rating ?? null,
  };
}

function RatingScale({ name, value, onChange, label }) {
  return (
    <div className="vrMetric">
      <div className="vrMetricTitle">{label}</div>
      <div className="vrScale" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className={`vrPill ${String(value) === String(n) ? "isOn" : ""}`}
          >
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
        // ✅ hydrate: טען דירוגים קיימים מהשרת
        setRatings((prev) => {
          const next = { ...prev };

          for (const s of list) {
            const sid = s.id;

            // אם יש מצב שהמשתמש התחיל לערוך לפני שהגיע השרת — לא נדרוס
            if (next[sid] && (next[sid].saving || next[sid].error)) continue;

            // אם אין — ניצור מהשרת
            if (!next[sid]) {
              next[sid] = hydrateFromServerSignup(s);
              continue;
            }

            // אם יש אבל הוא ריק לגמרי (ברירת מחדל) — נעדכן מהשרת
            // כדי לתפוס דירוגים קיימים בכניסה חוזרת
            const wasEmpty =
              !next[sid].role &&
              !next[sid].hours &&
              !next[sid].taskDesc &&
              !next[sid].reliability &&
              !next[sid].execution &&
              !next[sid].teamwork &&
              !next[sid].notes;

            if (wasEmpty) {
              next[sid] = hydrateFromServerSignup(s);
            }
          }

          return next;
        });
      } catch (e) {
        if (!alive) return;
        setLoadError(
          typeof e?.message === "string" ? e.message : "שגיאה בטעינת הדף"
        );
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
        // ✅ בעריכה אנחנו מסמנים שהמצב "לא שמור" עד שמבצעים שמירה מחדש
        saved: false,
        error: "",
      },
    }));
  }

  function validateOne(r) {
  if (!r.reliability || !r.execution || !r.teamwork) {
    return "חובה לדרג 1–5 בכל הקריטריונים";
  }
  return "";
}

  async function saveOne(signup) {
    const sid = signup.id;
    console.log("SAVE CLICK", {
    sid,
    volunteer: signup.volunteer_name,
  });
    const r = ratings[sid] || emptyRating();

    const err = validateOne(r);
    if (err) {
      updateRating(sid, { error: err });
      return false;
    }

    setRatings((prev) => ({
      ...prev,
      [sid]: {
        ...(prev[sid] || emptyRating()),
        saving: true,
        error: "",
      },
    }));

    try {
      // ✅ payload שמותאם ל-RateSignupSerializer שלך
      const payload = {
          signup_id: sid,
          rating_reliability: Number(r.reliability),
          rating_execution: Number(r.execution),
          rating_teamwork: Number(r.teamwork),
        };

        // אופציונלי – רק אם מולא:
        if (r.role) payload.role = r.role;
        if (r.hours) payload.hours = r.hours;
        if (r.taskDesc) payload.task_desc = r.taskDesc;
        if (r.notes) payload.notes = r.notes;

      const res = await apiFetch(SAVE_RATING_ENDPOINT(eventId), {
        method: "POST",
        body: payload,
      });

      // ✅ אחרי שמירה: נעדכן state לפי מה שהשרת החזיר (אם החזיר)
      // אם השרת לא מחזיר את השדות האלה עדיין, עדיין נסמן saved true.
      const nextPatch = {
        saving: false,
        saved: true,
        error: "",
      };

      if (res && typeof res === "object") {
        // אם החזרת ב-response את rating + rated_at:
        if (res.rating != null) nextPatch.ratingAvg = res.rating;
        if (res.rated_at != null) nextPatch.ratedAt = res.rated_at;

        // אם החזרת גם את השדות עצמם (מומלץ) — ניישר קו
        if (res.rating_reliability != null) nextPatch.reliability = String(res.rating_reliability);
        if (res.rating_execution != null) nextPatch.execution = String(res.rating_execution);
        if (res.rating_teamwork != null) nextPatch.teamwork = String(res.rating_teamwork);

        if (res.role != null) nextPatch.role = res.role;
        if (res.task_desc != null) nextPatch.taskDesc = res.task_desc;
        if (res.hours != null) nextPatch.hours = res.hours;
        if (res.notes != null) nextPatch.notes = res.notes;
      }

      setRatings((prev) => ({
        ...prev,
        [sid]: {
          ...(prev[sid] || emptyRating()),
          ...nextPatch,
        },
      }));

      return true;
    } catch (e) {
      setRatings((prev) => ({
        ...prev,
        [sid]: {
          ...(prev[sid] || emptyRating()),
          saving: false,
          error: typeof e?.message === "string" ? e.message : "שמירה נכשלה",
        },
      }));
      return false;
    }
  }

  const progress = useMemo(() => {
    const total = signups.length;
    if (!total) return { total: 0, done: 0, left: 0 };
    const done = signups.reduce(
      (acc, s) => acc + (ratings[s.id]?.saved ? 1 : 0),
      0
    );
    return { total, done, left: Math.max(0, total - done) };
  }, [signups, ratings]);

  async function saveAll() {
    if (!signups.length) return;
    setSavingAll(true);

    // אם את רוצה לשמור תמיד את כולם (גם שכבר שמורים) כדי לעדכן — תשני את השורה הבאה:
    // const targets = signups;
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
                          {r.saved ? (
                            <span className="vrOk">נשמר ✅</span>
                          ) : (
                            <span className="vrPending">טרם נשמר</span>
                          )}

                          {r.ratingAvg != null ? (
                            <span className="vrMuted"> · ממוצע: {r.ratingAvg}</span>
                          ) : null}

                          {r.ratedAt ? (
                            <span className="vrMuted"> · עודכן: {new Date(r.ratedAt).toLocaleString("he-IL")}</span>
                          ) : null}

                          {r.error ? <span className="vrErr"> · {r.error}</span> : null}
                        </div>
                      </div>
                        {r.error ? (
                          <div className="vrInlineError" role="alert">
                            ⚠️ {r.error}
                          </div>
                        ) : null}
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
                          {r.saving ? "שומר…" : r.saved ? "עדכן" : "שמור"}
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

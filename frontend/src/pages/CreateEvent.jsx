import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

/**
 * CreateEvent.jsx (בלי Navbar)
 * מבוסס על create-event.html :contentReference[oaicite:1]{index=1}
 *
 * עתידי: יצירת אירוע דרך API (POST לשרת).
 * הערה: אם אין VITE_API_BASE_URL או שאין חיבור לשרת/DB — לא נשלח POST ונציג הודעה.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

async function fetchJson(path, { token, method = "GET", body } = {}) {
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
    const isHtml = typeof data === "string" && data.toLowerCase().includes("<!doctype html");
    const msg =
      (data && data.detail) ||
      (typeof data === "string" && data) ||
      (isHtml ? `Not Found: ${path}` : `Request failed (${res.status})`);
    throw new Error(msg);
  }
  return data;
}

function makeEventId(data) {
  // אותו רעיון כמו ב-HTML: מזהה “דמו” מקומי לצורך סטטוס בפרונט
  const raw = `${data.title}|${data.date}|${data.time}|${data.location}|${data.category}`;
  try {
    return btoa(unescape(encodeURIComponent(raw))).slice(0, 32);
  } catch {
    return String(Date.now());
  }
}

function isCreated(eventId) {
  return localStorage.getItem(`eventCreated:${eventId}`) === "1";
}

export default function CreateEvent() {
  const token = localStorage.getItem("accessToken") || "";

  const cityOptions = useMemo(() => ["תל אביב", "ירושלים", "באר שבע", "חיפה"], []);
  const categoryOptions = useMemo(() => ["ילדים", "חלוקת מזון", "קשישים", "סביבה", "אחר"], []);

  const [form, setForm] = useState({
    date: "",
    time: "",
    location: "",
    title: "",
    category: "",
    description: "",
    needed: "",
  });

  const [preview, setPreview] = useState(null); // data after "preview"
  const [currentEventId, setCurrentEventId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [statusText, setStatusText] = useState("כדי ליצור אירוע, קודם בצע/י תצוגה מקדימה.");

  const created = currentEventId ? isCreated(currentEventId) : false;

  const onChange = (key) => (e) => {
    const value = e.target.value;
    setForm((p) => ({ ...p, [key]: value }));
  };

  const validate = () => {
    if (!form.date) return "נא לבחור תאריך";
    if (!form.time) return "נא לבחור שעה";
    if (!form.location) return "נא לבחור מיקום";
    if (!form.title.trim()) return "נא להזין כותרת";
    if (!form.category) return "נא לבחור קטגוריה";
    if (!form.description.trim()) return "נא להזין תיאור";
    if (!form.needed || Number(form.needed) < 1) return "נא להזין כמות מתנדבים רצויה (לפחות 1)";
    return "";
  };

  const handlePreview = (e) => {
    e.preventDefault();
    setErr("");

    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    const data = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      needed: String(form.needed),
    };

    const id = makeEventId(data);
    setCurrentEventId(id);
    setPreview(data);

    if (isCreated(id)) {
      setStatusText("האירוע קיים כעת בפרונט (הדגמה בלבד).");
    } else {
      setStatusText("לחץ כדי ליצור את האירוע בפרונט / דרך ה-API (כשתחברי).");
    }
  };

  const handleReset = () => {
    setForm({
      date: "",
      time: "",
      location: "",
      title: "",
      category: "",
      description: "",
      needed: "",
    });
    setPreview(null);
    setCurrentEventId(null);
    setErr("");
    setStatusText("כדי ליצור אירוע, קודם בצע/י תצוגה מקדימה.");
  };

  const handleCreate = async () => {
    if (!preview || !currentEventId) return;

    setErr("");
    setLoading(true);

    try {
      // הערה: הנתונים אמורים להישלח ל-DB דרך API.
      // אם אין API_BASE או שאין endpoint מחובר עדיין — לא נשלח POST בפועל.
      if (!API_BASE) {
        localStorage.setItem(`eventCreated:${currentEventId}`, "1");
        setStatusText("אין חיבור לשרת (VITE_API_BASE_URL לא מוגדר) — יצירה נשמרה מקומית כדמו בלבד.");
        return;
      }

      /**
       * TODO: להתאים ל-endpoint האמיתי שלך ליצירת אירוע (בדרך כלל):
       * POST /api/events/
       * payload משוער (תשני לפי המודל שלך ב-Django):
       * {
       *   title, description, category, location,
       *   date, time,
       *   needed_volunteers: number
       * }
       */
      const payload = {
        title: preview.title,
        description: preview.description,
        category: preview.category,
        location: preview.location,
        date: preview.date,
        time: preview.time,
        needed_volunteers: Number(preview.needed),
      };

      // ⚠️ אם ה-DRF שלך דורש slash בסוף:
      const data = await fetchJson("/api/events/", {
        token,
        method: "POST",
        body: payload,
      });

      // אם הצליח בשרת — נסמן מקומי גם כדי לשקף UI
      localStorage.setItem(`eventCreated:${currentEventId}`, "1");
      setStatusText("האירוע נוצר ✅ (נשלח לשרת בהצלחה)");

      // אם השרת מחזיר id לאירוע, אפשר לתת לינק
      // לדוגמה: data.id
      // (לא חובה, אבל נחמד)
    } catch (e) {
      setErr(e?.message || "שגיאה ביצירת אירוע");
      setStatusText("נכשלה יצירת האירוע. בדקי חיבור/endpoint/שדות.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="page">
        <section className="card">
          <h1 className="h1">הקמת אירוע</h1>
          <p className="h2">מלא/י את הפרטים, בדוק/י תצוגה מקדימה ואז צור/י אירוע</p>

          {err ? (
            <div className="box boxPad" style={{ borderColor: "rgba(239,68,68,.35)", marginBottom: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>אופס 😅</div>
              <div style={{ color: "var(--muted)", fontWeight: 800, lineHeight: 1.8 }}>{err}</div>
            </div>
          ) : null}

          <form onSubmit={handlePreview}>
            <div className="grid">
              <div>
                <div className="label">תאריך</div>
                <div className="field">
                  <span>📅</span>
                  <input type="date" required value={form.date} onChange={onChange("date")} />
                </div>
              </div>

              <div>
                <div className="label">שעה</div>
                <div className="field">
                  <span>⏰</span>
                  <input type="time" required value={form.time} onChange={onChange("time")} />
                </div>
              </div>
            </div>

            <div className="label">מיקום</div>
            <div className="field">
              <span>📍</span>
              <select required value={form.location} onChange={onChange("location")}>
                <option value="" disabled>
                  בחר/י עיר
                </option>
                {cityOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="label">כותרת לאירוע</div>
            <div className="field">
              <span>🧾</span>
              <input
                type="text"
                placeholder="למשל: חלוקת מזון למשפחות"
                required
                value={form.title}
                onChange={onChange("title")}
              />
            </div>

            <div className="label">קטגוריה</div>
            <div className="field">
              <span>🏷️</span>
              <select required value={form.category} onChange={onChange("category")}>
                <option value="" disabled>
                  בחר/י קטגוריה
                </option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="label">תיאור האירוע</div>
            <div className="field">
              <span>📝</span>
              <textarea
                rows={4}
                placeholder="פרטים חשובים: מה להביא, נקודת מפגש, למי לפנות..."
                required
                value={form.description}
                onChange={onChange("description")}
              />
            </div>

            <div className="label">כמות מתנדבים רצויה</div>
            <div className="field">
              <span>👥</span>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="למשל: 12"
                required
                value={form.needed}
                onChange={onChange("needed")}
              />
            </div>

            <div className="actions">
              <button className="btnPrimary" type="submit" disabled={loading}>
                תצוגה מקדימה
              </button>
              <button className="btnGhost" type="button" onClick={handleReset} disabled={loading}>
                איפוס
              </button>
            </div>
          </form>

          <div className="sep">תצוגה מקדימה + יצירה</div>

          <div className="preview" aria-live="polite">
            <h3 className="previewTitle">
              {preview?.title ? preview.title : "עדיין לא נוצר אירוע"}
            </h3>

            <div className="badgeRow">
              <span className="badge">קטגוריה: {preview?.category || "—"}</span>
              <span className="badge">מיקום: {preview?.location || "—"}</span>
              <span className="badge">דרושים: {preview?.needed ? `${preview.needed} מתנדבים` : "—"}</span>
            </div>

            <div className="previewMeta">
              <div>תאריך: {preview?.date || "—"}</div>
              <div>שעה: {preview?.time || "—"}</div>
            </div>

            <div>תיאור: {preview?.description || "—"}</div>

            <button
              className={`btnCreate ${created ? "btnCreated" : ""}`}
              type="button"
              disabled={!preview || loading}
              onClick={handleCreate}
            >
              {created ? "האירוע נוצר ✅" : loading ? "יוצר..." : "צור אירוע"}
            </button>

            <div className="status">{statusText}</div>

            <div style={{ marginTop: 12 }}>
              <Link className="btnGhost" to="/dashboard">
                חזרה לאזור אישי
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer__bottom">
          <span>© 2025 VolunTrack</span>
        </div>
      </footer>
    </>
  );
}

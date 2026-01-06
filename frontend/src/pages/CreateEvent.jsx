import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/**
 * CreateEvent.jsx (בלי Navbar)
 * מותאם למודל/API:
 * POST /api/events/
 * payload:
 * { title, description, category, location, date, time, needed_volunteers }
 *
 * הערה: אם אין VITE_API_BASE_URL או שאין accessToken (לא מחוברת) — לא נשלח POST.
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
    // אם השרת מחזיר HTML 404 (לא API) – נציג הודעה נקייה
    const isHtml = typeof data === "string" && data.toLowerCase().includes("<!doctype html");
    const msg =
      (data && data.detail) ||
      (typeof data === "string" && data) ||
      (isHtml ? `Not Found: ${path}` : `Request failed (${res.status})`);
    throw new Error(msg);
  }

  return data;
}

export default function CreateEvent() {
  const navigate = useNavigate();

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
    needed_volunteers: 1,
  });

  const [preview, setPreview] = useState(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

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
    const n = Number(form.needed_volunteers);
    if (!Number.isFinite(n) || n < 1) return "נא להזין כמות מתנדבים (לפחות 1)";
    return "";
  };

  const handlePreview = (e) => {
    e.preventDefault();
    setErr("");
    setInfo("");

    const v = validate();
    if (v) return setErr(v);

    setPreview({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      location: form.location,
      date: form.date, // "YYYY-MM-DD"
      time: form.time, // "HH:MM"
      needed_volunteers: Number(form.needed_volunteers),
    });
  };

  const handleReset = () => {
    setForm({
      date: "",
      time: "",
      location: "",
      title: "",
      category: "",
      description: "",
      needed_volunteers: 1,
    });
    setPreview(null);
    setErr("");
    setInfo("");
  };

  const handleCreate = async () => {
    setErr("");
    setInfo("");

    if (!preview) return;

    // הערה: יצירת אירוע דורשת משתמש מחובר + Role=ORG (השרת יאכוף עם IsOrganization).
    if (!token) {
      setErr("כדי ליצור אירוע צריך להתחבר כעמותה.");
      return;
    }

    if (!API_BASE) {
      setErr("אין חיבור לשרת (VITE_API_BASE_URL לא מוגדר).");
      return;
    }

    setCreating(true);
    try {
      // ✅ זה ה-payload המדויק לפי המודל
      const created = await fetchJson("/api/events/", {
        token,
        method: "POST",
        body: preview,
      });

      setInfo("האירוע נוצר בהצלחה ✅");

      // אם השרת מחזיר id, אפשר להפנות לאירוע
      const id = created?.id;
      setTimeout(() => {
        if (id) navigate(`/events/${id}`);
        else navigate("/dashboard");
      }, 400);
    } catch (e) {
      setErr(e?.message || "שגיאה ביצירת אירוע");
    } finally {
      setCreating(false);
    }
  };

  // אם אין token – נציג CTA להתחברות/הרשמה (במקום לקרוס)
  if (!token) {
    return (
      <>
        <main className="page">
          <div className="container">
            <div className="box boxPad">
              <h1 style={{ margin: 0, fontWeight: 900 }}>יצירת אירוע</h1>
              <p style={{ margin: "10px 0 0", color: "var(--muted)", fontWeight: 800, lineHeight: 1.8 }}>
                כדי ליצור אירוע צריך להתחבר כעמותה.
                {/* הערה: השרת יאכוף Role=ORG דרך IsOrganization */}
              </p>

              <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link className="btnSmall" to="/auth">
                  התחברות
                </Link>
                <Link className="btnSmall" to="/signup">
                  הרשמה
                </Link>
                <Link className="btnGhost" to="/">
                  חזרה לדף הבית
                </Link>
              </div>
            </div>
          </div>
        </main>

        <footer className="footer">
          <div className="container footer__bottom">
            <span>© 2025 VolunTrack</span>
          </div>
        </footer>
      </>
    );
  }

  return (
    <>
      <main className="page">
        <section className="card">
          <h1 className="h1">הקמת אירוע</h1>
          <p className="h2">מלא/י פרטים → תצוגה מקדימה → יצירה</p>

          {err ? (
            <div className="box boxPad" style={{ borderColor: "rgba(239,68,68,.35)", marginBottom: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>אופס 😅</div>
              <div style={{ color: "var(--muted)", fontWeight: 800, lineHeight: 1.8 }}>{err}</div>
            </div>
          ) : info ? (
            <div className="box boxPad" style={{ borderColor: "rgba(34,197,94,.35)", marginBottom: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>הצלחה</div>
              <div style={{ color: "var(--muted)", fontWeight: 800, lineHeight: 1.8 }}>{info}</div>
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
                required
                value={form.needed_volunteers}
                onChange={onChange("needed_volunteers")}
              />
            </div>

            <div className="actions">
              <button className="btnPrimary" type="submit" disabled={creating}>
                תצוגה מקדימה
              </button>
              <button className="btnGhost" type="button" onClick={handleReset} disabled={creating}>
                איפוס
              </button>
            </div>
          </form>

          <div className="sep">תצוגה מקדימה + יצירה</div>

          <div className="preview" aria-live="polite">
            <h3 className="previewTitle">{preview?.title || "עדיין אין תצוגה"}</h3>

            <div className="badgeRow">
              <span className="badge">קטגוריה: {preview?.category || "—"}</span>
              <span className="badge">מיקום: {preview?.location || "—"}</span>
              <span className="badge">
                דרושים: {preview?.needed_volunteers ? `${preview.needed_volunteers} מתנדבים` : "—"}
              </span>
            </div>

            <div className="previewMeta">
              <div>תאריך: {preview?.date || "—"}</div>
              <div>שעה: {preview?.time || "—"}</div>
            </div>

            <div>תיאור: {preview?.description || "—"}</div>

            <button className="btnCreate" type="button" disabled={!preview || creating} onClick={handleCreate}>
              {creating ? "יוצר..." : "צור אירוע"}
            </button>

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

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/**
 * Signup.jsx (בלי Navbar)
 * מבוסס על signup.html שלך (בחירה org/volunteer + שדות מותנים). :contentReference[oaicite:1]{index=1}
 *
 * הנתונים אמורים להישלח ל-DB דרך API.
 * הערה: אם אין VITE_API_BASE_URL מוגדר או שהשרת לא זמין — לא נשלח POST ונציג הודעה.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

/** POST JSON helper */
async function postJson(path, body, { signal } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
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

export default function Signup() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("org"); // "org" | "volunteer"
  const isOrg = mode === "org";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // org
  const [orgName, setOrgName] = useState("");
  const [orgDesc, setOrgDesc] = useState("");

  // volunteer
  const [fullName, setFullName] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const validate = () => {
    if (!email.trim()) return "נא להזין מייל";
    if (!password || password.length < 6) return "הסיסמה חייבת להיות לפחות 6 תווים";

    if (isOrg) {
      if (!orgName.trim()) return "נא להזין שם עמותה";
      if (!orgDesc.trim()) return "נא להזין תיאור עמותה";
    } else {
      if (!fullName.trim()) return "נא להזין שם מלא";
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setInfo("");

    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    // הערה: הנתונים אמורים להישלח ל-DB דרך API.
    // אם אין API_BASE, כנראה לא הוגדר VITE_API_BASE_URL או אין חיבור לשרת.
    if (!API_BASE) {
      setInfo("אין חיבור לשרת (VITE_API_BASE_URL לא מוגדר). כרגע הטופס מוכן לחיבור API בלבד.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = isOrg ? "/api/auth/register/org/" : "/api/auth/register/volunteer/";

      // payload: אני שולח payload “סביר”.
      // אם השרת שלך מצפה לשמות שדות אחרים (למשל organization_name וכו׳) – תגידי לי ואעדכן.
      const payload = isOrg
        ? {
            email,
            password,
            org_name: orgName,
            org_description: orgDesc,
          }
        : {
            email,
            password,
            full_name: fullName,
          };

      const data = await postJson(endpoint, payload);

      // אם השרת מחזיר טוקנים/משתמש:
      // אם הוא מחזיר { access, refresh } אפשר לשמור:
      if (data?.access) localStorage.setItem("accessToken", data.access);
      if (data?.refresh) localStorage.setItem("refreshToken", data.refresh);

      setInfo("נרשמת בהצלחה! מעביר/ה...");
      setTimeout(() => {
        // אם שמרנו access, אפשר לעבור לדאשבורד, אחרת ללוגין
        navigate(data?.access ? "/dashboard" : "/auth");
      }, 350);
    } catch (e2) {
      setErr(e2?.message || "שגיאה בהרשמה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="auth">
        <section className="panel">
          <h1 className="h1">יצירת משתמש</h1>
          <p className="h2">מלא/י פרטים כדי להמשיך</p>

          {err ? (
            <div className="box boxPad" style={{ borderColor: "rgba(239,68,68,.35)", marginBottom: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>אופס 😅</div>
              <div style={{ color: "var(--muted)", fontWeight: 800, lineHeight: 1.8 }}>{err}</div>
            </div>
          ) : info ? (
            <div className="box boxPad" style={{ borderColor: "rgba(34,197,94,.35)", marginBottom: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>הודעה</div>
              <div style={{ color: "var(--muted)", fontWeight: 800, lineHeight: 1.8 }}>{info}</div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div className="label">מייל</div>
            <div className="field">
              <span>✉</span>
              <input
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="label">סיסמה</div>
            <div className="field">
              <span>🔒</span>
              <input
                type="password"
                minLength={6}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="label">סוג משתמש</div>

            <label className="radioLine">
              <input type="radio" name="type" value="org" checked={mode === "org"} onChange={() => setMode("org")} />
              ארגון / עמותה
            </label>

            <label className="radioLine">
              <input
                type="radio"
                name="type"
                value="volunteer"
                checked={mode === "volunteer"}
                onChange={() => setMode("volunteer")}
              />
              מתנדב
            </label>

            {isOrg ? (
              <div id="orgFields">
                <div className="label">שם העמותה</div>
                <div className="field">
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="לדוגמה: לתת עתיד"
                  />
                </div>

                <div className="label">תיאור העמותה</div>
                <div className="field">
                  <textarea
                    rows={3}
                    required
                    value={orgDesc}
                    onChange={(e) => setOrgDesc(e.target.value)}
                    placeholder="כמה משפטים על מה העמותה עושה…"
                  />
                </div>
              </div>
            ) : (
              <div id="volunteerFields">
                <div className="label">שם מלא</div>
                <div className="field">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="שם פרטי ושם משפחה"
                  />
                </div>
              </div>
            )}

            <button className="btnPrimary" type="submit" disabled={loading}>
              {loading ? "שולח..." : "צור משתמש"}
            </button>

            <div className="links">
              כבר יש לך משתמש? <Link to="/login">התחברות</Link>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}

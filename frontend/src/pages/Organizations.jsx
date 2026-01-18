import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/organizations.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// fetch helper (מגן גם מפני HTML)
async function fetchJson(path, { token, signal, method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  let data = text;
  if (contentType.includes("application/json")) {
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // נשאיר כטקסט
    }
  }

  if (!res.ok) {
    const looksLikeHtml =
      typeof data === "string" && data.toLowerCase().includes("<!doctype html");
    const msg =
      (data && data.detail) ||
      (looksLikeHtml ? `Endpoint לא נמצא: ${path} (בדקי URL /api/...)` : "") ||
      (typeof data === "string" ? data : "") ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

// מזהה שדה תרומה אפשרי מה-API (תמיכה בכמה שמות)
function pickDonationUrl(o) {
  return (
    o?.donation_url ||
    o?.donate_url ||
    o?.donationLink ||
    o?.donateLink ||
    o?.donation_page ||
    o?.donations_url ||
    ""
  );
}

function initials(text) {
  const s = (text || "").trim();
  if (!s) return "VT";
  const words = s.split(/\s+/).slice(0, 2);
  return words.map((w) => (w[0] ? w[0].toUpperCase() : "")).join("");
}

export default function Organizations() {
  // דף ציבורי: לא חובה טוקן. אם יש — נשתמש
  const token = localStorage.getItem("accessToken") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [orgs, setOrgs] = useState([]);

  // דמו (למקרה שאין API_BASE)
  const demo = useMemo(
    () => [
      {
        id: "demo-1",
        org_name: "עמותה לדוגמה",
        description: "תיאור קצר על העמותה ומה היא עושה",
        phone: "03-0000000",
        website: "https://example.org",
        city: "תל אביב",
        donation_url: "https://example.com/donate",
      },
      {
        id: "demo-2",
        org_name: "הלב לקהילה",
        description: "מתנדבים, מחלקים, מחבקים. פשוט עושים טוב 💙",
        phone: "",
        website: "",
        city: "חיפה",
      },
      {
        id: "demo-3",
        org_name: "חברים של כולם",
        description: "שילוב חברתי דרך פעילויות קהילתיות בכל הארץ",
        phone: "050-0000000",
        website: "https://example.org",
        city: "",
      },
    ],
    []
  );

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setErr("");

      try {
        if (!API_BASE) {
          setOrgs(demo);
          return;
        }

        const data = await fetchJson("/api/organizations/", {
          token: token || undefined,
          signal: controller.signal,
        });

        const items = Array.isArray(data) ? data : data?.results || [];
        setOrgs(items);
      } catch (e) {
        if (e?.name !== "AbortError") setErr(e?.message || "שגיאה בטעינת עמותות");
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [demo, token]);

  return (
    <main className="page orgs" dir="rtl">
      <div className="container">
        <header className="orgs__hero">
          <div className="orgs__heroTop">
            <div>
              <h1 className="orgs__title">עמותות וארגונים</h1>
              <p className="orgs__sub">הכירו את הארגונים שעושים שינוי אמיתי בחברה הישראלית</p>
            </div>

            <Link className="orgs__pillLink" to="/explore" title="מעבר להתנדבויות">
              🧭 חיפוש התנדבות
            </Link>
          </div>

          <div className="orgs__hintRow">
            <span className="orgs__hint">טיפ: כנסי לפרטי עמותה כדי לראות אירועים קרובים ולתרום בקליק.</span>
          </div>
        </header>

        {err ? (
          <div className="orgs__empty">
            <div className="orgs__emptyEmoji">😅</div>
            <div className="orgs__emptyTitle">אופס</div>
            <div className="orgs__emptyText">{err}</div>
            <div style={{ marginTop: 12 }}>
              <button className="orgs__btnSmall" type="button" onClick={() => window.location.reload()}>
                נסי שוב
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="orgs__empty">
            <div className="orgs__emptyEmoji">⏳</div>
            <div className="orgs__emptyText">טוען עמותות...</div>
          </div>
        ) : !orgs?.length ? (
          <div className="orgs__empty">
            <div className="orgs__emptyEmoji">🏢</div>
            <div className="orgs__emptyText">אין עמותות להצגה כרגע</div>
            <div className="orgs__muted">(ייתכן שה-DB ריק או שעדיין אין חיבור לשרת)</div>
          </div>
        ) : (
          <section className="orgs__grid">
            {orgs.map((o) => {
              const id = o.id ?? o.pk ?? o.user ?? o.user_id ?? o.slug ?? null;

              const name = o.org_name || o.name || o.title || "עמותה";
              const description = o.description || o.about || "אין תיאור כרגע — אבל בטוח עושים טוב 😄";

              const phone = o.phone || "";
              const website = o.website || "";
              const city = o.city || o.location || "";

              const detailsTo = id ? `/organizations/${id}` : null;

              const donationUrl = pickDonationUrl(o);
              const donateToInternal = id ? `/donate/${id}` : "/donate";

              const hasMeta = Boolean(city || phone || website);

              return (
                <article className="orgs__card" key={String(id ?? name)}>
                  <div className="orgs__cardTop">
                    <div className="orgs__avatar" aria-hidden="true">
                      {initials(name)}
                    </div>

                    <div className="orgs__head">
                      <h3 className="orgs__cardTitle">{name}</h3>

                      {hasMeta ? (
                        <div className="orgs__meta">
                          {city ? <span className="orgs__chip">📍 {city}</span> : null}
                          {phone ? <span className="orgs__chip">☎️ {phone}</span> : null}
                          {website ? (
                            <a className="orgs__chip orgs__chipLink" href={website} target="_blank" rel="noreferrer">
                              🌐 אתר
                            </a>
                          ) : null}
                        </div>
                      ) : (
                        <div className="orgs__meta">
                          <span className="orgs__chip">✨ ארגון קהילתי</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="orgs__desc">{description}</p>

                  <div className="orgs__actions">
                    {detailsTo ? (
                      <Link className="orgs__btnSmall" to={detailsTo}>
                        לפרטי עמותה
                      </Link>
                    ) : (
                      <button className="orgs__btnSmall" type="button" disabled title="אין מזהה עמותה מה-DB">
                        לפרטי עמותה
                      </button>
                    )}

                    <Link className="orgs__btnSmall" to="/explore">
                      למצוא התנדבות
                    </Link>

                    {donationUrl ? (
                      <a className="orgs__btnSmall orgs__btnCta" href={donationUrl} target="_blank" rel="noreferrer">
                        לתרומה 💝
                      </a>
                    ) : (
                      <Link className="orgs__btnSmall orgs__btnCta" to={donateToInternal}>
                        לתרומה 💝
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

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
        phone: "",
        website: "",
        donation_url: "https://example.com/donate", // 👈 דמו
      },
      {
        id: "demo-2",
        org_name: "עמותה לדוגמה",
        description: "תיאור קצר על העמותה ומה היא עושה",
        phone: "",
        website: "",
      },
      {
        id: "demo-3",
        org_name: "עמותה לדוגמה",
        description: "תיאור קצר על העמותה ומה היא עושה",
        phone: "",
        website: "",
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
    <main className="page">
      <div className="container">
        <h1 className="pageTitle">עמותות וארגונים</h1>
        <p className="pageSub">הכירו את הארגונים שעושים שינוי אמיתי בחברה הישראלית</p>

        {err ? (
          <div className="box boxPad" style={{ borderColor: "rgba(239,68,68,.35)" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>אופס 😅</div>
            <div style={{ color: "var(--muted)", fontWeight: 800, lineHeight: 1.8 }}>{err}</div>
            <div style={{ marginTop: 12 }}>
              <button className="btnSmall" type="button" onClick={() => window.location.reload()}>
                נסי שוב
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="emptyState">
            <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
            טוען עמותות...
          </div>
        ) : !orgs?.length ? (
          <div className="emptyState">
            <div style={{ fontSize: 28, marginBottom: 10 }}>🏢</div>
            אין עמותות להצגה כרגע
            <br />
            <span style={{ display: "inline-block", marginTop: 8, color: "var(--muted)", fontWeight: 800 }}>
              (ייתכן שה-DB ריק או שעדיין אין חיבור לשרת)
            </span>
          </div>
        ) : (
          <div className="grid3">
            {orgs.map((o) => {
              const id = o.id ?? o.pk ?? o.user ?? o.user_id ?? o.slug ?? null;

              const name = o.org_name || o.name || o.title || "עמותה";
              const description = o.description || o.about || "—";

              const phone = o.phone || "";
              const website = o.website || "";

              const detailsTo = id ? `/organizations/${id}` : null;

              // ✅ תרומה
              const donationUrl = pickDonationUrl(o);
              const donateToInternal = id ? `/donate/${id}` : "/donate"; // fallback

              return (
                <article className="card" key={String(id ?? name)}>
                  <div className="card__thumb" />
                  <div className="card__body">
                    <h3 className="card__title">{name}</h3>
                    <p className="card__meta">{description}</p>

                    {(phone || website) && (
                      <div style={{ marginTop: 10, color: "var(--muted)", fontWeight: 800, lineHeight: 1.8 }}>
                        {phone ? <div>טלפון: {phone}</div> : null}
                        {website ? (
                          <div>
                            אתר:{" "}
                            <a href={website} target="_blank" rel="noreferrer">
                              {website}
                            </a>
                          </div>
                        ) : null}
                      </div>
                    )}

                    <div className="card__actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {detailsTo ? (
                        <Link className="btnSmall" to={detailsTo}>
                          לפרטי עמותה
                        </Link>
                      ) : (
                        <button className="btnSmall" type="button" disabled title="אין מזהה עמותה מה-DB">
                          לפרטי עמותה
                        </button>
                      )}

                      <Link className="btnSmall" to="/explore">
                        למצוא התנדבות
                      </Link>

                      {/* ✅ כפתור תרומה */}
                      {donationUrl ? (
                        <a className="btnSmall" href={donationUrl} target="_blank" rel="noreferrer">
                          לתרומה 💝
                        </a>
                      ) : (
                        <Link className="btnSmall" to={donateToInternal}>
                          לתרומה 💝
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

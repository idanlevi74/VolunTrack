import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// fetch helper
async function fetchJson(path, { token, signal, method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
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
    const msg =
      (data && data.detail) ||
      (typeof data === "string" && data) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export default function Organizations() {
  const token = localStorage.getItem("accessToken") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [orgs, setOrgs] = useState([]);

  // דמו (רק למקרה שאין API)
  const demo = useMemo(
    () => [
      {
        id: "demo-1",
        name: "שם עמותה",
        description: "תיאור קצר על העמותה ומה היא עושה",
        details_url: null,
      },
      {
        id: "demo-2",
        name: "שם עמותה",
        description: "תיאור קצר על העמותה ומה היא עושה",
        details_url: null,
      },
      {
        id: "demo-3",
        name: "שם עמותה",
        description: "תיאור קצר על העמותה ומה היא עושה",
        details_url: null,
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
        // הערה: אם אין API_BASE (אין קישור לשרת) -> נציג דמו + הודעת Empty State מתאימה
        if (!API_BASE) {
          // אפשר גם להשאיר [] כדי לראות את ה-empty-state בפועל
          setOrgs(demo);
          return;
        }

        /**
         * הערה: ודאי שה-endpoint קיים אצלך.
         * מומלץ ב-DRF לשים / בסוף:
         * GET /api/organizations/
         * החזרה מומלצת:
         * [
         *  { "id": 1, "name": "...", "description": "...", "logo": "...", "slug": "..." }
         * ]
         */
        const data = await fetchJson("/api/organizations/", {
          token,
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
    <>
      <main className="page">
        <div className="container">
          <h1 className="pageTitle">עמותות וארגונים</h1>
          <p className="pageSub">הכירו את הארגונים שעושים שינוי אמיתי בחברה הישראלית</p>

          {err ? (
            <div className="box boxPad" style={{ borderColor: "rgba(239,68,68,.35)" }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>אופס 😅</div>
              <div style={{ color: "var(--muted)", fontWeight: 800, lineHeight: 1.8 }}>
                {err}
              </div>
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
              {/* הערה: אם ה-DB ריק או ה-endpoint מחזיר מערך ריק — זה יופיע כאן */}
              <span style={{ display: "inline-block", marginTop: 8, color: "var(--muted)", fontWeight: 800 }}>
                (ייתכן שה-DB ריק או שעדיין אין חיבור לשרת)
              </span>
            </div>
          ) : (
            <div className="grid3">
              {orgs.map((o) => {
                const id = o.id ?? o.pk ?? o.slug;
                const name = o.name || o.title || "עמותה";
                const description = o.description || o.about || "—";

                // אם יש לך route של פרטי עמותה, עדיף להשתמש בו:
                // למשל: /organizations/:id
                const detailsTo = id ? `/organizations/${id}` : null;

                return (
                  <article className="card" key={String(id ?? name)}>
                    <div className="card__thumb" />
                    <div className="card__body">
                      <h3 className="card__title">{name}</h3>
                      <p className="card__meta">{description}</p>

                      <div className="card__actions">
                        {detailsTo ? (
                          <Link className="btnSmall" to={detailsTo}>
                            לפרטי עמותה
                          </Link>
                        ) : (
                          // הערה: אם אין id/slug מה-DB לא ניתן לבנות לינק לפרטי עמותה
                          <button className="btnSmall" type="button" disabled title="אין מזהה עמותה מה-DB">
                            לפרטי עמותה
                          </button>
                        )}

                        <Link className="btnSmall" to="/explore">
                          למצוא התנדבות
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
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

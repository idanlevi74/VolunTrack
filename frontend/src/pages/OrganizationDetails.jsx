import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "../styles/style.css";
import "../styles/event-details.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// fetch helper (מגן גם מפני HTML) + Authorization רק אם יש token
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

function initials(text) {
  const s = (text || "").trim();
  if (!s) return "VT";
  const words = s.split(/\s+/).slice(0, 2);
  return words.map((w) => (w[0] ? w[0].toUpperCase() : "")).join("");
}

function formatDateIL(dateStr) {
  if (!dateStr) return "";
  try {
    return new Intl.DateTimeFormat("he-IL", { dateStyle: "medium" }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload?.results && Array.isArray(payload.results)) return payload.results;
  return [];
}

export default function OrganizationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // דף ציבורי: לא חובה טוקן
  const token = localStorage.getItem("accessToken") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [org, setOrg] = useState(null);

  // ✅ אירועים של העמותה
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsErr, setEventsErr] = useState("");
  const [events, setEvents] = useState([]);

  // דמו (אם אין API_BASE)
  const demoOrg = useMemo(
    () => ({
      id,
      org_name: "עמותה לדוגמה",
      description:
        "תיאור קצר על העמותה ומה היא עושה. כאן יופיע מידע על המטרות, הפעילות וההשפעה שלה בקהילה.",
      phone: "03-0000000",
      website: "https://example.org",
      email: "info@example.org",
      city: "תל אביב",
    }),
    [id]
  );

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setErr("");

      try {
        if (!id) throw new Error("חסר מזהה עמותה בכתובת");

        if (!API_BASE) {
          setOrg(demoOrg);
          return;
        }

        // ✅ ציבורי: אין חובה בטוקן כדי לצפות בעמותה
        const data = await fetchJson(`/api/organizations/${id}/`, {
          token: token || undefined,
          signal: controller.signal,
        });

        setOrg(data);
      } catch (e) {
        // fallback: אם אין endpoint לפרטי עמותה, נביא רשימה ונמצא לפי id
        try {
          if (!API_BASE) throw e;

          const list = await fetchJson(`/api/organizations/`, {
            token: token || undefined,
            signal: controller.signal,
          });

          const items = asList(list);
          const found = items.find((x) => String(x.id ?? x.pk ?? "") === String(id));
          if (!found) throw e;

          setOrg(found);
        } catch (e2) {
          if (e2?.name !== "AbortError") setErr(e2?.message || e?.message || "שגיאה בטעינת עמותה");
        }
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [demoOrg, id, token]);

  const normalized = useMemo(() => {
    if (!org) return null;

    const name = org.org_name || org.name || org.title || "עמותה";
    const description = org.description || org.about || "";
    const phone = org.phone || "";
    const website = org.website || "";
    const email = org.email || org.contact_email || "";
    const city = org.city || "";
    const orgId = org.id ?? org.pk ?? id;

    return { id: orgId, name, description, phone, website, email, city };
  }, [org, id]);

  // ✅ טעינת אירועים קרובים של העמותה
  useEffect(() => {
    const controller = new AbortController();

    async function loadOrgEvents() {
      setEventsLoading(true);
      setEventsErr("");

      try {
        if (!normalized?.id) return;

        // דמו
        if (!API_BASE) {
          setEvents([
            {
              id: 101,
              title: "חלוקת סלי מזון",
              date: "2026-02-01",
              time: "10:00",
              location: "תל אביב",
              city: "תל אביב",
              needed_volunteers: 20,
              org_name: normalized.name,
            },
            {
              id: 102,
              title: "איסוף תרומות ציוד",
              date: "2026-02-10",
              time: "17:30",
              location: "רמת גן",
              city: "רמת גן",
              needed_volunteers: 12,
              org_name: normalized.name,
            },
          ]);
          return;
        }

        // אצלך בדjango כרגע אין פילטר organization מובנה לאורחים,
        // אז ננסה כמה URL-ים נפוצים; אם אף אחד לא יעבוד נעשה fallback של list+filter בצד לקוח.
        const todayStr = new Date().toISOString().slice(0, 10);

        const tryUrls = [
          // ✅ זה היעד הרצוי (אם תוסיפי בדjango תמיכה בפרמטר organization):
          `/api/events/?organization=${normalized.id}&status=upcoming`,

          // וריאציות נפוצות
          `/api/events/?organization=${normalized.id}&date__gte=${todayStr}`,
          `/api/events/?organization=${normalized.id}&upcoming=1`,
          `/api/events/?status=upcoming&organization=${normalized.id}`,
        ];

        let payload = null;
        let lastErr = null;

        for (const url of tryUrls) {
          try {
            payload = await fetchJson(url, {
              token: token || undefined,
              signal: controller.signal,
            });
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
          }
        }

        let items = payload ? asList(payload) : null;

        // ✅ fallback: תביאי את כל האירועים ותסנני מקומית לפי organization=id
        if (!items) {
          const all = await fetchJson(`/api/events/`, {
            token: token || undefined,
            signal: controller.signal,
          });
          items = asList(all);

          // אצלך באירוע כנראה organization זה user id של העמותה
          items = items.filter((ev) => {
            const orgId = ev.organization ?? ev.organization_id ?? ev.org_id ?? null;
            return String(orgId ?? "") === String(normalized.id);
          });
        }

        // ✅ סינון “קרובים” + מיון + הגבלה
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = (items || [])
          .filter((ev) => {
            if (!ev?.date) return true;
            const d = new Date(ev.date);
            return d >= today;
          })
          .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))
          .slice(0, 6);

        setEvents(upcoming);

        // אם ניסינו URLs והם נכשלו, לא נציג שגיאה (כי הצלחנו fallback).
        // אבל אם גם fallback נכשל -> נזרוק שגיאה למטה.
      } catch (e) {
        if (e?.name !== "AbortError") setEventsErr(e?.message || "שגיאה בטעינת אירועים");
      } finally {
        setEventsLoading(false);
      }
    }

    loadOrgEvents();
    return () => controller.abort();
  }, [API_BASE, normalized?.id, normalized?.name, token]);

  const shareText = encodeURIComponent(`מצאתי עמותה ב-VolunTrack: ${normalized?.name || ""}`);
  const shareUrl = encodeURIComponent(window.location.href);

  if (loading) {
    return (
      <main className="page">
        <div className="container">
          <div className="emptyState ed__loading">
            <div className="ed__emoji">⏳</div>
            טוען עמותה...
          </div>
        </div>
      </main>
    );
  }

  if (err || !normalized) {
    return (
      <main className="page">
        <div className="container">
          <div className="box boxPad ed__error">
            <div className="ed__errorTitle">אופס 😅</div>
            <div className="ed__errorText">{err || "העמותה לא נמצאה"}</div>
            <div className="ed__errorActions">
              <button className="btnSmall" type="button" onClick={() => window.location.reload()}>
                נסי שוב
              </button>
              <Link className="btnSmall" to="/organizations">
                חזרה לעמותות
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        {/* breadcrumbs */}
        <div className="ed__crumbs">
          <Link className="section__link" to="/organizations">
            ← חזרה לכל העמותות
          </Link>
          <span className="ed__dot">•</span>
          <Link className="section__link" to="/explore">
            התנדבויות
          </Link>
        </div>

        <section className="ed__card">
          {/* cover */}
          <header className="ed__cover">
            <div className="ed__coverOverlay" />

            <div className="ed__pillsTop">
              {normalized.city ? <span className="ed__pill">📍 {normalized.city}</span> : null}
              <span className="ed__pill">עמותה</span>
            </div>

            <div className="ed__coverBottom">
              <h1 className="ed__title">{normalized.name}</h1>

              <div className="ed__metaRow">
                {normalized.phone ? (
                  <span className="ed__pill ed__pillMeta">☎️ {normalized.phone}</span>
                ) : null}
                {normalized.email ? (
                  <span className="ed__pill ed__pillMeta">✉️ {normalized.email}</span>
                ) : null}
                {normalized.website ? (
                  <span className="ed__pill ed__pillMeta">🌐 אתר</span>
                ) : null}
              </div>
            </div>
          </header>

          {/* body */}
          <div className="ed__body">
            <div className="ed__grid">
              {/* left */}
              <div className="ed__panel">
                <div className="ed__panelTitle">על העמותה</div>

                {normalized.description ? (
                  <p className="ed__desc">{normalized.description}</p>
                ) : (
                  <p className="ed__desc">אין תיאור כרגע — אבל אנחנו בטוחים שעושים טוב 😄</p>
                )}

                {/* links */}
                {(normalized.website || normalized.email) && (
                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    {normalized.website ? (
                      <a className="btnSmall" href={normalized.website} target="_blank" rel="noreferrer">
                        מעבר לאתר העמותה
                      </a>
                    ) : null}
                    {normalized.email ? (
                      <a className="btnSmall" href={`mailto:${normalized.email}`}>
                        שליחת אימייל
                      </a>
                    ) : null}
                  </div>
                )}

                <div className="ed__shareRow" style={{ marginTop: 12 }}>
                  <a
                    className="btnSmall"
                    href={`https://wa.me/?text=${shareText}%20${shareUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    title="שיתוף בווטסאפ"
                  >
                    שיתוף בווטסאפ
                  </a>

                  <button
                    className="btnSmall"
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(window.location.href);
                        alert("🔗 הקישור הועתק!");
                      } catch {
                        alert("לא הצלחתי להעתיק את הקישור 😅");
                      }
                    }}
                  >
                    העתקת קישור
                  </button>
                </div>

                {/* ✅ Upcoming events (בצד שמאל מתחת לתיאור) */}
                <div style={{ marginTop: 16 }}>
                  <div className="ed__panelTitle">אירועים קרובים</div>

                  {eventsLoading ? (
                    <div className="emptyState ed__loading" style={{ marginTop: 10 }}>
                      <div className="ed__emoji">⏳</div>
                      טוען אירועים...
                    </div>
                  ) : eventsErr ? (
                    <div className="box boxPad ed__error" style={{ marginTop: 10 }}>
                      <div className="ed__errorTitle">אופס 😅</div>
                      <div className="ed__errorText">{eventsErr}</div>
                    </div>
                  ) : events.length === 0 ? (
                    <p className="ed__desc" style={{ marginTop: 10 }}>
                      כרגע אין אירועים קרובים לעמותה הזו — אבל זה בדרך 💪
                    </p>
                  ) : (
                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                      {events.map((ev) => (
                        <Link
                          key={ev.id}
                          to={`/events/${ev.id}`}
                          className="box boxPad"
                          style={{ textDecoration: "none", color: "inherit" }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              alignItems: "baseline",
                            }}
                          >
                            <div style={{ fontWeight: 800 }}>{ev.title || "אירוע"}</div>
                            <div style={{ fontSize: 13, opacity: 0.8 }}>
                              {formatDateIL(ev.date)} {ev.time ? `• ${ev.time}` : ""}
                            </div>
                          </div>

                          <div style={{ marginTop: 6, fontSize: 14, opacity: 0.9 }}>
                            {ev.city ? `📍 ${ev.city}` : ev.location ? `📍 ${ev.location}` : null}
                          </div>

                          {typeof ev.needed_volunteers === "number" ? (
                            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                              צריך מתנדבים: {ev.needed_volunteers}
                            </div>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  )}

                  {events.length > 0 ? (
                    <div style={{ marginTop: 10 }}>
                      <Link className="btnSmall" to={`/explore?organization=${normalized.id}`}>
                        לכל האירועים של העמותה →
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* right */}
              <aside className="ed__aside">
                <div className="ed__orgRow">
                  <div className="ed__avatar">{initials(normalized.name)}</div>
                  <div>
                    <div className="ed__orgName">{normalized.name}</div>
                    <div className="ed__orgHint">פרטי עמותה</div>
                  </div>
                </div>

                {/* ✅ CTA: תרומה + התנדבות */}
                <div className="ed__ctaCol">
                  <Link className="btn btn--primary" to={`/donate/${normalized.id}`}>
                    לתרומה 💝
                  </Link>

                  <Link className="btn btn--ghost" to="/explore">
                    למצוא התנדבות
                  </Link>
                </div>

                <div className="ed__quick">
                  <div className="ed__quickTitle">פרטים מהירים</div>
                  <div className="ed__quickList">
                    {normalized.city ? <div>📍 {normalized.city}</div> : null}
                    {normalized.phone ? <div>☎️ {normalized.phone}</div> : null}
                    {normalized.email ? <div>✉️ {normalized.email}</div> : null}
                    {normalized.website ? <div>🌐 {normalized.website}</div> : null}
                  </div>
                </div>

                <div className="ed__quick" style={{ marginTop: 12 }}>
                  <div className="ed__quickTitle">לא מצאת מה חיפשת?</div>
                  <div className="ed__quickList">
                    <button className="btnSmall" type="button" onClick={() => navigate("/organizations")}>
                      חזרה לרשימה
                    </button>
                  </div>
                </div>
              </aside>
            </div>

            <div className="ed__footer">
              <Link className="btnSmall" to="/organizations">
                לעוד עמותות
              </Link>
              <Link className="btnSmall" to="/explore">
                לעוד התנדבויות
              </Link>
              <Link className="btnSmall" to={`/donate/${normalized.id}`}>
                לתרומה לעמותה 💝
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

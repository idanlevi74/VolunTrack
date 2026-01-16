import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/explore-events.css"; // ✅ CSS ייעודי למסך הזה

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

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

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  let data = text;
  if (contentType.includes("application/json")) {
    try {
      data = text ? JSON.parse(text) : null;
    } catch {}
  }

  if (!res.ok) {
    const looksLikeHtml =
      typeof data === "string" && data.toLowerCase().includes("<!doctype html");
    const msg =
      (data && data.detail) ||
      (looksLikeHtml ? `Endpoint לא נמצא: ${path}` : "") ||
      (typeof data === "string" ? data : "") ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("he-IL");
}

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload?.results && Array.isArray(payload.results)) return payload.results;
  return [];
}

export default function ExploreEvents() {
  const token = localStorage.getItem("accessToken") || "";

  const [category, setCategory] = useState("כל הקטגוריות");
  const [location, setLocation] = useState("מיקום");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [events, setEvents] = useState([]);
  const [signupBusyId, setSignupBusyId] = useState(null);
  const [toast, setToast] = useState("");

  // ✅ כאן נשמור את כל ה-event ids שהמשתמש רשום אליהם (נטען לפני כל האירועים)
  const [signedEventIds, setSignedEventIds] = useState(() => new Set());

  const categoriesFromData = useMemo(() => {
    const set = new Set();
    events.forEach((e) => e?.category && set.add(e.category));
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b), "he"));
  }, [events]);

  const locationsFromData = useMemo(() => {
    const set = new Set();
    events.forEach((e) => e?.location && set.add(e.location));
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b), "he"));
  }, [events]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setErr("");
      setToast("");

      try {
        if (!API_BASE) {
          setEvents([]);
          setSignedEventIds(new Set());
          return;
        }

        // ✅ 1) קודם נביא את "האירועים שלי" (upcoming + history) כדי שהכפתור יהיה נכון מיד
        if (token) {
          try {
            const [up, hist] = await Promise.all([
              fetchJson("/api/events/?status=upcoming", {
                token,
                signal: controller.signal,
              }),
              fetchJson("/api/events/?status=history", {
                token,
                signal: controller.signal,
              }),
            ]);

            const myUpcoming = asList(up);
            const myHistory = asList(hist);

            const ids = new Set(
              [...myUpcoming, ...myHistory]
                .map((e) => e?.id)
                .filter((id) => id !== null && id !== undefined)
            );

            setSignedEventIds(ids);
          } catch {
            // אם למשתמש אין הרשאות/לא מתנדב/או כל בעיה אחרת — לא מפילים את המסך
            setSignedEventIds(new Set());
          }
        } else {
          setSignedEventIds(new Set());
        }

        // ✅ 2) עכשיו נטען את כל האירועים הציבוריים למסך Explore
        const data = await fetchJson("/api/events/", {
          token,
          signal: controller.signal,
        });

        const items = asList(data);
        setEvents(items);
      } catch (e) {
        if (e?.name !== "AbortError") setErr(e?.message || "שגיאה בטעינת אירועים");
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [token]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return events.filter((e) => {
      const catOk = category === "כל הקטגוריות" || e.category === category;
      const locOk = location === "מיקום" || e.location === location;

      const orgName =
        e?.org_name ||
        e?.organization_name ||
        e?.organization?.org_profile?.org_name ||
        e?.organization?.email ||
        "";

      const qOk =
        !query ||
        (e.title || "").toLowerCase().includes(query) ||
        String(orgName).toLowerCase().includes(query) ||
        (e.category || "").toLowerCase().includes(query) ||
        (e.location || "").toLowerCase().includes(query);

      return catOk && locOk && qOk;
    });
  }, [events, category, location, q]);

  const clearFilters = () => {
    setCategory("כל הקטגוריות");
    setLocation("מיקום");
    setQ("");
  };

  const isSignedUp = (eventObj) => signedEventIds.has(eventObj.id);

  const handleToggleSignup = async (eventObj) => {
    if (!token) {
      setToast("כדי להירשם לאירוע צריך להתחבר כמתנדב/ת.");
      return;
    }
    if (!API_BASE) {
      setToast("אין חיבור לשרת.");
      return;
    }

    const alreadySigned = isSignedUp(eventObj);

    setSignupBusyId(eventObj.id);
    setErr("");
    setToast("");

    try {
      if (alreadySigned) {
        // ❌ ביטול הרשמה: אצלך זה POST /cancel/
        await fetchJson(`/api/events/${eventObj.id}/cancel/`, {
          token,
          method: "POST",
        });

        setSignedEventIds((prev) => {
          const next = new Set(prev);
          next.delete(eventObj.id);
          return next;
        });

        setToast("בוטלה ההרשמה ✅");
      } else {
        // ✅ הרשמה: POST /signup/
        await fetchJson(`/api/events/${eventObj.id}/signup/`, {
          token,
          method: "POST",
        });

        setSignedEventIds((prev) => {
          const next = new Set(prev);
          next.add(eventObj.id);
          return next;
        });

        setToast("נרשמת בהצלחה ✅");
      }
    } catch (e) {
      setToast(e?.message || (alreadySigned ? "שגיאה בביטול הרשמה" : "שגיאה בהרשמה"));
    } finally {
      setSignupBusyId(null);
    }
  };

  return (
    <main className="page explorePage">
      <div className="container exploreContainer">
        <h1 className="pageTitle">מצאו את ההתנדבות הבאה שלכם</h1>
        <p className="pageSub">חפשו בין אירועים, סננו לפי מיקום או תחום עניין, והירשמו בקליק.</p>

        {toast ? (
          <div className="box boxPad exploreNotice exploreNotice--ok">
            <div className="exploreNotice__title">הודעה</div>
            <div className="exploreNotice__text">{toast}</div>
          </div>
        ) : null}

        {err ? (
          <div className="box boxPad exploreNotice exploreNotice--err">
            <div className="exploreNotice__title">אופס 😅</div>
            <div className="exploreNotice__text">{err}</div>
            <div className="exploreNotice__actions">
              <button className="btnSmall" type="button" onClick={() => window.location.reload()}>
                נסי שוב
              </button>
            </div>
          </div>
        ) : null}

        <div className="box boxPad exploreBox">
          <div className="filters exploreFilters">
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="כל הקטגוריות">כל הקטגוריות</option>
              {categoriesFromData.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select className="select" value={location} onChange={(e) => setLocation(e.target.value)}>
              <option value="מיקום">מיקום</option>
              {locationsFromData.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <input
              className="input"
              type="search"
              placeholder="חיפוש אירוע, עמותה או תחום..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="searchEmpty">
              <div className="searchIcon">⏳</div>
              טוען אירועים...
            </div>
          ) : !API_BASE ? (
            <div className="searchEmpty">
              <div className="searchIcon">🔌</div>
              אין חיבור לשרת
              <br />
              <span style={{ fontWeight: 700 }}>בדקי VITE_API_BASE_URL בקובץ .env</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="searchEmpty">
              <div className="searchIcon">🔎</div>
              לא נמצאו אירועים
              <br />
              <span style={{ fontWeight: 700 }}>נסו לשנות את הסינונים או לנקות הכל</span>
              <div style={{ marginTop: 14 }}>
                <button className="btnSmall" type="button" onClick={clearFilters}>
                  ניקוי כל הסינונים
                </button>
              </div>
            </div>
          ) : (
            <div className="grid exploreGrid">
              {filtered.map((e) => {
                const orgName =
                  e?.org_name ||
                  e?.organization_name ||
                  e?.organization?.org_profile?.org_name ||
                  e?.organization?.email ||
                  "עמותה";

                const signed = isSignedUp(e);
                const busy = signupBusyId === e.id;

                return (
                  <div key={e.id} className="card exploreCard">
                    <div className="cardTitle">{e.title}</div>

                    <div className="cardMeta">
                      {orgName} • {e.location} • {e.category}
                      {e.date ? ` • ${formatDate(e.date)}` : ""}
                    </div>

                    <div className="cardActions exploreCardActions">
                      <Link className="btnSmall exploreBtn" to={`/events/${e.id}`}>
                        לפרטים
                      </Link>

                      <button
                        className={`btnSmall exploreBtn ${
                          signed ? "exploreBtnDanger" : "exploreBtnPrimary"
                        }`}
                        type="button"
                        disabled={busy}
                        onClick={() => handleToggleSignup(e)}
                      >
                        {busy ? "שולח..." : signed ? "ביטול הרשמה" : "הרשמה"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

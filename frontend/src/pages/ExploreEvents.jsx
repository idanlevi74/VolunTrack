import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

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
    const looksLikeHtml = typeof data === "string" && data.toLowerCase().includes("<!doctype html");
    const msg =
      (data && data.detail) ||
      (looksLikeHtml ? `Endpoint לא נמצא: ${path}` : "") ||
      (typeof data === "string" ? data : "") ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
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

  const categoriesFromData = useMemo(() => {
    const set = new Set();
    events.forEach((e) => {
      if (e?.category) set.add(e.category);
    });
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b), "he"));
  }, [events]);

  const locationsFromData = useMemo(() => {
    const set = new Set();
    events.forEach((e) => {
      if (e?.location) set.add(e.location);
    });
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
          return;
        }

        const data = await fetchJson("/api/events/", {
          token,
          signal: controller.signal,
        });

        const items = Array.isArray(data) ? data : data?.results || [];
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

  const handleSignup = async (eventId) => {
    if (!token) {
      setToast("כדי להירשם לאירוע צריך להתחבר כמתנדב/ת.");
      return;
    }
    if (!API_BASE) {
      setToast("אין חיבור לשרת.");
      return;
    }

    setSignupBusyId(eventId);
    setErr("");
    setToast("");

    try {
      await fetchJson(`/api/events/${eventId}/signup/`, {
        token,
        method: "POST",
      });
      setToast("נרשמת בהצלחה ✅");
    } catch (e) {
      setToast(e?.message || "שגיאה בהרשמה");
    } finally {
      setSignupBusyId(null);
    }
  };

  return (
    <>
      <main className="page">
        <div className="container">
          <h1 className="pageTitle">מצאו את ההתנדבות הבאה שלכם</h1>
          <p className="pageSub">חפשו בין אירועים, סננו לפי מיקום או תחום עניין, והירשמו בקליק.</p>

          {toast ? (
            <div className="box boxPad" style={{ borderColor: "rgba(34,197,94,.35)", marginBottom: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>הודעה</div>
              <div style={{ color: "var(--muted)", fontWeight: 800, lineHeight: 1.8 }}>{toast}</div>
            </div>
          ) : null}

          {err ? (
            <div className="box boxPad" style={{ borderColor: "rgba(239,68,68,.35)", marginBottom: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>אופס 😅</div>
              <div style={{ color: "var(--muted)", fontWeight: 800, lineHeight: 1.8 }}>{err}</div>
              <div style={{ marginTop: 12 }}>
                <button className="btnSmall" type="button" onClick={() => window.location.reload()}>
                  נסי שוב
                </button>
              </div>
            </div>
          ) : null}

          <div className="box boxPad">
            <div className="filters">
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
              <div className="grid">
                {filtered.map((e) => {
                  const orgName =
                    e?.org_name ||
                    e?.organization_name ||
                    e?.organization?.org_profile?.org_name ||
                    e?.organization?.email ||
                    "עמותה";

                  return (
                    <div key={e.id} className="card">
                      <div className="cardTitle">{e.title}</div>
                      <div className="cardMeta">
                        {orgName} • {e.location} • {e.category}
                      </div>
                      <div className="cardActions">
                        <Link className="btnSmall" to={`/events/${e.id}`}>
                          לפרטים
                        </Link>
                        <button
                          className="btnSmall"
                          type="button"
                          disabled={signupBusyId === e.id}
                          onClick={() => handleSignup(e.id)}
                        >
                          {signupBusyId === e.id ? "נרשם..." : "הרשמה"}
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
    </>
  );
}

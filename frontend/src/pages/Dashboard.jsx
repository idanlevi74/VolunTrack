import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/**
 * הכנה לחיבור API:
 * - החליפי את API_BASE לכתובת שלך
 * - ודאי שיש לך JWT/Session אם צריך (ראו fetchJson)
 */
const API_BASE = import.meta?.env?.VITE_API_BASE_URL || ""; // למשל: "https://your-api.com"

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

  // נסיון לקרוא טקסט/JSON בצורה בטוחה
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

const TABS = [
  { id: "upcoming", label: "פעילויות קרובות" },
  { id: "history", label: "היסטוריה" },
  { id: "donations", label: "תרומות" },
  { id: "orgAdmin", label: "אזור מנהל עמותה" },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("upcoming");

  // הכנה למשתמש/טוקן (תחברי אחר כך למה שיש אצלך: localStorage/cookies/context)
  const [token] = useState(() => localStorage.getItem("accessToken") || "");

  // State ל-API
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [history, setHistory] = useState([]);
  const [donations, setDonations] = useState([]);
  const [orgAdmin, setOrgAdmin] = useState(null);

  // דמו (למקרה שעוד אין API)
  const demo = useMemo(
    () => ({
      profile: { full_name: "אדיר משה" },
      stats: { reliability_score: 100, activities_count: 0, hours_total: 0 },
      upcoming: [],
      history: [],
      donations: [],
      orgAdmin: { can_manage: false },
    }),
    []
  );

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setErr("");

      try {
        /**
         * כאן מחברים API אמיתי.
         * דוגמאות ל-endpoints (את תתאימי לשמות אצלך):
         *  - /api/me
         *  - /api/dashboard/stats
         *  - /api/activities?status=upcoming
         *  - /api/activities?status=history
         *  - /api/donations
         *  - /api/org-admin
         */

        // אם אין API_BASE מוגדר עדיין -> נשתמש בדמו
        if (!API_BASE) {
          setProfile(demo.profile);
          setStats(demo.stats);
          setUpcoming(demo.upcoming);
          setHistory(demo.history);
          setDonations(demo.donations);
          setOrgAdmin(demo.orgAdmin);
          return;
        }

        // דוגמא: טעינה במקביל
        const [me, st, up, hist, dons, admin] = await Promise.all([
          fetchJson("/api/me", { token, signal: controller.signal }),
          fetchJson("/api/dashboard/stats", { token, signal: controller.signal }),
          fetchJson("/api/activities?status=upcoming", {
            token,
            signal: controller.signal,
          }),
          fetchJson("/api/activities?status=history", {
            token,
            signal: controller.signal,
          }),
          fetchJson("/api/donations", { token, signal: controller.signal }),
          fetchJson("/api/org-admin", { token, signal: controller.signal }),
        ]);

        setProfile(me);
        setStats(st);
        setUpcoming(Array.isArray(up) ? up : up?.results || []);
        setHistory(Array.isArray(hist) ? hist : hist?.results || []);
        setDonations(Array.isArray(dons) ? dons : dons?.results || []);
        setOrgAdmin(admin);
      } catch (e) {
        if (e?.name !== "AbortError") setErr(e?.message || "שגיאה בטעינת נתונים");
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [token, demo]);

  const fullName = profile?.full_name || "משתמש/ת";
  const score = stats?.reliability_score ?? 0;
  const activitiesCount = stats?.activities_count ?? 0;
  const hoursTotal = stats?.hours_total ?? 0;

  const renderTabContent = () => {
    if (activeTab === "upcoming") {
      if (!upcoming?.length) {
        return (
          <div className="emptyState">
            <div style={{ fontSize: 28, marginBottom: 10 }}>📅</div>
            אין פעילויות קרובות
            <br />
            זה הזמן למצוא את ההתנדבות הבאה שלך
            <div style={{ marginTop: 14 }}>
              <Link className="btnSmall" to="/explore">
                חיפוש התנדבויות
              </Link>
            </div>
          </div>
        );
      }

      return (
        <div className="grid">
          {upcoming.map((a) => (
            <div key={a.id} className="card">
              <div className="cardTitle">{a.title}</div>
              <div className="cardMeta">
                {a.org_name} • {a.location} • {a.category}
              </div>
              <div className="cardActions">
                <Link className="btnSmall" to={`/events/${a.id}`}>
                  לפרטים
                </Link>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "history") {
      if (!history?.length) {
        return (
          <div className="emptyState">
            <div style={{ fontSize: 28, marginBottom: 10 }}>🕓</div>
            אין היסטוריה עדיין
            <br />
            אחרי שתשתתפו בפעילות – היא תופיע כאן
          </div>
        );
      }

      return (
        <div className="grid">
          {history.map((a) => (
            <div key={a.id} className="card">
              <div className="cardTitle">{a.title}</div>
              <div className="cardMeta">
                {a.org_name} • {a.location} • {a.date}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "donations") {
      if (!donations?.length) {
        return (
          <div className="emptyState">
            <div style={{ fontSize: 28, marginBottom: 10 }}>💝</div>
            אין תרומות להצגה
          </div>
        );
      }

      return (
        <div className="grid">
          {donations.map((d) => (
            <div key={d.id} className="card">
              <div className="cardTitle">{d.org_name}</div>
              <div className="cardMeta">
                סכום: {d.amount} • תאריך: {d.date}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // orgAdmin
    if (!orgAdmin?.can_manage) {
      return (
        <div className="emptyState">
          <div style={{ fontSize: 28, marginBottom: 10 }}>🛠️</div>
          אין לך הרשאות ניהול עמותה
        </div>
      );
    }

    return (
      <div className="box boxPad">
        <h3 style={{ margin: 0, fontWeight: 900 }}>אזור מנהל עמותה</h3>
        <p style={{ margin: "10px 0 0", color: "var(--muted)", fontWeight: 800 }}>
          כאן נציג כלים לניהול אירועים, מתנדבים ודוחות.
        </p>
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btnSmall" to="/org-admin/events">
            ניהול אירועים
          </Link>
          <Link className="btnSmall" to="/org-admin/volunteers">
            מתנדבים
          </Link>
          <Link className="btnSmall" to="/org-admin/reports">
            דוחות
          </Link>
        </div>
      </div>
    );
  };

  return (
    <>
      <main className="page">
        <div className="container">
          <h1 className="pageTitle">שלום, {fullName}</h1>
          <p className="pageSub">ברוכים הבאים לאזור האישי שלך</p>

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
          ) : (
            <div className="dashboard">
              <section>
                <div className="tabs">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      className={`tab ${activeTab === t.id ? "active" : ""}`}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      disabled={loading}
                      aria-pressed={activeTab === t.id}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="emptyState">
                    <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
                    טוען נתונים...
                  </div>
                ) : (
                  renderTabContent()
                )}
              </section>

              <aside style={{ display: "grid", gap: 16 }}>
                <div className="box kpi">
                  <div className="score">{score}</div>
                  <h3 className="kpiTitle">דירוג אמינות</h3>
                  <p className="kpiSub">{score >= 90 ? "מצוין! המשיכו כך" : "אפשר לשפר 💪"}</p>

                  <div className="kpiRow">
                    <div>
                      <div className="kpiNum">{activitiesCount}</div>
                      <div className="kpiLbl">פעילויות</div>
                    </div>
                    <div>
                      <div className="kpiNum">{hoursTotal}</div>
                      <div className="kpiLbl">שעות</div>
                    </div>
                  </div>
                </div>

                <div className="box boxPad">
                  <h3 style={{ margin: 0, fontWeight: 900 }}>התגים שלי</h3>
                  <p
                    style={{
                      margin: "10px 0 0",
                      color: "var(--muted)",
                      fontWeight: 800,
                      lineHeight: 1.8,
                    }}
                  >
                    טרם צברתם תגים. הירשמו לפעילות ראשונה!
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

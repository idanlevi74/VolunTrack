import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client"; // ✅ כמו אצלך בפרויקט

const TABS = [
  { id: "upcoming", label: "פעילויות קרובות" },
  { id: "history", label: "היסטוריה" },
  { id: "donations", label: "תרומות" },
  { id: "orgAdmin", label: "אזור מנהל עמותה" },
];

// עוזר קטן ל-DRF pagination
function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload?.results && Array.isArray(payload.results)) return payload.results;
  return [];
}

// מיפוי שדות כדי שלא תיתקעי אם השמות אצלך שונים קצת
function mapActivity(a) {
  return {
    id: a.id ?? a.pk,
    title: a.title ?? a.name ?? a.activity_name ?? "ללא כותרת",
    org_name: a.org_name ?? a.organization_name ?? a.org?.name ?? "",
    location: a.location ?? a.city ?? a.address ?? "",
    category: a.category ?? a.category_name ?? a.type ?? "",
    date: a.date ?? a.start_date ?? a.starts_at ?? "",
  };
}

function mapDonation(d) {
  return {
    id: d.id ?? d.pk,
    org_name: d.org_name ?? d.organization_name ?? d.org?.name ?? "",
    amount: d.amount ?? d.sum ?? d.total ?? "",
    date: d.date ?? d.created_at ?? "",
  };
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("upcoming");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [history, setHistory] = useState([]);
  const [donations, setDonations] = useState([]);
  const [orgAdmin, setOrgAdmin] = useState(null);

  // דמו (למקרה שמשהו נשבר)
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
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");

      try {
        /**
         * 🔧 כאן רק תוודאי שהנתיבים תואמים לשרת שלך.
         * אם אצלך זה למשל /api/users/me/ או /api/volunteer/me/ פשוט תחליפי פה.
         */
        const [
          me,
          st,
          upRaw,
          histRaw,
          donsRaw,
          admin,
        ] = await Promise.all([
          apiFetch("/api/me/"), // 👈 אם אצלך זה אחרת: /api/users/me/
          apiFetch("/api/dashboard/stats/"), // 👈 אם אין כזה endpoint - תגידי ואבנה לך חלופה
          apiFetch("/api/events/?status=upcoming"),
          apiFetch("/api/events/?status=history"),
          apiFetch("/api/donations/"),
          apiFetch("/api/org-admin/"),
        ]);

        if (!alive) return;

        setProfile(me);
        setStats(st);

        setUpcoming(asList(upRaw).map(mapActivity));
        setHistory(asList(histRaw).map(mapActivity));
        setDonations(asList(donsRaw).map(mapDonation));

        setOrgAdmin(admin);
      } catch (e) {
        if (!alive) return;

        // אם ה-API לא זמין/נתיבים לא נכונים, לפחות לא יישבר לך הדף
        setErr(e?.message || "שגיאה בטעינת נתונים");
        setProfile(demo.profile);
        setStats(demo.stats);
        setUpcoming(demo.upcoming);
        setHistory(demo.history);
        setDonations(demo.donations);
        setOrgAdmin(demo.orgAdmin);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [demo]);

  const fullName = profile?.full_name || profile?.username || "משתמש/ת";
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
                {a.org_name} {a.org_name ? "•" : ""} {a.location}{" "}
                {a.location ? "•" : ""} {a.category}
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
                {a.org_name} {a.org_name ? "•" : ""} {a.location}{" "}
                {a.location ? "•" : ""} {a.date}
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
                סכום: {d.amount} {d.amount ? "•" : ""} תאריך: {d.date}
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
                <p style={{ margin: "10px 0 0", color: "var(--muted)", fontWeight: 800 }}>
                  טרם צברתם תגים. הירשמו לפעילות ראשונה!
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

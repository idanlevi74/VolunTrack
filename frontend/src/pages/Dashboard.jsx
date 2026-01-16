import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client"; // ✅ כמו אצלך בפרויקט

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
    org_name:
      d.org_name ??
      d.organization_name ??
      d.organization?.org_name ??
      d.organization?.name ??
      d.org?.name ??
      "",
    amount: d.amount ?? d.sum ?? d.total ?? "",
    date: d.date ?? d.created_at ?? "",
  };
}

// חילוץ role בצורה סופר-סלחנית
function getRole(profile) {
  const raw = profile?.role ?? profile?.user?.role ?? profile?.account?.role ?? "";
  return String(raw || "").toUpperCase();
}

// YYYY-MM-DD של "היום" לפי אזור זמן מקומי של הדפדפן
function todayIsoLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateIL(dateStr) {
  if (!dateStr) return "";
  // אם זה כבר YYYY-MM-DD נעשה תצוגה יפה
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("he-IL");
}

export default function Dashboard() {
  // 🔁 ברירת מחדל: מתנדב "קרובות", עמותה "אירועים קרובים"
  const [activeTab, setActiveTab] = useState("upcoming");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [profile, setProfile] = useState(null);

  // מתנדב
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [history, setHistory] = useState([]);
  const [donations, setDonations] = useState([]);

  // עמותה
  const [orgUpcoming, setOrgUpcoming] = useState([]);
  const [orgHistory, setOrgHistory] = useState([]);
  const [orgDonations, setOrgDonations] = useState([]);

  // דמו (למקרה שמשהו נשבר)
  const demo = useMemo(
    () => ({
      profile: { full_name: "אדיר משה", role: "VOLUNTEER" },
      stats: { reliability_score: 0, activities_count: 0, hours_total: 0 }, // ⭐ 0–5
      upcoming: [],
      history: [],
      donations: [],
      orgUpcoming: [],
      orgHistory: [],
      orgDonations: [],
    }),
    []
  );

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");

      try {
        // 1) תמיד נביא me כדי לדעת role
        const me = await apiFetch("/api/me/");
        if (!alive) return;

        const role = getRole(me);
        const isVolunteer = role === "VOLUNTEER";
        const isOrg = role === "ORG" || role === "ADMIN";

        // 2) אירועים: אותו endpoint, אבל עכשיו השרת אמור לסנן גם לעמותה לפי status
        const commonEventRequests = [
          apiFetch("/api/events/?status=upcoming"),
          apiFetch("/api/events/?status=history"),
        ];

        // 3) לפי role:
        const extraRequests = isVolunteer
          ? [apiFetch("/api/dashboard/stats/"), apiFetch("/api/donations/")]
          : isOrg
          ? [Promise.resolve(null), apiFetch("/api/donations/")]
          : [Promise.resolve(null), Promise.resolve([])];

        const [evUpRaw, evHistRaw, st, donsRaw] = await Promise.all([
          ...commonEventRequests,
          ...extraRequests,
        ]);

        if (!alive) return;

        setProfile(me);

        // ✅ סנכרון נוסף בפרונט (רשת ביטחון) כדי לוודא שהטאב לא יתבלבל גם אם השרת יחזיר משהו לא צפוי
        const today = todayIsoLocal();

        if (isVolunteer) {
          const up = asList(evUpRaw)
            .map(mapActivity)
            .filter((e) => String(e?.date || "") >= today)
            .sort((a, b) => String(a?.date || "").localeCompare(String(b?.date || "")));

          const hist = asList(evHistRaw)
            .map(mapActivity)
            .filter((e) => String(e?.date || "") < today)
            .sort((a, b) => String(b?.date || "").localeCompare(String(a?.date || "")));

          setUpcoming(up);
          setHistory(hist);
          setStats(st);
          setDonations(asList(donsRaw).map(mapDonation));
          setActiveTab("upcoming");
        } else if (isOrg) {
          const up = asList(evUpRaw)
            .map(mapActivity)
            .filter((e) => String(e?.date || "") >= today)
            .sort((a, b) => String(a?.date || "").localeCompare(String(b?.date || "")));

          const hist = asList(evHistRaw)
            .map(mapActivity)
            .filter((e) => String(e?.date || "") < today)
            .sort((a, b) => String(b?.date || "").localeCompare(String(a?.date || "")));

          setOrgUpcoming(up);
          setOrgHistory(hist);
          setOrgDonations(asList(donsRaw).map(mapDonation));
          setActiveTab("orgUpcoming");
        } else {
          const up = asList(evUpRaw)
            .map(mapActivity)
            .filter((e) => String(e?.date || "") >= today);

          const hist = asList(evHistRaw)
            .map(mapActivity)
            .filter((e) => String(e?.date || "") < today);

          setUpcoming(up);
          setHistory(hist);
          setActiveTab("upcoming");
        }
      } catch (e) {
        if (!alive) return;

        setErr(e?.message || "שגיאה בטעינת נתונים");
        setProfile(demo.profile);
        setStats(demo.stats);
        setUpcoming(demo.upcoming);
        setHistory(demo.history);
        setDonations(demo.donations);
        setOrgUpcoming(demo.orgUpcoming);
        setOrgHistory(demo.orgHistory);
        setOrgDonations(demo.orgDonations);
        setActiveTab("upcoming");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [demo]);

  const role = getRole(profile);
  const isVolunteer = role === "VOLUNTEER";
  const isOrg = role === "ORG" || role === "ADMIN";

  const tabs = useMemo(() => {
    if (isVolunteer) {
      return [
        { id: "upcoming", label: "פעילויות קרובות" },
        { id: "history", label: "פעילויות שהיו" },
        { id: "donations", label: "התרומות שלי" },
      ];
    }
    if (isOrg) {
      return [
        { id: "orgUpcoming", label: "אירועים קרובים" },
        { id: "orgHistory", label: "אירועים שהיו" },
        { id: "orgDonations", label: "תרומות שהתקבלו" },
      ];
    }
    return [{ id: "upcoming", label: "פעילויות" }];
  }, [isVolunteer, isOrg]);

  const fullName = profile?.full_name || profile?.username || profile?.email || "משתמש/ת";

  // ⭐ אמינות 0–5 (אם אין דירוגים: 0)
  const score = Number(stats?.reliability_score ?? 0);
  const activitiesCount = stats?.activities_count ?? 0;
  const hoursTotal = stats?.hours_total ?? 0;

  const scoreText =
    score === 0
      ? "עוד אין דירוג – זה יתחיל אחרי דירוג ראשון 🙂"
      : score >= 4.5
      ? "מצוין! המשיכו כך ⭐"
      : score >= 3.5
      ? "טוב מאוד 🙂"
      : "אפשר לשפר 💪";

  const renderVolunteerUpcoming = () => {
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
              {a.org_name} {a.org_name ? "•" : ""} {a.location} {a.location ? "•" : ""}{" "}
              {a.category} {a.category ? "•" : ""} {formatDateIL(a.date)}
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
  };

  const renderVolunteerHistory = () => {
    if (!history?.length) {
      return (
        <div className="emptyState">
          <div style={{ fontSize: 28, marginBottom: 10 }}>🕓</div>
          עדיין אין פעילויות שהיו
          <br />
          אחרי שתשתתפו בפעילות – היא תופיע כאן ✨
        </div>
      );
    }

    return (
      <div className="grid">
        {history.map((a) => (
          <div key={a.id} className="card">
            <div className="cardTitle">{a.title}</div>
            <div className="cardMeta">
              {a.org_name} {a.org_name ? "•" : ""} {a.location} {a.location ? "•" : ""}{" "}
              {formatDateIL(a.date)}
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
  };

  const renderVolunteerDonations = () => {
    if (!donations?.length) {
      return (
        <div className="emptyState">
          <div style={{ fontSize: 28, marginBottom: 10 }}>💝</div>
          עדיין לא תרמת דרך VolunTrack
          <br />
          כשתרצי—תרומה קטנה עושה הבדל גדול 🫶
          <div style={{ marginTop: 14 }}>
            <Link className="btnSmall" to="/organizations">
              לעמותות ותרומה
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="grid">
        {donations.map((d) => (
          <div key={d.id} className="card">
            <div className="cardTitle">{d.org_name || "עמותה"}</div>
            <div className="cardMeta">
              סכום: {d.amount} {d.amount ? "•" : ""} תאריך: {formatDateIL(String(d.date).slice(0, 10))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ✅ עמותה - קרובים (בלי דירוג!)
  const renderOrgUpcoming = () => {
    if (!orgUpcoming?.length) {
      return (
        <div className="emptyState">
          <div style={{ fontSize: 28, marginBottom: 10 }}>📅</div>
          אין אירועים קרובים כרגע
          <br />
          כשייצרת אירוע חדש – הוא יופיע פה
          <div style={{ marginTop: 14 }}>
            <Link className="btnSmall" to="/org-admin/events">
              ניהול אירועים
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="grid">
        {orgUpcoming.map((a) => (
          <div key={a.id} className="card">
            <div className="cardTitle">{a.title}</div>
            <div className="cardMeta">
              {a.location} {a.location ? "•" : ""} {a.category} {a.category ? "•" : ""}{" "}
              {formatDateIL(a.date)}
            </div>
            <div className="cardActions">
              <Link className="btnSmall" to={`/events/${a.id}`}>
                לפרטים
              </Link>
              {/* ❌ אין דירוג באירועים עתידיים */}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ✅ עמותה - היסטוריה (פה כן דירוג)
  const renderOrgHistory = () => {
    if (!orgHistory?.length) {
      return (
        <div className="emptyState">
          <div style={{ fontSize: 28, marginBottom: 10 }}>🕓</div>
          אין אירועים שהיו עדיין
          <br />
          אחרי אירוע ראשון – הוא יופיע כאן
        </div>
      );
    }

    return (
      <div className="grid">
        {orgHistory.map((a) => (
          <div key={a.id} className="card">
            <div className="cardTitle">{a.title}</div>
            <div className="cardMeta">
              {a.location} {a.location ? "•" : ""} {a.category} {a.category ? "•" : ""}{" "}
              {formatDateIL(a.date)}
            </div>
            <div className="cardActions">
              <Link className="btnSmall" to={`/events/${a.id}`}>
                לפרטים
              </Link>
              <Link className="btnSmall" to={`/events/${a.id}/rate`}>
                תדרג את המשתתפים
              </Link>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderOrgDonations = () => {
    if (!orgDonations?.length) {
      return (
        <div className="emptyState">
          <div style={{ fontSize: 28, marginBottom: 10 }}>💸</div>
          עדיין לא התקבלו תרומות
          <br />
          כשייכנסו תרומות – הן יופיעו כאן 🙏
        </div>
      );
    }

    return (
      <div className="grid">
        {orgDonations.map((d) => (
          <div key={d.id} className="card">
            <div className="cardTitle">{d.org_name || "תרומה"}</div>
            <div className="cardMeta">
              סכום: {d.amount} {d.amount ? "•" : ""} תאריך: {formatDateIL(String(d.date).slice(0, 10))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTabContent = () => {
    if (isVolunteer) {
      if (activeTab === "upcoming") return renderVolunteerUpcoming();
      if (activeTab === "history") return renderVolunteerHistory();
      if (activeTab === "donations") return renderVolunteerDonations();
    }

    if (isOrg) {
      if (activeTab === "orgUpcoming") return renderOrgUpcoming();
      if (activeTab === "orgHistory") return renderOrgHistory();
      if (activeTab === "orgDonations") return renderOrgDonations();
    }

    return renderVolunteerUpcoming();
  };

  return (
    <main className="page">
      <div className="container">
        <h1 className="pageTitle">שלום, {fullName}</h1>
        <p className="pageSub">ברוכים הבאים לאזור האישי שלך</p>

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
        ) : (
          <div className="dashboard">
            <section>
              <div className="tabs">
                {tabs.map((t) => (
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

            {/* ⭐ צד ימין - אמינות/תגים: רק מתנדב */}
            {isVolunteer ? (
              <aside style={{ display: "grid", gap: 16 }}>
                <div className="box kpi">
                  <div className="score">{score}</div>
                  <h3 className="kpiTitle">דירוג אמינות</h3>
                  <p className="kpiSub">{scoreText}</p>

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
              </aside>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}

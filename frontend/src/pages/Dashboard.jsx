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
    // לנדיבות: אפשר ששרת יחזיר org_name, אבל נשמור גם על שדות אחרים
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

        // 2) אירועים - לכל תפקיד יש רשימה משלו
        // מתנדב: היסטוריה/קרובות של הנרשמים (כבר ממומש בשרת לפי status param)
        // עמותה: צריך שהשרת יחזיר אירועים של העמותה לפי status param (כבר ממומש ב-EventViewSet לפי role)
        const commonEventRequests = [
          apiFetch("/api/events/?status=upcoming"),
          apiFetch("/api/events/?status=history"),
        ];

        // 3) לפי role:
        // מתנדב: סטטיסטיקות + תרומות שתרם (נניח שכבר טיפלת בשרת כדי ש-/api/donations/ יחזיר "שלי")
        // עמותה: תרומות שקיבלה (נניח שכבר טיפלת בשרת שיחזיר לפי organization)
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

        if (isVolunteer) {
          setUpcoming(asList(evUpRaw).map(mapActivity));
          setHistory(asList(evHistRaw).map(mapActivity));
          setStats(st);
          setDonations(asList(donsRaw).map(mapDonation));
          setActiveTab("upcoming");
        } else if (isOrg) {
          // אותם endpoints, אבל בשרת get_queryset מחזיר אירועים של העמותה
          setOrgUpcoming(asList(evUpRaw).map(mapActivity));
          setOrgHistory(asList(evHistRaw).map(mapActivity));
          setOrgDonations(asList(donsRaw).map(mapDonation));
          setActiveTab("orgUpcoming");
        } else {
          // fallback
          setUpcoming(asList(evUpRaw).map(mapActivity));
          setHistory(asList(evHistRaw).map(mapActivity));
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
              {a.org_name} {a.org_name ? "•" : ""} {a.location} {a.location ? "•" : ""} {a.category}
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
              {a.org_name} {a.org_name ? "•" : ""} {a.location} {a.location ? "•" : ""} {a.date}
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
              סכום: {d.amount} {d.amount ? "•" : ""} תאריך: {d.date}
            </div>
          </div>
        ))}
      </div>
    );
  };

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
              {a.location} {a.location ? "•" : ""} {a.category} {a.category ? "•" : ""} {a.date}
            </div>
            <div className="cardActions">
              <Link className="btnSmall" to={`/events/${a.id}`}>
                לפרטים
              </Link>
              <Link className="btnSmall" to={`/org-admin/rate/${a.id}`}>
                תדרג את המשתתפים
              </Link>
            </div>
          </div>
        ))}
      </div>
    );
  };

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
              {a.location} {a.location ? "•" : ""} {a.category} {a.category ? "•" : ""} {a.date}
            </div>
            <div className="cardActions">
              <Link className="btnSmall" to={`/events/${a.id}`}>
                לפרטים
              </Link>
              <Link className="btnSmall" to={`/org-admin/rate/${a.id}`}>
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
              סכום: {d.amount} {d.amount ? "•" : ""} תאריך: {d.date}
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

    // fallback
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

            {/* ⭐ צד ימין - אמינות/תגים: רק מתנדב (כמו שהיה אצלך) */}
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

                <div className="box boxPad">
                  <h3 style={{ margin: 0, fontWeight: 900 }}>התגים שלי</h3>
                  <p style={{ margin: "10px 0 0", color: "var(--muted)", fontWeight: 800 }}>
                    טרם צברתם תגים. הירשמו לפעילות ראשונה!
                  </p>
                </div>
              </aside>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}

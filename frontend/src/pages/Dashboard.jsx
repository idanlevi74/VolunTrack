import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";

// ===== helpers =====
function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload?.results && Array.isArray(payload.results)) return payload.results;
  return [];
}

function mapActivity(a) {
  return {
    id: a.id ?? a.pk,
    title: a.title ?? a.name ?? a.activity_name ?? "ללא כותרת",
    org_name: a.org_name ?? a.organization_name ?? a.org?.name ?? "",
    location: a.location ?? a.city ?? a.address ?? "",
    category: a.category ?? a.category_name ?? a.type ?? "",
    date: a.date ?? a.start_date ?? a.starts_at ?? "",
    time: a.time ?? a.start_time ?? "",
    needed_volunteers: a.needed_volunteers ?? a.needed ?? a.capacity ?? "",
    signups_count: a.signups_count ?? a.signup_count ?? "",

    // ✅ למתנדב: דירוג שקיבל באירוע (יגיע מהשרת)
    my_rating: a.my_rating ?? a.rating ?? null,
  };
}
const [cancelBusyId, setCancelBusyId] = useState(null);

async function cancelSignup(eventId) {
  if (!eventId || cancelBusyId) return;

  const ok = window.confirm("לבטל הרשמה לאירוע?");
  if (!ok) return;

  setCancelBusyId(eventId);
  setErr("");
  setReportMsg("");

  try {
    await apiFetch(`/api/events/${eventId}/signup/`, { method: "DELETE" });

    // ✅ עדכון מיידי ב-UI
    setUpcoming((prev) => prev.filter((e) => e.id !== eventId));
  } catch (e) {
    setErr(e?.message || "לא הצלחתי לבטל הרשמה");
  } finally {
    setCancelBusyId(null);
  }
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
    currency: d.currency ?? d.curr ?? "",
    donor_name: d.donor_name ?? d.name ?? "",
    donor_email: d.donor_email ?? d.email ?? "",
    status: d.status ?? d.payment_status ?? "",
    date: d.date ?? d.created_at ?? "",
  };
}

function getRole(profile) {
  const raw = profile?.role ?? profile?.user?.role ?? profile?.account?.role ?? "";
  return String(raw || "").toUpperCase();
}

function todayIsoLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateIL(dateStr) {
  if (!dateStr) return "";
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("he-IL");
}

// ===== CSV export (Excel-friendly) =====
function csvEscape(value) {
  const s = value === null || value === undefined ? "" : String(value);
  const escaped = s.replace(/"/g, '""');
  if (/[",\n\r]/.test(escaped)) return `"${escaped}"`;
  return escaped;
}

function downloadCsv(filename, headers, rows) {
  const BOM = "\uFEFF"; // עברית באקסל
  const headerLine = headers.map(csvEscape).join(",");
  const lines = rows.map((r) => headers.map((h) => csvEscape(r[h])).join(","));
  const csv = BOM + [headerLine, ...lines].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// concurrency helper
async function runWithConcurrency(items, limit, worker) {
  const results = [];
  let i = 0;

  async function next() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, () => next());
  await Promise.all(runners);
  return results;
}

// ===== component =====
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [profile, setProfile] = useState(null);

  // volunteer
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [history, setHistory] = useState([]);
  const [donations, setDonations] = useState([]);

  // org
  const [orgUpcoming, setOrgUpcoming] = useState([]);
  const [orgHistory, setOrgHistory] = useState([]);
  const [orgDonations, setOrgDonations] = useState([]);

  // reports (org+volunteer)
  const [reportBusy, setReportBusy] = useState(false);
  const [reportMsg, setReportMsg] = useState("");

  const demo = useMemo(
    () => ({
      profile: { full_name: "אדיר משה", role: "VOLUNTEER" },
      stats: { reliability_score: 0, activities_count: 0, hours_total: 0 },
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
      setReportMsg("");

      try {
        const me = await apiFetch("/api/me/");
        if (!alive) return;

        const role = getRole(me);
        const isVolunteer = role === "VOLUNTEER";
        const isOrg = role === "ORG" || role === "ADMIN";

        const commonEventRequests = [
          apiFetch("/api/events/?status=upcoming"),
          apiFetch("/api/events/?status=history"),
        ];

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

  // volunteer KPI
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

  // ===== render sections =====
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

              <button
                className="btnSmall"
                type="button"
                onClick={() => cancelSignup(a.id)}
                disabled={cancelBusyId === a.id}
                title="ביטול הרשמה">
                {cancelBusyId === a.id ? "מבטל..." : "בטל הרשמה"}
                </button>
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
              {a.my_rating !== null && a.my_rating !== undefined && a.my_rating !== "" ? (
                <> {" • "} ⭐ דירוג: {a.my_rating}</>
              ) : (
                <> {" • "} ⭐ דירוג: עדיין לא דורג</>
              )}
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
              סכום: {d.amount} {d.currency ? d.currency : ""} {d.amount ? "•" : ""} תאריך:{" "}
              {formatDateIL(String(d.date).slice(0, 10))}
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
              {a.location} {a.location ? "•" : ""} {a.category} {a.category ? "•" : ""}{" "}
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
            <div className="cardTitle">תרומה</div>
            <div className="cardMeta">
              סכום: {d.amount} {d.currency ? d.currency : ""} {d.amount ? "•" : ""} תאריך:{" "}
              {formatDateIL(String(d.date).slice(0, 10))}
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

  // ===== reports: volunteer =====
  async function exportVolunteerDonationsCsv() {
    if (reportBusy) return;
    setReportBusy(true);
    setReportMsg("");

    try {
      const raw = await apiFetch("/api/donations/");
      const list = asList(raw).map(mapDonation);

      const headers = ["donation_id", "org_name", "amount", "currency", "status", "created_at"];

      const rows = list.map((d) => ({
        donation_id: d.id,
        org_name: d.org_name || "",
        amount: d.amount,
        currency: d.currency,
        status: d.status,
        created_at: d.date,
      }));

      downloadCsv(`my_donations_${todayIsoLocal()}.csv`, headers, rows);
      setReportMsg("✅ דוח תרומות ירד בהצלחה");
    } catch (e) {
      setReportMsg(e?.message || "שגיאה בייצוא דוח תרומות");
    } finally {
      setReportBusy(false);
    }
  }

  async function exportVolunteerEventsHistoryCsv() {
    if (reportBusy) return;
    setReportBusy(true);
    setReportMsg("");

    try {
      // כבר “שלי” כי status=history במתנדב מחזיר רק הרשומים
      const raw = await apiFetch("/api/events/?status=history");
      const list = asList(raw).map(mapActivity);

      const headers = [
        "event_id",
        "event_title",
        "event_date",
        "event_location",
        "event_category",
        "organization",
        "my_rating",
      ];

      const rows = list.map((e) => ({
        event_id: e.id,
        event_title: e.title,
        event_date: e.date,
        event_location: e.location,
        event_category: e.category,
        organization: e.org_name || "",
        my_rating:
          e.my_rating !== null && e.my_rating !== undefined && e.my_rating !== ""
            ? e.my_rating
            : "",
      }));

      downloadCsv(`my_events_history_${todayIsoLocal()}.csv`, headers, rows);
      setReportMsg("✅ דוח אירועים + דירוג ירד בהצלחה");
    } catch (e) {
      setReportMsg(e?.message || "שגיאה בייצוא דוח אירועים");
    } finally {
      setReportBusy(false);
    }
  }

  // ===== reports: org =====
  async function exportOrgDonationsCsv() {
    if (reportBusy) return;
    setReportBusy(true);
    setReportMsg("");

    try {
      const raw = await apiFetch("/api/donations/");
      const list = asList(raw).map(mapDonation);

      const headers = [
        "donation_id",
        "amount",
        "currency",
        "donor_name",
        "donor_email",
        "status",
        "created_at",
      ];

      const rows = list.map((d) => ({
        donation_id: d.id,
        amount: d.amount,
        currency: d.currency,
        donor_name: d.donor_name,
        donor_email: d.donor_email,
        status: d.status,
        created_at: d.date,
      }));

      downloadCsv(`donations_report_${todayIsoLocal()}.csv`, headers, rows);
      setReportMsg("✅ דוח תרומות ירד בהצלחה");
    } catch (e) {
      setReportMsg(e?.message || "שגיאה בייצוא דוח תרומות");
    } finally {
      setReportBusy(false);
    }
  }

  async function exportOrgEventsAndSignupsCsv() {
    if (reportBusy) return;
    setReportBusy(true);
    setReportMsg("");

    try {
      const evRaw = await apiFetch("/api/events/");
      const events = asList(evRaw).map(mapActivity);

      const signupsByEvent = await runWithConcurrency(events, 4, async (ev) => {
        try {
          const s = await apiFetch(`/api/events/${ev.id}/signups/`);
          return { eventId: ev.id, signups: asList(s) };
        } catch {
          return { eventId: ev.id, signups: [] };
        }
      });

      const byId = new Map(signupsByEvent.map((x) => [x.eventId, x.signups]));

      const headers = [
        "event_id",
        "event_title",
        "event_date",
        "event_time",
        "event_location",
        "event_category",
        "needed_volunteers",
        "signups_count",
        "volunteer_name",
        "signup_created_at",
      ];

      const rows = [];
      for (const ev of events) {
        const signups = byId.get(ev.id) || [];
        const signupCount =
          ev.signups_count !== "" && ev.signups_count !== null && ev.signups_count !== undefined
            ? ev.signups_count
            : signups.length;

        if (!signups.length) {
          rows.push({
            event_id: ev.id,
            event_title: ev.title,
            event_date: ev.date,
            event_time: ev.time,
            event_location: ev.location,
            event_category: ev.category,
            needed_volunteers: ev.needed_volunteers,
            signups_count: signupCount,
            volunteer_name: "",
            signup_created_at: "",
          });
        } else {
          for (const s of signups) {
            rows.push({
              event_id: ev.id,
              event_title: ev.title,
              event_date: ev.date,
              event_time: ev.time,
              event_location: ev.location,
              event_category: ev.category,
              needed_volunteers: ev.needed_volunteers,
              signups_count: signupCount,
              volunteer_name: s.volunteer_name ?? s.name ?? "",
              signup_created_at: s.created_at ?? "",
            });
          }
        }
      }

      downloadCsv(`events_and_signups_report_${todayIsoLocal()}.csv`, headers, rows);
      setReportMsg("✅ דוח אירועים + נרשמים ירד בהצלחה");
    } catch (e) {
      setReportMsg(e?.message || "שגיאה בייצוא דוח אירועים");
    } finally {
      setReportBusy(false);
    }
  }

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

            {/* ===== RIGHT SIDE ===== */}
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

                {/* ✅ VOLUNTEER REPORTS */}
                <div className="box boxPad">
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>📊 דוחות</div>
                  <div style={{ color: "var(--muted)", fontWeight: 800, lineHeight: 1.6 }}>
                    ייצוא לקובץ CSV (נפתח באקסל)
                  </div>

                  <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                    <button
                      className="btnSmall"
                      type="button"
                      onClick={exportVolunteerDonationsCsv}
                      disabled={reportBusy || loading}
                      title="ייצוא כל התרומות שתרמת"
                    >
                      {reportBusy ? "מכין..." : "ייצוא דוח תרומות שתרמתי"}
                    </button>

                    <button
                      className="btnSmall"
                      type="button"
                      onClick={exportVolunteerEventsHistoryCsv}
                      disabled={reportBusy || loading}
                      title="ייצוא האירועים שהשתתפת בהם + הדירוג שקיבלת בכל אירוע"
                    >
                      {reportBusy ? "מכין..." : "ייצוא דוח אירועים שהשתתפתי + דירוג"}
                    </button>

                    {reportMsg ? (
                      <div style={{ marginTop: 8, fontWeight: 800, color: "var(--muted)" }}>
                        {reportMsg}
                      </div>
                    ) : null}
                  </div>
                </div>
              </aside>
            ) : null}

            {/* ✅ ORG REPORTS */}
            {isOrg ? (
              <aside style={{ display: "grid", gap: 16 }}>
                <div className="box boxPad">
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>📊 דוחות</div>
                  <div style={{ color: "var(--muted)", fontWeight: 800, lineHeight: 1.6 }}>
                    ייצוא לקובץ CSV (נפתח באקסל)
                  </div>

                  <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                    <button
                      className="btnSmall"
                      type="button"
                      onClick={exportOrgDonationsCsv}
                      disabled={reportBusy || loading}
                      title="ייצוא כל התרומות שהתקבלו לעמותה"
                    >
                      {reportBusy ? "מכין..." : "ייצוא דוח תרומות לאקסל"}
                    </button>

                    <button
                      className="btnSmall"
                      type="button"
                      onClick={exportOrgEventsAndSignupsCsv}
                      disabled={reportBusy || loading}
                      title="ייצוא כל האירועים + כל הנרשמים לכל אירוע"
                    >
                      {reportBusy ? "מכין..." : "ייצוא דוח אירועים + נרשמים לאקסל"}
                    </button>

                    {reportMsg ? (
                      <div style={{ marginTop: 8, fontWeight: 800, color: "var(--muted)" }}>
                        {reportMsg}
                      </div>
                    ) : null}
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

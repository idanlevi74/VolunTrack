// src/pages/Dashboard.jsx
import React, { useMemo } from "react";

// components
import DashboardTabs from "../components/dashboard/DashboardTabs";
import VolunteerProfileCard from "../components/dashboard/VolunteerProfileCard";
import VolunteerUpcoming from "../components/dashboard/VolunteerUpcoming";
import VolunteerHistory from "../components/dashboard/VolunteerHistory";
import VolunteerDonations from "../components/dashboard/VolunteerDonations";
import VolunteerSidebar from "../components/dashboard/VolunteerSidebar";

import OrgUpcoming from "../components/dashboard/OrgUpcoming";
import OrgHistory from "../components/dashboard/OrgHistory";
import OrgDonations from "../components/dashboard/OrgDonations";
import OrgSidebar from "../components/dashboard/OrgSidebar";
import OrgProfileCard from "../components/dashboard/OrgProfileCard";


// hooks
import useDashboardData from "../components/dashboard/useDashboardData";
import useDashboardReports from "../components/dashboard/useDashboardReports";

// utils
import { getRole, formatDateIL } from "../components/dashboard/dashboardUtils";

export default function Dashboard() {
  const {
    activeTab,
    setActiveTab,
    loading,
    err,
    profile,

    // volunteer
    stats,
    upcoming,
    history,
    donations,
    cancelBusyId,
    cancelSignup,

    // org
    orgUpcoming,
    orgHistory,
    orgDonations,
  } = useDashboardData();

  const role = getRole(profile);
  const isVolunteer = role === "VOLUNTEER";
  const isOrg = role === "ORG" || role === "ADMIN";

  const fullName = profile?.full_name || profile?.username || profile?.email || "משתמש/ת";

  const tabs = useMemo(() => {
    if (isVolunteer) {
      return [
        { id: "upcoming", label: "פעילויות קרובות" },
        { id: "history", label: "פעילויות שהיו" },
        { id: "donations", label: "התרומות שלי" },
        { id: "profile", label: "הפרטים שלי" },
      ];
    }
    if (isOrg) {
      return [
        { id: "orgUpcoming", label: "אירועים קרובים" },
        { id: "orgHistory", label: "אירועים שהיו" },
        { id: "orgDonations", label: "תרומות שהתקבלו" },
        { id: "orgProfile", label: "פרטי עמותה" },
      ];
    }
    return [{ id: "upcoming", label: "פעילויות" }];
  }, [isVolunteer, isOrg]);

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

  const {
  reportBusy,
  reportMsg,
  exportVolunteerDonationsCsv,
  exportVolunteerEventsHistoryCsv,
  exportOrgDonationsCsv,
  exportOrgEventsAndSignupsCsv,
} = useDashboardReports();


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
              <DashboardTabs
                tabs={tabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                loading={loading}
              />

              {loading ? (
                <div className="emptyState">
                  <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
                  טוען נתונים...
                </div>
              ) : (
                <>
                  {/* VOLUNTEER */}
                  {isVolunteer && activeTab === "upcoming" && (
                    <VolunteerUpcoming
                      upcoming={upcoming}
                      formatDateIL={formatDateIL}
                      cancelSignup={cancelSignup}
                      cancelBusyId={cancelBusyId}
                    />
                  )}
                  {isVolunteer && activeTab === "history" && (
                    <VolunteerHistory history={history} formatDateIL={formatDateIL} />
                  )}
                  {isVolunteer && activeTab === "donations" && (
                    <VolunteerDonations donations={donations} formatDateIL={formatDateIL} />
                  )}
                  {isVolunteer && activeTab === "profile" && (
                    <VolunteerProfileCard />
                    )}

                  {/* ORG */}
                  {isOrg && activeTab === "orgUpcoming" && (
                    <OrgUpcoming orgUpcoming={orgUpcoming} formatDateIL={formatDateIL} />
                  )}
                  {isOrg && activeTab === "orgHistory" && (
                    <OrgHistory orgHistory={orgHistory} formatDateIL={formatDateIL} />
                  )}
                  {isOrg && activeTab === "orgDonations" && (
                    <OrgDonations orgDonations={orgDonations} formatDateIL={formatDateIL} />
                  )}
                    {isOrg && activeTab === "orgProfile" && <OrgProfileCard />}
                </>
              )}
            </section>

            {/* RIGHT SIDE */}
            {isVolunteer ? (
              <VolunteerSidebar
                score={score}
                scoreText={scoreText}
                activitiesCount={activitiesCount}
                hoursTotal={hoursTotal}
                exportVolunteerDonationsCsv={exportVolunteerDonationsCsv}
                exportVolunteerEventsHistoryCsv={exportVolunteerEventsHistoryCsv}
                reportBusy={reportBusy}
                loading={loading}
                reportMsg={reportMsg}
              />
            ) : null}

            {isOrg ? (
              <OrgSidebar
                exportOrgDonationsCsv={exportOrgDonationsCsv}
                exportOrgEventsAndSignupsCsv={exportOrgEventsAndSignupsCsv}
                reportBusy={reportBusy}
                loading={loading}
                reportMsg={reportMsg}
              />
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}

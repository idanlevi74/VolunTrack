// src/components/dashboard/VolunteerSidebar.jsx
export default function VolunteerSidebar({
  score,
  scoreText,
  activitiesCount,
  hoursTotal,
  exportVolunteerDonationsCsv,
  exportVolunteerEventsHistoryCsv,
  reportBusy,
  loading,
  reportMsg,
}) {
  return (
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
          >
            {reportBusy ? "מכין..." : "ייצוא דוח תרומות שתרמתי"}
          </button>

          <button
            className="btnSmall"
            type="button"
            onClick={exportVolunteerEventsHistoryCsv}
            disabled={reportBusy || loading}
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
  );
}

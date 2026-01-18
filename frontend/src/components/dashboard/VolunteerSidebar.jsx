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
  const isBusy = reportBusy || loading;

  return (
    <aside>
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

      <div className="box boxPad reports">
        <div className="reportsTitle">📊 דוחות</div>
        <div className="reportsSub">ייצוא לקובץ CSV </div>

        <div className="reportsActions">
          <button
            className="btnSmall"
            type="button"
            onClick={exportVolunteerDonationsCsv}
            disabled={isBusy}
          >
            {isBusy ? "מכין..." : "ייצוא דוח תרומות שתרמתי"}
          </button>

          <button
            className="btnSmall"
            type="button"
            onClick={exportVolunteerEventsHistoryCsv}
            disabled={isBusy}
          >
            {isBusy ? "מכין..." : "ייצוא דוח אירועים שהשתתפתי + דירוג"}
          </button>

          {reportMsg ? <div className="reportsMsg">{reportMsg}</div> : null}
        </div>
      </div>
    </aside>
  );
}

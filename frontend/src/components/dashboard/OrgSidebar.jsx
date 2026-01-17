// src/components/dashboard/OrgSidebar.jsx
export default function OrgSidebar({
  exportOrgDonationsCsv,
  exportOrgEventsAndSignupsCsv,
  reportBusy,
  loading,
  reportMsg,
}) {
  return (
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
  );
}

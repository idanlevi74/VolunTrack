// src/components/dashboard/VolunteerDonations.jsx
import { Link } from "react-router-dom";

export default function VolunteerDonations({ donations, formatDateIL }) {
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
}

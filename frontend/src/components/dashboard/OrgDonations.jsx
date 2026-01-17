// src/components/dashboard/OrgDonations.jsx
export default function OrgDonations({ orgDonations, formatDateIL }) {
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
}

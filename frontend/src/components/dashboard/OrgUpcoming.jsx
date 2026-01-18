// src/components/dashboard/OrgUpcoming.jsx
import { Link } from "react-router-dom";
import "../../styles/VolunteerUpcoming.css";
export default function OrgUpcoming({ orgUpcoming, formatDateIL }) {
  if (!orgUpcoming?.length) {
    return (
         <div className="vu">
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
      </div>
    );
  }

  return (
       <div className="vu">
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
    </div>
  );
}

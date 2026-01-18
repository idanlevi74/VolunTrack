// src/components/dashboard/VolunteerUpcoming.jsx
import { Link } from "react-router-dom";
import "../../styles/VolunteerUpcoming.css";
export default function VolunteerUpcoming({
  upcoming,
  formatDateIL,
  cancelSignup,
  cancelBusyId,
}) {
  if (!upcoming?.length) {
    return (
        <div className="vu">
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
      </div>
    );
  }

  return (
      <div className="vu">
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
              title="ביטול הרשמה"
            >
              {cancelBusyId === a.id ? "מבטל..." : "בטל הרשמה"}
            </button>
          </div>
        </div>
      ))}
    </div>
    </div>
  );
}

// src/components/dashboard/OrgHistory.jsx
import { Link } from "react-router-dom";
import "../../styles/OrgHistory.css";

export default function OrgHistory({ orgHistory, formatDateIL }) {
  if (!orgHistory?.length) {
    return (
      <div className="oh">
        <div className="emptyState">
          <div style={{ fontSize: 28, marginBottom: 10 }}>🕓</div>
          אין אירועים שהיו עדיין
          <br />
          אחרי אירוע ראשון – הוא יופיע כאן
        </div>
      </div>
    );
  }

  return (
    <div className="oh">
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
              <Link className="btnSmall btnRate" to={`/events/${a.id}/rate`}>
                תדרג את המשתתפים
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

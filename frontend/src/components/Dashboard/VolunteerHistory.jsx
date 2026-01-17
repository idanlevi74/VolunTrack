// src/components/dashboard/VolunteerHistory.jsx
import { Link } from "react-router-dom";

export default function VolunteerHistory({ history, formatDateIL }) {
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
}

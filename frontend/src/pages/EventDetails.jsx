import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "../styles/style.css";
import "../styles/event-details.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// fetch helper (מגן גם מפני HTML) + Authorization רק אם יש token
async function fetchJson(path, { token, signal, method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  let data = text;
  if (contentType.includes("application/json")) {
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // נשאיר כטקסט
    }
  }

  if (!res.ok) {
    const looksLikeHtml =
      typeof data === "string" && data.toLowerCase().includes("<!doctype html");
    const msg =
      (data && data.detail) ||
      (looksLikeHtml ? `Endpoint לא נמצא: ${path} (בדקי URL /api/...)` : "") ||
      (typeof data === "string" ? data : "") ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

function formatDateIL(dateStr) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTimeIL(timeStr) {
  if (!timeStr) return "";
  return String(timeStr).slice(0, 5);
}

function prettyAddress(location, city) {
  const parts = [location, city].filter(Boolean).map(String);
  return parts.join(", ");
}

function initials(text) {
  const s = (text || "").trim();
  if (!s) return "VT";
  const words = s.split(/\s+/).slice(0, 2);
  return words.map((w) => (w[0] ? w[0].toUpperCase() : "")).join("");
}

export default function EventDetails() {
  const { id } = useParams();
  const token = localStorage.getItem("accessToken") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [event, setEvent] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  // דמו (אם אין API_BASE)
  const demoEvent = useMemo(
    () => ({
      id,
      title: "חלוקת מזון למשפחות",
      description:
        "בואו לעזור לנו לארוז ולחלק חבילות מזון למשפחות בקהילה. ההתנדבות קצרה, מספקת, ומשנה חיים — גם שלכם 😄",
      category: "חלוקת מזון",
      location: "תל אביב",
      city: "תל אביב",
      date: "2026-01-15",
      time: "18:00",
      needed_volunteers: 12,
      organization_name: "לב טוב",
      organization: { org_name: "לב טוב" },
    }),
    [id]
  );

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setErr("");
      setActionMsg("");

      try {
        if (!API_BASE) {
          setEvent(demoEvent);
          return;
        }

        const data = await fetchJson(`/api/events/${id}/`, {
          token: token || undefined,
          signal: controller.signal,
        });

        setEvent(data);
      } catch (e) {
        if (e?.name !== "AbortError") setErr(e?.message || "שגיאה בטעינת אירוע");
      } finally {
        setLoading(false);
      }
    }

    if (id) load();
    return () => controller.abort();
  }, [demoEvent, id, token]);

  const normalized = useMemo(() => {
    if (!event) return null;

    const orgName =
      event.organization_name ||
      event.org_name ||
      event.organization?.org_name ||
      event.organization?.name ||
      event.org ||
      "";

    return {
      id: event.id ?? event.pk ?? id,
      title: event.title ?? event.name ?? "אירוע",
      description: event.description ?? event.details ?? "",
      category: event.category ?? event.type ?? "",
      date: event.date ?? event.event_date ?? "",
      time: event.time ?? event.event_time ?? "",
      location: event.location ?? event.address ?? "",
      city: event.city ?? "",
      needed: event.needed_volunteers ?? event.needed ?? event.capacity ?? null,
      orgName,
    };
  }, [event, id]);

  async function doSignup() {
    if (!API_BASE) {
      setActionMsg("✅ דמו: נרשמת לאירוע בהצלחה");
      return;
    }
    if (!token) {
      setActionMsg("כדי להירשם צריך להתחבר 🙂");
      return;
    }

    setActionLoading(true);
    setActionMsg("");

    try {
      const res = await fetchJson(`/api/events/${id}/signup/`, {
        token,
        method: "POST",
        body: {},
      });
      setActionMsg(res?.detail || "✅ נרשמת בהצלחה!");
    } catch (e) {
      setActionMsg(e?.message || "לא הצלחנו לרשום אותך לאירוע");
    } finally {
      setActionLoading(false);
    }
  }

  async function doCancel() {
    if (!API_BASE) {
      setActionMsg("✅ דמו: ביטלת הרשמה");
      return;
    }
    if (!token) {
      setActionMsg("כדי לבטל הרשמה צריך להתחבר 🙂");
      return;
    }

    setActionLoading(true);
    setActionMsg("");

    try {
      const res = await fetchJson(`/api/events/${id}/cancel/`, {
        token,
        method: "POST",
        body: {},
      });
      setActionMsg(res?.detail || "✅ בוטלה ההרשמה");
    } catch (e) {
      setActionMsg(e?.message || "לא הצלחנו לבטל הרשמה");
    } finally {
      setActionLoading(false);
    }
  }

  const metaDate = normalized?.date ? formatDateIL(normalized.date) : "";
  const metaTime = normalized?.time ? formatTimeIL(normalized.time) : "";
  const metaPlace = normalized ? prettyAddress(normalized.location, normalized.city) : "";
  const hasNeeded =
    normalized?.needed !== null &&
    normalized?.needed !== undefined &&
    String(normalized?.needed) !== "";

  const shareText = encodeURIComponent(
    `מצאתי אירוע התנדבות ב-VolunTrack: ${normalized?.title || ""}${
      metaDate ? " — " + metaDate : ""
    }`
  );
  const shareUrl = encodeURIComponent(window.location.href);

  if (loading) {
    return (
      <main className="page">
        <div className="container">
          <div className="emptyState ed__loading">
            <div className="ed__emoji">⏳</div>
            טוען אירוע...
          </div>
        </div>
      </main>
    );
  }

  if (err || !normalized) {
    return (
      <main className="page">
        <div className="container">
          <div className="box boxPad ed__error">
            <div className="ed__errorTitle">אופס 😅</div>
            <div className="ed__errorText">{err || "האירוע לא נמצא"}</div>
            <div className="ed__errorActions">
              <button className="btnSmall" type="button" onClick={() => window.location.reload()}>
                נסי שוב
              </button>
              <Link className="btnSmall" to="/explore">
                חזרה לאירועים
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        {/* breadcrumb */}
        <div className="ed__crumbs">
          <Link className="section__link" to="/explore">
            ← חזרה לכל האירועים
          </Link>
          <span className="ed__dot">•</span>
          <Link className="section__link" to="/organizations">
            עמותות
          </Link>
        </div>

        {/* hero card */}
        <section className="ed__card">
          <header className="ed__cover">
            <div className="ed__coverOverlay" />

            <div className="ed__pillsTop">
              {normalized.category ? <span className="ed__pill">{normalized.category}</span> : null}
              {normalized.orgName ? <span className="ed__pill">{normalized.orgName}</span> : null}
            </div>

            <div className="ed__coverBottom">
              <h1 className="ed__title">{normalized.title}</h1>

              <div className="ed__metaRow">
                {metaDate ? <span className="ed__pill ed__pillMeta">📅 {metaDate}</span> : null}
                {metaTime ? <span className="ed__pill ed__pillMeta">⏰ {metaTime}</span> : null}
                {metaPlace ? <span className="ed__pill ed__pillMeta">📍 {metaPlace}</span> : null}
                {hasNeeded ? (
                  <span className="ed__pill ed__pillMeta">👥 נדרשים: {normalized.needed}</span>
                ) : null}
              </div>
            </div>
          </header>

          <div className="ed__body">
            <div className="ed__grid">
              {/* left */}
              <div className="ed__panel">
                <div className="ed__panelTitle">על האירוע</div>

                {normalized.description ? (
                  <p className="ed__desc">{normalized.description}</p>
                ) : (
                  <p className="ed__desc">אין תיאור כרגע — אבל נשמע לנו חשוב 😄</p>
                )}

                <div className="ed__shareRow">
                  <a
                    className="btnSmall"
                    href={`https://wa.me/?text=${shareText}%20${shareUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    title="שיתוף בווטסאפ"
                  >
                    שיתוף בווטסאפ
                  </a>

                  <button
                    className="btnSmall"
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(window.location.href);
                        setActionMsg("🔗 הקישור הועתק!");
                      } catch {
                        setActionMsg("לא הצלחתי להעתיק את הקישור 😅");
                      }
                    }}
                  >
                    העתקת קישור
                  </button>
                </div>

                {actionMsg ? <div className="ed__msg">{actionMsg}</div> : null}
              </div>

              {/* right */}
              <aside className="ed__aside">
                <div className="ed__orgRow">
                  <div className="ed__avatar">{initials(normalized.orgName)}</div>
                  <div>
                    <div className="ed__orgName">{normalized.orgName || "עמותה"}</div>
                    <div className="ed__orgHint">מארגנת האירוע</div>
                  </div>
                </div>

                <div className="ed__ctaCol">
                  <button className="btn btn--primary" type="button" onClick={doSignup} disabled={actionLoading}>
                    {actionLoading ? "מבצע..." : "להירשם לאירוע"}
                  </button>

                  <button className="btn btn--ghost" type="button" onClick={doCancel} disabled={actionLoading}>
                    ביטול הרשמה
                  </button>

                  {!token ? (
                    <div className="ed__loginHint">
                      כדי להירשם/לבטל הרשמה צריך להתחבר.
                      <div className="ed__loginLink">
                        <Link className="btnSmall" to="/auth">
                          להתחברות
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="ed__quick">
                  <div className="ed__quickTitle">פרטים מהירים</div>
                  <div className="ed__quickList">
                    {metaDate ? <div>📅 {metaDate}</div> : null}
                    {metaTime ? <div>⏰ {metaTime}</div> : null}
                    {metaPlace ? <div>📍 {metaPlace}</div> : null}
                    {hasNeeded ? <div>👥 נדרשים: {normalized.needed}</div> : null}
                  </div>
                </div>
              </aside>
            </div>

            <div className="ed__footer">
              <Link className="btnSmall" to="/explore">
                למצוא עוד התנדבויות
              </Link>
              <Link className="btnSmall" to="/organizations">
                לעוד עמותות
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

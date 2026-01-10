import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api/client"; // ✅ משתמשים בפונקציה שלך (שולחת טוקן רק אם קיים)

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload?.results && Array.isArray(payload.results)) return payload.results;
  return [];
}

function asNumber(v) {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function orgNameFrom(o) {
  return o?.org_name || o?.name || o?.title || "עמותה";
}

export default function Donate() {
  const { orgId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [org, setOrg] = useState(null);

  const quickAmounts = useMemo(() => [25, 50, 100, 180, 250, 500], []);
  const [amount, setAmount] = useState(0);
  const [amountInput, setAmountInput] = useState("");

  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");

  // ======================
  // Load organization details
  // ======================
  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");
      setOkMsg("");

      try {
        if (!orgId) throw new Error("חסר מזהה עמותה בכתובת");

        // אם אצלך יש detail endpoint:
        // GET /api/organizations/:id/
        // (כמו בקוד שלך)
        const data = await apiFetch(`/api/organizations/${orgId}/`);

        if (!alive) return;
        setOrg(data);
      } catch (e) {
        if (!alive) return;

        // fallback: אם אין endpoint לפרטי עמותה,
        // ננסה להביא מרשימת עמותות ולמצוא לפי id
        try {
          const list = await apiFetch("/api/organizations/");
          const items = asList(list);
          const found = items.find((x) => String(x.id ?? x.pk ?? "") === String(orgId));
          if (!found) throw e;
          setOrg(found);
        } catch (e2) {
          setErr(e2?.message || e?.message || "שגיאה בטעינת עמותה");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [orgId]);

  // ======================
  // Amount helpers
  // ======================
  function pickQuick(v) {
    setAmount(v);
    setAmountInput(String(v));
  }

  function onAmountChange(e) {
    const v = e.target.value;
    setAmountInput(v);
    setAmount(asNumber(v));
  }

  // ======================
  // Submit donation
  // ======================
  async function submitDonation(e) {
    e.preventDefault();
    setErr("");
    setOkMsg("");

    if (!amount || amount < 1) {
      setErr("בחרי סכום תרומה (לפחות 1 ₪)");
      return;
    }

    // ✅ לפי המודל/serializer שהגדרנו:
    // Donation: { organization, amount, donor_name?, donor_email?, campaign? }
    const payload = {
      organization: Number(orgId) || orgId, // אם זה UUID יישאר מחרוזת
      amount,
      ...(donorName ? { donor_name: donorName } : {}),
      ...(donorEmail ? { donor_email: donorEmail } : {}),
    };

    setPosting(true);
    try {
      const created = await apiFetch("/api/donations/", {
        method: "POST",
        body: payload,
        // token נלקח אוטומטית מה-localStorage אם קיים (תורם מחובר)
      });

      const id = created?.id ?? created?.pk ?? "";
      setOkMsg(`התרומה נשמרה בהצלחה${id ? ` (מס' ${id})` : ""} 💝`);
      // אם בא לך דף תודה:
      // navigate(`/donate/${orgId}/thanks`);
    } catch (e2) {
      setErr(e2?.message || "שגיאה ביצירת תרומה");
    } finally {
      setPosting(false);
    }
  }

  const name = orgNameFrom(org);

  return (
    <main className="page">
      <div className="container">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 className="pageTitle" style={{ marginBottom: 6 }}>
              תרומה ל{name}
            </h1>
            <p className="pageSub" style={{ margin: 0 }}>
              תודה שאתם עוזרים לעשות טוב 💝
            </p>
          </div>

          <Link className="btnSmall" to="/organizations">
            חזרה לעמותות
          </Link>
        </div>

        {err ? (
          <div className="box boxPad" style={{ marginTop: 16, borderColor: "rgba(239,68,68,.35)" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>אופס 😅</div>
            <div style={{ color: "var(--muted)", fontWeight: 800, lineHeight: 1.8 }}>{err}</div>
          </div>
        ) : null}

        {okMsg ? (
          <div className="box boxPad" style={{ marginTop: 16, borderColor: "rgba(34,197,94,.35)" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>הצלחה ✅</div>
            <div style={{ color: "var(--muted)", fontWeight: 800, lineHeight: 1.8 }}>{okMsg}</div>
            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className="btnSmall" to="/organizations">
                חזרה לעמותות
              </Link>
              <Link className="btnSmall" to="/explore">
                למצוא התנדבות
              </Link>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="emptyState" style={{ marginTop: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
            טוען פרטי עמותה...
          </div>
        ) : !org ? (
          <div className="emptyState" style={{ marginTop: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🏢</div>
            לא נמצאה עמותה
            <div style={{ marginTop: 12 }}>
              <button className="btnSmall" type="button" onClick={() => navigate("/organizations")}>
                חזרה
              </button>
            </div>
          </div>
        ) : (
          <div className="dashboard" style={{ marginTop: 18, alignItems: "start" }}>
            <section className="box boxPad" style={{ minHeight: 0 }}>
              <h3 style={{ margin: 0, fontWeight: 900 }}>על העמותה</h3>
              <p style={{ margin: "10px 0 0", color: "var(--muted)", fontWeight: 800, lineHeight: 1.8 }}>
                {org?.description || org?.about || "אין תיאור זמין כרגע."}
              </p>
            </section>

            <aside style={{ display: "grid", gap: 16 }}>
              <form className="box boxPad" onSubmit={submitDonation}>
                <h3 style={{ margin: 0, fontWeight: 900 }}>בחרי סכום תרומה</h3>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  {quickAmounts.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="btnSmall"
                      onClick={() => pickQuick(v)}
                      aria-pressed={amount === v}
                      disabled={posting}
                      style={{
                        opacity: amount === v ? 1 : 0.85,
                        transform: amount === v ? "translateY(-1px)" : "none",
                      }}
                    >
                      ₪{v}
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 14 }}>
                  <label style={{ display: "block", fontWeight: 900, marginBottom: 6 }}>סכום חופשי</label>
                  <input
                    className="input"
                    value={amountInput}
                    onChange={onAmountChange}
                    inputMode="numeric"
                    placeholder="לדוגמה: 120"
                    style={{ width: "100%" }}
                    disabled={posting}
                  />
                  <div style={{ marginTop: 6, color: "var(--muted)", fontWeight: 800 }}>
                    סכום נבחר: <b>₪{amount || 0}</b>
                  </div>
                </div>

                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontWeight: 900, marginBottom: 6 }}>שם (אופציונלי)</label>
                    <input
                      className="input"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder="איך תרצי שיופיע? (אם לא תמלאי — אנונימי)"
                      style={{ width: "100%" }}
                      disabled={posting}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontWeight: 900, marginBottom: 6 }}>
                      אימייל (לקבלה, אופציונלי)
                    </label>
                    <input
                      className="input"
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                      type="email"
                      placeholder="name@example.com"
                      style={{ width: "100%" }}
                      disabled={posting}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btnSmall" type="submit" disabled={posting}>
                    {posting ? "שולח..." : "תרמי עכשיו 💝"}
                  </button>

                  <Link className="btnSmall" to={`/organizations/${orgId}`}>
                    לפרטי עמותה
                  </Link>
                </div>

                <p style={{ marginTop: 12, color: "var(--muted)", fontWeight: 800, lineHeight: 1.7 }}>
                  לאחר החיבור לסליקה, הכפתור הזה יפתח תשלום אמיתי. כרגע הוא יוצר רשומת תרומה במערכת.
                </p>
              </form>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

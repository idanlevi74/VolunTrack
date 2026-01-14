import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";

// Stripe
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

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
  return o?.org_name || o?.name || o?.title || o?.email || "עמותה";
}

/** ======================
 * Checkout component
 * ====================== */
function DonationCheckout({ onBack, onPaid }) {
  const stripe = useStripe();
  const elements = useElements();

  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState("");

  async function payNow() {
    setPayErr("");
    if (!stripe || !elements) return;

    setPaying(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        setPayErr(error.message || "שגיאה בתשלום");
      } else {
        onPaid?.();
      }
    } catch (e) {
      setPayErr(e?.message || "שגיאה בתשלום");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>תשלום מאובטח</div>

      {payErr ? <div className="alert error">אופס 😅 {payErr}</div> : null}

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 14,
        }}
      >
        <PaymentElement />
      </div>

      <div className="actions" style={{ marginTop: 14 }}>
        <button
          className="btn primary"
          type="button"
          onClick={payNow}
          disabled={!stripe || paying}
        >
          {paying ? "משלם..." : "שלם עכשיו"}
        </button>

        <button
          className="btn ghost"
          type="button"
          onClick={onBack}
          disabled={paying}
        >
          חזרה לעריכת פרטים
        </button>

        <p className="note" style={{ margin: 0 }}>
          זהו מצב בדיקה (Test Mode) — לא מתבצע חיוב אמיתי.
        </p>
      </div>
    </div>
  );
}

/** ======================
 * Main page
 * ====================== */
export default function Donate() {
  const { orgId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [org, setOrg] = useState(null);

  // Stripe clientSecret state
  const [clientSecret, setClientSecret] = useState("");
  const [createdDonationId, setCreatedDonationId] = useState(null);

  // סכומים
  const quickAmounts = useMemo(() => [50, 100, 250, 500], []);
  const [amount, setAmount] = useState(0);
  const [amountInput, setAmountInput] = useState("");

  // פרטי תורם
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");

  // חשבונית (UI בלבד)
  const [billName, setBillName] = useState("");
  const [billId, setBillId] = useState("");
  const [billAddress, setBillAddress] = useState("");

  // ======================
  // Load organization
  // ======================
  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");
      setOkMsg("");

      try {
        if (!orgId) throw new Error("חסר מזהה עמותה בכתובת");

        const data = await apiFetch(`/api/organizations/${orgId}/`);
        if (!alive) return;
        setOrg(data);
      } catch (e) {
        if (!alive) return;
        try {
          const list = await apiFetch("/api/organizations/");
          const items = asList(list);
          const found = items.find(
            (x) => String(x.id ?? x.pk ?? "") === String(orgId)
          );
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

  function resetForm() {
    setErr("");
    setOkMsg("");
    setClientSecret("");
    setCreatedDonationId(null);

    setAmount(0);
    setAmountInput("");
    setDonorName("");
    setDonorEmail("");
    setDonorPhone("");
    setBillName("");
    setBillId("");
    setBillAddress("");
  }

  // ======================
  // 1) Create Donation  2) Create Stripe intent
  // ======================
  async function submitDonation(e) {
    e.preventDefault();

    console.log("API BASE:", import.meta.env.VITE_API_BASE_URL);

    setErr("");
    setOkMsg("");

    if (!amount || amount < 2) {
      setErr("בחרי סכום תרומה (לפחות 2 ₪)");
      return;
    }

    if (!donorName.trim()) {
      setErr("נא למלא שם מלא (או כתבי 'אנונימי')");
      return;
    }

    setPosting(true);
    try {
      // 1) create donation in your DB
      const orgUserId = org?.user_id ?? org?.user ?? org?.id;
      if (!orgUserId) throw new Error("לא התקבל user_id לעמותה מהשרת");

      const payload = {
        organization: orgUserId,
        amount,
        currency: "ils",
        donor_name: donorName.trim(),
        donor_email: donorEmail.trim(),
      };

      const created = await apiFetch("/api/donations/", {
        method: "POST",
        body: payload,
      });

      console.log("Created donation:", created);

      const donationId = created?.id ?? created?.pk;
      if (!donationId) throw new Error("נוצרה תרומה אך לא התקבל מזהה (id)");

      setCreatedDonationId(donationId);

      // 2) ask backend to create PaymentIntent and return client_secret
      const intentRes = await apiFetch("/api/payments/donations/create-intent/", {
        method: "POST",
        body: { donation_id: donationId },
      });

      console.log("Intent response:", intentRes);

      const cs = intentRes?.client_secret;
      if (!cs) throw new Error("לא התקבל client_secret מ-Stripe");

      setClientSecret(cs);
    } catch (e2) {
      console.error("Donate submit error:", e2);
      setErr(e2?.message || "שגיאה ביצירת תרומה/תשלום");
    } finally {
      setPosting(false);
    }
  }

  const name = orgNameFrom(org);

  return (
    <main className="donatePage" dir="rtl" lang="he">
      <style>{`
        .donatePage{
          --bg:#f6f7fb;
          --card:#ffffff;
          --text:#111827;
          --muted:#6b7280;
          --border:#e5e7eb;
          --focus:#2563eb;
          --shadow: 0 10px 25px rgba(0,0,0,.06);
          --radius: 16px;

          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          padding: 32px 0 60px;
          font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
        }

        .donateContainer{
          width: min(820px, 92vw);
          margin: 0 auto;
        }

        .donateHeaderRow{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:12px;
        }

        .donateTitle{
          margin:0;
          font-size: clamp(22px, 2.4vw, 30px);
          font-weight: 900;
        }

        .donateSubtitle{
          margin:6px 0 0;
          color: var(--muted);
          font-size: 15px;
          font-weight: 700;
          line-height: 1.7;
        }

        .card{
          background: var(--card);
          border:1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 20px;
          margin-top: 18px;
        }

        .form{
          display:grid;
          gap:18px;
        }

        .sectionTitle{
          font-weight: 900;
          margin-bottom: 6px;
        }

        .grid{
          display:grid;
          grid-template-columns: repeat(12, 1fr);
          gap:14px;
        }

        .field{
          grid-column: span 12;
          display:flex;
          flex-direction:column;
          gap:8px;
        }

        label{
          font-size:14px;
          color: var(--muted);
          font-weight: 700;
        }

        input{
          padding:12px;
          font-size:15px;
          border-radius:12px;
          border:1px solid var(--border);
          outline:none;
          background:#fff;
        }

        input:focus{
          border-color:var(--focus);
          box-shadow:0 0 0 4px rgba(37,99,235,.12);
        }

        .amountButtons{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
        }

        .amountBtn{
          padding:10px 14px;
          border-radius:999px;
          border:1px solid var(--border);
          background:#fff;
          cursor:pointer;
          font-size:14px;
          font-weight: 800;
        }

        .amountBtn:hover{
          border-color:var(--focus);
        }

        .amountBtn[aria-pressed="true"]{
          border-color:var(--focus);
          box-shadow:0 0 0 4px rgba(37,99,235,.10);
        }

        .note{
          font-size:13px;
          color: var(--muted);
          font-weight: 700;
          line-height: 1.7;
        }

        .actions{
          display:flex;
          align-items:center;
          gap:12px;
          flex-wrap:wrap;
          border-top:1px solid var(--border);
          padding-top:16px;
        }

        .btn{
          padding:12px 16px;
          border-radius:12px;
          border:none;
          cursor:pointer;
          font-size:15px;
          font-weight: 900;
        }

        .primary{
          background: var(--focus);
          color:#fff;
        }

        .ghost{
          background:#fff;
          border:1px solid var(--border);
          color: var(--text);
        }

        .topLink{
          padding:10px 12px;
          border-radius:12px;
          border:1px solid var(--border);
          background:#fff;
          text-decoration:none;
          color: var(--text);
          font-weight: 900;
          white-space: nowrap;
        }

        .alert{
          margin-top: 16px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: #fff;
          padding: 14px;
          font-weight: 800;
          line-height: 1.8;
        }

        .alert.error{ border-color: rgba(239,68,68,.35); }
        .alert.ok{ border-color: rgba(34,197,94,.35); }

        @media (min-width:720px){
          .col6{ grid-column: span 6; }
        }
      `}</style>

      <div className="donateContainer">
        <div className="donateHeaderRow">
          <div>
            <h1 className="donateTitle">תרומה ל{name}</h1>
            <p className="donateSubtitle">
              התרומה שלך מסייעת לנו להמשיך ולפעול לטובת הקהילה 💝
            </p>
          </div>

          <Link className="topLink" to="/organizations">
            חזרה לעמותות
          </Link>
        </div>

        {err ? <div className="alert error">אופס 😅 {err}</div> : null}

        {okMsg ? (
          <div className="alert ok">
            <div style={{ fontWeight: 900, marginBottom: 6 }}>הצלחה ✅</div>
            {okMsg}
            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className="topLink" to="/organizations">
                חזרה לעמותות
              </Link>
              <Link className="topLink" to="/explore">
                למצוא התנדבות
              </Link>
            </div>
          </div>
        ) : null}

        <div className="card">
          {loading ? (
            <div className="note">טוען פרטי עמותה...</div>
          ) : !org ? (
            <div className="note">
              לא נמצאה עמותה.
              <div style={{ marginTop: 10 }}>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => navigate("/organizations")}
                >
                  חזרה
                </button>
              </div>
            </div>
          ) : (
            <>
              {clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <DonationCheckout
                    onBack={() => setClientSecret("")}
                    onPaid={() => {setOkMsg("התרומה בוצעה בהצלחה 💝 תודה רבה!");

                    setTimeout(() => {
                    navigate("/");
                    }, 3000); // ⏱️ 3 שניות
                    }, 3000); // ⏱️ 3 שניות
  }}
/>
                </Elements>
              ) : (
                <form className="form" onSubmit={submitDonation}>
                  <div>
                    <div className="sectionTitle">סכום תרומה</div>

                    <div className="amountButtons">
                      {quickAmounts.map((v) => (
                        <button
                          key={v}
                          type="button"
                          className="amountBtn"
                          onClick={() => pickQuick(v)}
                          aria-pressed={amount === v}
                          disabled={posting}
                        >
                          ₪{v}
                        </button>
                      ))}
                    </div>

                    <div className="field" style={{ marginTop: 10 }}>
                      <label>סכום אחר</label>
                      <input
                        type="number"
                        min={2}
                        placeholder="הכנס סכום בש״ח (מינימום 2)"
                        value={amountInput}
                        onChange={onAmountChange}
                        disabled={posting}
                      />
                      <div className="note">
                        סכום נבחר: <b>₪{amount || 0}</b>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="sectionTitle">פרטי תורם</div>
                    <div className="grid">
                      <div className="field col6">
                        <label>שם מלא</label>
                        <input
                          type="text"
                          placeholder="שם פרטי ושם משפחה"
                          value={donorName}
                          onChange={(e) => setDonorName(e.target.value)}
                          disabled={posting}
                          required
                        />
                      </div>

                      <div className="field col6">
                        <label>אימייל</label>
                        <input
                          type="email"
                          placeholder="example@email.com"
                          value={donorEmail}
                          onChange={(e) => setDonorEmail(e.target.value)}
                          disabled={posting}
                        />
                      </div>

                      <div className="field col6">
                        <label>טלפון</label>
                        <input
                          type="tel"
                          placeholder="05X-XXXXXXX"
                          value={donorPhone}
                          onChange={(e) => setDonorPhone(e.target.value)}
                          disabled={posting}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="sectionTitle">פרטים לחשבונית</div>
                    <div className="note">כרגע לא נשמר במערכת</div>

                    <div className="grid" style={{ marginTop: 8 }}>
                      <div className="field col6">
                        <label>שם לחיוב / שם חברה</label>
                        <input
                          type="text"
                          value={billName}
                          onChange={(e) => setBillName(e.target.value)}
                          disabled={posting}
                        />
                      </div>

                      <div className="field col6">
                        <label>ח.פ / ע.מ</label>
                        <input
                          type="text"
                          value={billId}
                          onChange={(e) => setBillId(e.target.value)}
                          disabled={posting}
                        />
                      </div>

                      <div className="field">
                        <label>כתובת</label>
                        <input
                          type="text"
                          placeholder="רחוב, מספר, עיר"
                          value={billAddress}
                          onChange={(e) => setBillAddress(e.target.value)}
                          disabled={posting}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="actions">
                    <button className="btn primary" type="submit" disabled={posting}>
                      {posting ? "שולח..." : "המשך לתשלום"}
                    </button>

                    <button
                      className="btn ghost"
                      type="button"
                      onClick={resetForm}
                      disabled={posting}
                    >
                      ניקוי
                    </button>

                    <p className="note" style={{ margin: 0 }}>
                      אחרי יצירת תרומה במערכת — תיפתח חלונית תשלום של Stripe (Test Mode).
                    </p>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {clientSecret ? (
          <div className="note" style={{ marginTop: 10 }}>
            כרטיס בדיקה: <b>4242 4242 4242 4242</b> | תוקף עתידי | CVC כלשהו
          </div>
        ) : null}
      </div>
    </main>
  );
}

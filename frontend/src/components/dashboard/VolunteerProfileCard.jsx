import React, { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";

export default function VolunteerProfileCard({ onSaved } = {}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  // read-only display
  const [points, setPoints] = useState(0);
  const [reliabilityScore, setReliabilityScore] = useState(0);

  async function load() {
    setLoading(true);
    setErr("");
    setOk("");

    try {
      const p = await apiFetch("/api/volunteer-profile/");
      setFullName(p?.full_name || "");
      setPhone(p?.phone || "");
      setCity(p?.city || "");
      setPoints(Number(p?.points ?? 0));
      setReliabilityScore(Number(p?.reliability_score ?? 0));
    } catch (e) {
      setErr(e?.message || "שגיאה בטעינת פרטים");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      await load();
      if (!alive) return;
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setErr("");
    setOk("");

    try {
      const payload = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        city: city.trim(),
      };

      const updated = await apiFetch("/api/volunteer-profile/", {
        method: "PATCH",
        body: payload,
      });

      setOk("✅ נשמר!");
      setPoints(Number(updated?.points ?? points));
      setReliabilityScore(Number(updated?.reliability_score ?? reliabilityScore));

      if (typeof onSaved === "function") onSaved(updated);
    } catch (e) {
      setErr(e?.message || "לא הצלחתי לשמור");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="box boxPad">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>👤 פרטים אישיים</div>
        <div style={{ color: "var(--muted)", fontWeight: 800 }}>טוען...</div>
      </div>
    );
  }

  return (
    <div className="box boxPad">
      <div style={{ fontWeight: 900, marginBottom: 10 }}>👤 פרטים אישיים</div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <div className="pill">⭐ אמינות: {reliabilityScore}</div>
        <div className="pill">🏅 נקודות: {points}</div>
      </div>

      {err ? <div style={{ fontWeight: 800, color: "rgb(239,68,68)", marginBottom: 10 }}>{err}</div> : null}
      {ok ? <div style={{ fontWeight: 800, color: "var(--muted)", marginBottom: 10 }}>{ok}</div> : null}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 900 }}>שם מלא</span>
          <input
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="לדוגמה: נוגה לוי"
            required
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 900 }}>טלפון</span>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="05x-xxxxxxx"
            autoComplete="tel"
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 900 }}>עיר</span>
          <input
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="תל אביב"
          />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btnSmall" type="submit" disabled={saving}>
            {saving ? "שומר..." : "שמור"}
          </button>

          <button className="btnSmall" type="button" disabled={saving} onClick={load}>
            רענן מהשרת
          </button>
        </div>
      </form>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";

export default function OrgProfileCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [form, setForm] = useState({
    org_name: "",
    description: "",
    phone: "",
    website: "",
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");
      setOkMsg("");

      try {
        const data = await apiFetch("/api/organizations/me/");
        if (!alive) return;

        setForm({
          org_name: data?.org_name ?? "",
          description: data?.description ?? "",
          phone: data?.phone ?? "",
          website: data?.website ?? "",
        });
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "שגיאה בטעינת פרטי העמותה");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function onSave() {
    if (saving) return;
    setSaving(true);
    setErr("");
    setOkMsg("");

    try {
      await apiFetch("/api/organizations/me/", { method: "PATCH", body: form });
      setOkMsg("✅ הפרטים עודכנו בהצלחה");
    } catch (e) {
      setErr(e?.message || "לא הצלחתי לעדכן");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="emptyState">
        <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
        טוען פרטי עמותה...
      </div>
    );
  }

  return (
    <div className="box boxPad">
      <div style={{ fontWeight: 900, marginBottom: 10 }}>🏢 פרטי העמותה</div>

      {err ? (
        <div style={{ fontWeight: 800, color: "rgba(239,68,68,1)", marginBottom: 10 }}>
          {err}
        </div>
      ) : null}

      {okMsg ? (
        <div style={{ fontWeight: 800, color: "var(--muted)", marginBottom: 10 }}>
          {okMsg}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800 }}>שם עמותה</span>
          <input className="input" name="org_name" value={form.org_name} onChange={onChange} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800 }}>טלפון</span>
          <input className="input" name="phone" value={form.phone} onChange={onChange} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800 }}>אתר</span>
          <input className="input" name="website" value={form.website} onChange={onChange} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800 }}>תיאור</span>
          <textarea
            className="input"
            name="description"
            value={form.description}
            onChange={onChange}
            rows={4}
          />
        </label>

        <button className="btnSmall" type="button" onClick={onSave} disabled={saving}>
          {saving ? "שומר..." : "שמירת פרטים"}
        </button>
      </div>
    </div>
  );
}

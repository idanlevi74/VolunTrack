import { useState } from "react";
import { apiFetch } from "../api/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("");
    setLoading(true);

    try {
      // התאימי את ה-path למה שיש אצלך ב-API (דוגמה ל-JWT):
      const data = await apiFetch("/api/auth/login/", {
        method: "POST",
        body: { email, password },
      });

      // אם זה DRF SimpleJWT זה לרוב access/refresh:
      if (data?.access) localStorage.setItem("access_token", data.access);
      if (data?.refresh) localStorage.setItem("refresh_token", data.refresh);

      setStatus("התחברת בהצלחה ✅");
    } catch (err) {
      setStatus(`שגיאה: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 420 }}>
      <h1>התחברות</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          אימייל
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          סיסמה
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>

        <button disabled={loading} type="submit">
          {loading ? "מתחבר..." : "התחבר"}
        </button>

        {status && <div>{status}</div>}
      </form>
    </div>
  );
}

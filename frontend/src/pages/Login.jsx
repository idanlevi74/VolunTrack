import { useState } from "react";
import { apiFetch } from "../api/client";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("");
    setLoading(true);

    try {
      // התאימי את ה-path אם אצלך שונה:
      const data = await apiFetch("/api/auth/login/", {
        method: "POST",
        body: { username, password }, // ✅ שולח "username" לשרת
      });

      // אם השרת מחזיר JWT:
      if (data?.access) localStorage.setItem("access_token", data.access);
      if (data?.refresh) localStorage.setItem("refresh_token", data.refresh);

      setStatus("התחברת בהצלחה ✅");
      // אופציונלי: להפנות לבית
      // window.location.href = "/";
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
          משתמש
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label>
          סיסמה
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />
        </label>

        <button disabled={loading} type="submit">
          {loading ? "בודק..." : "התחבר"}
        </button>

        {status && <div>{status}</div>}
      </form>
    </div>
  );
}

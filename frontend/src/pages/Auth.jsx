import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/auth.css";
import { apiFetch } from "../api/client";
import { useAuth } from "../components/AuthContext";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = () => {
    alert("Google auth – עוד לא מחובר (TODO)");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiFetch("/api/auth/login/", {
        method: "POST",
        body: { email, password },
      });

      if (!data?.access) {
        throw new Error("Login succeeded but access token is missing");
      }

      // ✅ שמות אחידים לטוקנים
      localStorage.setItem("accessToken", data.access);
      if (data.refresh) localStorage.setItem("refreshToken", data.refresh);

      // ✅ עדכון ה-Context כדי שה-Navbar יתעדכן מייד
      login({
        token: data.access,
        user: { email }, // זמני. אם יש לך endpoint /api/me נביא שם מלא
      });

      // ✅ חזרה לעמוד שניסו להגיע אליו (אם הגיעו מ-RequireAuth)
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.message || "שגיאה בהתחברות");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth" lang="en" dir="ltr">
      <h1 className="h1">Welcome to VolunTrack</h1>
      <p className="h2">Sign in to continue</p>

      <section className="panel" aria-label="Authentication panel">
        <button className="btnGoogle" type="button" onClick={handleGoogle} disabled={loading}>
          <span style={{ fontWeight: 900 }}>G</span>
          Continue with Google
        </button>

        <div className="sep">OR</div>

        <form onSubmit={handleSubmit}>
          <div className="label">Email</div>
          <div className="field">
            <span aria-hidden="true">✉</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>

          <div className="label">Password</div>
          <div className="field">
            <span aria-hidden="true">🔒</span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>

          {error ? (
            <div role="alert" style={{ marginTop: 10, fontWeight: 700 }}>
              {error}
            </div>
          ) : null}

          <button className="btnPrimary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <div className="links">
            <Link to="/forgot-password">Forgot password?</Link>
            <span>
              Need an account? <Link to="/signup">Sign up</Link>
            </span>
          </div>
        </form>
      </section>
    </main>
  );
}

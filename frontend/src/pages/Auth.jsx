import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/auth.css";
import { apiFetch } from "../api/client";
import { useAuth } from "../components/AuthContext";
import GoogleButton from "../components/GoogleButton";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectAfterLogin = () => {
    const from = location.state?.from?.pathname || "/dashboard";
    navigate(from, { replace: true });
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

      if (!data?.access) throw new Error("Login succeeded but access token is missing");

      localStorage.setItem("accessToken", data.access);
      if (data.refresh) localStorage.setItem("refreshToken", data.refresh);

      // עדיף לשמור user מהשרת אם קיים; אם לא — email זמני
      login({
        token: data.access,
        user: data.user || { email },
      });

      redirectAfterLogin();
    } catch (err) {
      setError(err?.message || "שגיאה בהתחברות");
    } finally {
      setLoading(false);
    }
  };

  // ✅ התחברות Google (כפתור אמיתי)
  const handleGoogleSuccess = async (data) => {
    try {
      setError("");

      if (!data?.access) throw new Error("Google login succeeded but access token is missing");

      localStorage.setItem("accessToken", data.access);
      if (data.refresh) localStorage.setItem("refreshToken", data.refresh);

      login({
        token: data.access,
        user: data.user || { email: data?.user?.email },
      });

      redirectAfterLogin();
    } catch (err) {
      setError(err?.message || "שגיאה בהתחברות עם Google");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = (msg) => {
    setGoogleLoading(false);
    setError(msg || "שגיאה בהתחברות עם Google");
  };

  return (
    <main className="auth" lang="en" dir="ltr">
      <h1 className="h1">Welcome to VolunTrack</h1>
      <p className="h2">Sign in to continue</p>

      <section className="panel" aria-label="Authentication panel">
        {/* ✅ כפתור גוגל שמחובר לשרת */}
        <div style={{ display: "grid", gap: 10 }}>
          <GoogleButton
            disabled={loading || googleLoading}
            onStart={() => {
              setGoogleLoading(true);
              setError("");
            }}
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
          />
        </div>

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
              disabled={loading || googleLoading}
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
              disabled={loading || googleLoading}
            />
          </div>

          {error ? (
            <div role="alert" style={{ marginTop: 10, fontWeight: 700 }}>
              {error}
            </div>
          ) : null}

          <button className="btnPrimary" type="submit" disabled={loading || googleLoading}>
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

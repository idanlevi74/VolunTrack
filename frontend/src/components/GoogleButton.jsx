import React, { useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function GoogleButton({ onStart, onSuccess, onError, disabled }) {
  const btnRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!API_BASE) {
      onError?.("חסר VITE_API_BASE_URL בפרונט");
      return;
    }
    if (!GOOGLE_CLIENT_ID) {
      onError?.("חסר VITE_GOOGLE_CLIENT_ID בפרונט");
      return;
    }
    if (!window.google?.accounts?.id) {
      onError?.("Google script לא נטען. ודאי שיש <script ...gsi/client> ב-index.html");
      return;
    }
    if (initializedRef.current) return;

    initializedRef.current = true;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          onStart?.();

          const res = await fetch(`${API_BASE}/api/auth/google/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: response.credential }),
          });

          const data = await res.json().catch(() => ({}));

          if (!res.ok) {
            throw new Error(data?.detail || `Google login failed (${res.status})`);
          }

          onSuccess?.(data);
        } catch (e) {
          onError?.(e?.message || "שגיאה בהתחברות עם Google");
        }
      },
    });

    // לנקות אם נשאר רנדר קודם
    if (btnRef.current) btnRef.current.innerHTML = "";

    window.google.accounts.id.renderButton(btnRef.current, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      width: 360,
    });
  }, [onStart, onSuccess, onError]);

  // overlay שקוף כדי "לנעול" את הכפתור אם disabled
  return (
    <div style={{ position: "relative", opacity: disabled ? 0.6 : 1 }}>
      <div ref={btnRef} />
      {disabled ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            cursor: "not-allowed",
          }}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

import React, { useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleButton({ onSuccess }) {
  const btnRef = useRef(null);

  useEffect(() => {
    if (!window.google || !GOOGLE_CLIENT_ID) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        // response.credential == id_token
        const res = await fetch(`${API_BASE}/api/auth/google/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || "Google login failed");

        // שמירת JWT כמו אצלך
        localStorage.setItem("accessToken", data.access);
        localStorage.setItem("refreshToken", data.refresh);

        onSuccess?.(data);
      },
    });

    window.google.accounts.id.renderButton(btnRef.current, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "pill",
      width: 320,
    });
  }, [onSuccess]);

  return <div ref={btnRef} />;
}

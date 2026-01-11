/*
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export async function apiFetch(path, { method = "GET", body, token } = {}) {
  const accessToken = token || localStorage.getItem("accessToken");

  const headers = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  // ✅ טיפול ייעודי ב-401/403 כדי להבין מהר
  if (res.status === 401) {
    // אופציונלי: לנקות טוקנים תקולים
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    throw new Error("לא מחובר/ת (401). התחברי מחדש.");
  }

  if (!res.ok) {
    const msg =
      (data && (data.detail || data.message || data.error)) ||
      `HTTP ${res.status}`;
    // עוזר דיבאג: תראי בדיוק איזה URL נכשל
    throw new Error(`${msg} | ${method} ${url}`);
  }

  return data;
}
*/
// api/client.js (דוגמה)
export async function apiFetch(path, { method = "GET", body, token } = {}) {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }

  if (!res.ok) {
    console.error("API ERROR", res.status, data);
    throw new Error(typeof data === "string" ? data : JSON.stringify(data));
  }
  return data;
}

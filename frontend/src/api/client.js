const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export async function apiFetch(path, { method = "GET", body, token } = {}) {
  // אם לא העבירו token ידנית, ניקח מה-localStorage
  const accessToken = token || localStorage.getItem("accessToken");

  const headers = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE}${path}`, {
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

  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth() {
  const { isAuth, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div style={{ padding: 24 }}>טוען...</div>;

  if (!isAuth) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

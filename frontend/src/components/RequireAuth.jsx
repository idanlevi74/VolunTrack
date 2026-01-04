import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth() {
  const { isAuth, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // או spinner

  if (!isAuth) {
    return <Navigate to="/Auth" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function RequireAuth() {
  const token = localStorage.getItem("accessToken");
  const location = useLocation();

  if (!token) {
    return (
      <Navigate
        to="/Auth"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
}

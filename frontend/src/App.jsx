import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import ExploreEvents from "./pages/ExploreEvents";
import Dashboard from "./pages/Dashboard";
import Organizations from "./pages/Organizations";
import Signup from "./pages/signup";
import RequireAuth from "./components/RequireAuth";

export default function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/explore" element={<ExploreEvents />} />
        <Route path="/organizations" element={<Organizations />} />
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        <Route path="*" element={<div>404</div>} />
      </Routes>
    </>
  );
}

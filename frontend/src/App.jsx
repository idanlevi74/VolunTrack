import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import ExploreEvents from "./pages/ExploreEvents";
import Dashboard from "./pages/Dashboard";


export default function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/ExploreEvents" element={<ExploreEvents />} />
         <Route element={<RequireAuth />}>
          <Route path="/Dashboard" element={<Dashboard />} />
        </Route>

        {/* fallback */}
        <Route path="*" element={<div>404</div>} />
      </Routes>

    </>
  );
}

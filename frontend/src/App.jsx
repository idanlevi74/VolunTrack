import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import ExploreEvents from "./pages/ExploreEvents";
import EventDetails from "./pages/EventDetails";
import Dashboard from "./pages/Dashboard";
import Organizations from "./pages/Organizations";
import CreateEvent from "./pages/CreateEvent";
import Signup from "./pages/Signup";
import RequireAuth from "./components/RequireAuth";
import Donate from "./pages/Donate";

export default function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/createevent" element={<CreateEvent />} />
        <Route path="/explore" element={<ExploreEvents />} />
        <Route path= "/events/:id" element={<EventDetails />} />
        <Route path="/organizations" element={<Organizations />} />
        <Route path="/donate/:orgId" element={<Donate />} />
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        <Route path="*" element={<div>404</div>} />
      </Routes>
      <Footer />
    </>
  );
}

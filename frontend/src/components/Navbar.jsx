import { NavLink, Link } from "react-router-dom";
import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="container topbar__inner">
        <Link className="brand" to="/">
          VolunTrack <span className="brand__dot">♥</span>
        </Link>

        <nav className="nav">
          <NavLink to="/" end>דף הבית</NavLink>
          <NavLink to="/explore">חיפוש התנדבויות</NavLink>
          <NavLink to="/organizations">עמותות</NavLink>
          <NavLink to="/dashboard">אזור אישי</NavLink>
        </nav>

        <button className="burger" onClick={() => setOpen(!open)}>☰</button>
      </div>

      {open && (
        <div className="mobileNav" onClick={() => setOpen(false)}>
          <Link to="/">דף הבית</Link>
          <Link to="/explore">חיפוש התנדבויות</Link>
          <Link to="/organizations">עמותות</Link>
          <Link to="/dashboard">אזור אישי</Link>
        </div>
      )}
    </header>
  );
}

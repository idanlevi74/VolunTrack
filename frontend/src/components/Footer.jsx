import React from "react";
import "./styles/style.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <span className="footer__copy">© {new Date().getFullYear()} VolunTrack</span>
      </div>
    </footer>
  );
}

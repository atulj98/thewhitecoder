import { BookOpenText } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function Layout() {
  return (
    <div className="site-shell">
      <ScrollToTop />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" to="/" aria-label="Study Sheets home">
            <span className="brand-mark" aria-hidden="true">
              <BookOpenText size={22} />
            </span>
            <span>
              study<span className="brand-accent">sheets</span>
              <span className="period">.</span>
            </span>
          </Link>
          <nav aria-label="Primary navigation">
            <Link to="/">Explore sheets</Link>
          </nav>
        </div>
      </header>
      <main id="main-content">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <span className="footer-brand">
            studysheets<span className="period">.</span>
          </span>
          <span>Build understanding, one topic at a time.</span>
        </div>
      </footer>
    </div>
  );
}

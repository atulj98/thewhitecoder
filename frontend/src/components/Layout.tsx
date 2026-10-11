import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import ThemeToggle from "./ThemeToggle";
import { scrollToSheets } from "../lib/scroll";

function ScrollToTop() {
  const { pathname, state } = useLocation();
  useEffect(() => {
    if (pathname === "/" && state?.scrollToSheets) {
      const frame = requestAnimationFrame(scrollToSheets);
      return () => cancelAnimationFrame(frame);
    }
    window.scrollTo(0, 0);
  }, [pathname, state]);
  return null;
}

export default function Layout() {
  const location = useLocation();
  return (
    <div className="site-shell">
      <ScrollToTop />
      <button
        className="skip-link"
        type="button"
        onClick={() => document.getElementById("main-content")?.focus()}
      >
        Skip to content
      </button>
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" to="/" aria-label="The White Coder home">
            <span className="brand-mark" aria-hidden="true">
              <img
                src={`${import.meta.env.BASE_URL}logo.svg`}
                alt=""
                width="42"
                height="42"
              />
            </span>
            <span className="brand-wordmark">
              <span className="brand-name">
                The White <strong>Coder</strong>
                <span className="period">.</span>
              </span>
            </span>
          </Link>
          <div className="header-actions">
            <nav aria-label="Primary navigation">
              {location.pathname === "/" ? (
                <button
                  className="nav-link"
                  type="button"
                  onClick={scrollToSheets}
                >
                  <span className="nav-full-label">Explore sheets</span>
                  <span className="nav-short-label">Sheets</span>
                </button>
              ) : (
                <Link
                  className="nav-link"
                  to="/"
                  state={{ scrollToSheets: true }}
                >
                  <span className="nav-full-label">Explore sheets</span>
                  <span className="nav-short-label">Sheets</span>
                </Link>
              )}
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <span className="footer-brand">
            The White Coder<span className="period">.</span>
          </span>
          <span>Build understanding, one topic at a time.</span>
        </div>
      </footer>
    </div>
  );
}

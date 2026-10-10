import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  Braces,
  CircuitBoard,
  Database,
  Layers3,
  Network,
  RefreshCw,
  Route,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { getSheets } from "../api/sheets";
import { scrollToSheets } from "../lib/scroll";

const visuals: Record<
  string,
  { icon: LucideIcon; number: string; tone: string; short: string }
> = {
  dsa: { icon: Braces, number: "01", tone: "mint", short: "DSA" },
  cn: { icon: Network, number: "02", tone: "blue", short: "CN" },
  os: { icon: Layers3, number: "03", tone: "peach", short: "OS" },
  dbms: { icon: Database, number: "04", tone: "lavender", short: "DBMS" },
  oops: { icon: CircuitBoard, number: "05", tone: "yellow", short: "OOPS" },
};

export default function CatalogPage() {
  const {
    data: sheets,
    isPending,
    isError,
    refetch,
  } = useQuery({ queryKey: ["sheets"], queryFn: getSheets });
  return (
    <>
      <section className="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" /> THE WHITE CODER / OPEN LEARNING
            </span>
            <h1>
              Learn the craft.
              <br />
              <em>Master the logic.</em>
            </h1>
            <p>
              A DSA roadmap that begins with your first programs and builds
              toward confident problem solving. One topic at a time, at your
              pace.
            </p>
            <button
              className="primary-button"
              type="button"
              onClick={scrollToSheets}
            >
              Explore the DSA sheet <ArrowRight size={18} />
            </button>
            <span className="hero-footnote">
              Free to explore · Built for steady progress
            </span>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="preview-card">
              <div className="preview-topline">
                <span className="preview-mark">
                  <Braces size={18} />
                </span>
                <span>THE WHITE CODER / DSA</span>
                <span className="preview-live">STUDY PATH</span>
              </div>
              <div className="preview-intro">
                <span>THE ROADMAP</span>
                <strong>
                  Build the way
                  <br />
                  you think.
                </strong>
              </div>
              <div className="preview-steps">
                <div>
                  <span>01</span>
                  <b>Fundamentals</b>
                  <small>Find your footing</small>
                </div>
                <div>
                  <span>02</span>
                  <b>Problem patterns</b>
                  <small>Build the method</small>
                </div>
                <div>
                  <span>03</span>
                  <b>Core structures</b>
                  <small>Connect the ideas</small>
                </div>
                <div>
                  <span>04</span>
                  <b>Advanced topics</b>
                  <small>Go further</small>
                </div>
              </div>
              <div className="preview-bottom">
                A clear next step, every step of the way{" "}
                <ArrowUpRight size={15} />
              </div>
            </div>
            <span className="preview-side-note">
              PRACTICE WITH PURPOSE / 001
            </span>
          </div>
        </div>
      </section>
      <section
        className="catalog-section"
        id="sheets"
        aria-labelledby="catalog-title"
      >
        <div className="container">
          <div className="section-intro">
            <div>
              <span className="section-kicker">THE LEARNING PATH</span>
              <h2 id="catalog-title" tabIndex={-1}>
                Start with DSA<span className="period">.</span>
              </h2>
            </div>
            <p>
              Follow the order, understand the idea, then practice until it
              clicks. Every question links directly to its platform.
            </p>
          </div>
          {isPending && (
            <div className="status-panel" role="status">
              Loading the study sheets…
            </div>
          )}
          {isError && (
            <div className="status-panel" role="alert">
              <p>We couldn't load the study sheets right now.</p>
              <button className="text-button" onClick={() => refetch()}>
                <RefreshCw size={16} /> Try again
              </button>
            </div>
          )}
          {sheets &&
            (sheets.length === 0 ? (
              <div className="status-panel" role="status">
                No sheets are published yet. Check back soon.
              </div>
            ) : (
              <div className="sheet-grid">
                {sheets.map((sheet) => {
                  const visual = visuals[sheet.slug] ?? {
                    icon: Layers3,
                    number: "--",
                    tone: "mint",
                    short: sheet.slug.toUpperCase(),
                  };
                  const Icon = visual.icon;
                  return (
                    <Link
                      to={`/sheets/${sheet.slug}`}
                      className={`sheet-card tone-${visual.tone}`}
                      key={sheet.slug}
                    >
                      <div className="card-top">
                        <span className="subject-icon">
                          <Icon size={25} strokeWidth={1.8} />
                        </span>
                        <span className="subject-number">
                          PATH {visual.number}
                        </span>
                      </div>
                      <div className="sheet-card-copy">
                        <span className="subject-short">
                          {visual.short} / OPEN SHEET
                        </span>
                        <h3>{sheet.title}</h3>
                        <p>{sheet.description}</p>
                        <div className="sheet-card-bottom">
                          <span className="status-ready">Open the roadmap</span>
                          <span className="card-arrow">
                            <ArrowRight size={19} />
                          </span>
                        </div>
                      </div>
                      <span className="sheet-card-watermark" aria-hidden="true">
                        {visual.short}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
        </div>
      </section>
      <section className="method-section">
        <div className="container">
          <div className="method-heading">
            <span className="section-kicker">HOW TO USE THE SHEET</span>
            <h2>Make every practice session count.</h2>
          </div>
          <div className="method-grid">
            <article>
              <BookOpenCheck size={22} />
              <span>01 / UNDERSTAND</span>
              <h3>Start with the idea.</h3>
              <p>
                Read the study focus before you tackle each set of questions.
              </p>
            </article>
            <article>
              <Route size={22} />
              <span>02 / PRACTICE</span>
              <h3>Solve in sequence.</h3>
              <p>
                Build from approachable exercises toward deeper applications.
              </p>
            </article>
            <article>
              <Target size={22} />
              <span>03 / REVISIT</span>
              <h3>Make it stick.</h3>
              <p>
                Return to tricky problems and explain the approach in your own
                words.
              </p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}

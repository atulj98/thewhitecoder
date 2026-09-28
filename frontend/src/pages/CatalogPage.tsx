import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Braces,
  CheckCircle2,
  CircuitBoard,
  Database,
  Layers3,
  Network,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { getSheets } from "../api/sheets";

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
              <Sparkles size={15} /> YOUR LEARNING, MAPPED OUT
            </span>
            <h1>
              A clearer path to <em>technical mastery.</em>
            </h1>
            <p>
              Focused study sheets for the subjects that matter. Follow each
              topic in order, build your foundations, and keep moving forward.
            </p>
            <a className="primary-button" href="#sheets">
              Explore the sheets <ArrowRight size={18} />
            </a>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="hero-card card-back">
              <span>01</span>
              <Braces size={31} />
              <b>Foundations</b>
              <small>Start with the basics</small>
            </div>
            <div className="hero-card card-front">
              <span>02</span>
              <Network size={31} />
              <b>Core concepts</b>
              <small>Make the connections</small>
              <div className="card-progress">
                <i />
              </div>
            </div>
            <div className="visual-chip">
              <CheckCircle2 size={16} /> Learn step by step
            </div>
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
              <span className="section-kicker">THE COLLECTION</span>
              <h2 id="catalog-title">
                Choose your next subject<span className="period">.</span>
              </h2>
            </div>
            <p>
              Five focused tracks, each designed to become a practical,
              step-by-step learning path.
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
          {sheets && (
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
                        {visual.number} / 05
                      </span>
                    </div>
                    <span className="subject-short">{visual.short}</span>
                    <h3>{sheet.title}</h3>
                    <p>{sheet.description}</p>
                    <div className="sheet-card-bottom">
                      <span
                        className={
                          sheet.is_published ? "status-ready" : "status-soon"
                        }
                      >
                        {sheet.is_published
                          ? "Explore sheet"
                          : "Content coming soon"}
                      </span>
                      <span className="card-arrow">
                        <ArrowRight size={19} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <section className="method-section">
        <div className="container method-inner">
          <span className="method-icon">
            <CheckCircle2 size={24} />
          </span>
          <div>
            <h2>Progress at your own pace.</h2>
            <p>
              Start exploring freely. Personal progress and sign-in are the next
              features on our roadmap.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

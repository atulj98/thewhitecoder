import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CircleHelp,
  RefreshCw,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getSheet } from "../api/sheets";

function jumpToStep(stableKey: string) {
  const heading = document.getElementById(`step-heading-${stableKey}`);
  heading?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "start",
  });
  heading?.focus({ preventScroll: true });
}

export default function SheetPage() {
  const { slug = "" } = useParams();
  const {
    data: sheet,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["sheet", slug],
    queryFn: () => getSheet(slug),
    enabled: Boolean(slug),
  });
  return (
    <section className="sheet-page">
      <div className="container">
        <Link className="back-link" to="/">
          <ArrowLeft size={17} /> All study sheets
        </Link>
        {isPending && (
          <div className="status-panel" role="status">
            Loading this sheet…
          </div>
        )}
        {isError && (
          <div className="status-panel" role="alert">
            <CircleHelp size={27} />
            <h1>
              {error?.message === "Sheet not found"
                ? "Sheet not found"
                : "Unable to load this sheet"}
            </h1>
            <p>Check the link or try again in a moment.</p>
            <button className="text-button" onClick={() => refetch()}>
              <RefreshCw size={16} /> Try again
            </button>
          </div>
        )}
        {sheet && (
          <>
            <div className="sheet-heading">
              <span className="section-kicker">
                STUDY SHEET / {sheet.slug.toUpperCase()}
              </span>
              <h1>
                {sheet.title}
                <span className="period">.</span>
              </h1>
              <p>{sheet.description}</p>
              {sheet.is_published && (
                <p className="sheet-count">
                  {sheet.steps.length} ordered steps ·{" "}
                  {sheet.steps.reduce(
                    (count, step) => count + step.topics.length,
                    0,
                  )}{" "}
                  topics
                </p>
              )}
            </div>
            {!sheet.is_published ? (
              <div className="empty-content">
                <span className="empty-icon">
                  <BookOpen size={32} />
                </span>
                <span className="section-kicker">IN PREPARATION</span>
                <h2>We're putting this path together.</h2>
                <p>
                  The step-by-step topics for this subject will appear here once
                  the sheet has been reviewed and published.
                </p>
                <Link className="primary-button dark" to="/">
                  Explore other subjects <ArrowLeft size={17} />
                </Link>
              </div>
            ) : (
              <>
                <details className="step-navigation">
                  <summary>Jump to a step</summary>
                  <ol>
                    {sheet.steps.map((step, index) => (
                      <li key={step.stable_key}>
                        <button
                          type="button"
                          onClick={() => jumpToStep(step.stable_key)}
                        >
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          {step.title}
                        </button>
                      </li>
                    ))}
                  </ol>
                </details>
                <div className="steps-list" aria-label="Learning steps">
                  {sheet.steps.map((step, stepIndex) => (
                    <section className="step-block" key={step.stable_key}>
                      <div className="step-label">
                        STEP {String(stepIndex + 1).padStart(2, "0")}
                      </div>
                      <h2 id={`step-heading-${step.stable_key}`} tabIndex={-1}>
                        {step.title}
                      </h2>
                      {step.topics.map((topic) => (
                        <details className="topic" key={topic.stable_key}>
                          <summary>
                            <span>{topic.title}</span>
                            <span>
                              {topic.items.length}{" "}
                              {topic.items.length === 1 ? "item" : "items"}
                            </span>
                          </summary>
                          <ol>
                            {topic.items.map((item) => (
                              <li key={item.stable_key}>
                                <span className="item-kind">
                                  {item.kind.replaceAll("_", " ")}
                                </span>
                                <span className="item-title">{item.title}</span>
                                {item.source_url && (
                                  <a
                                    href={item.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`Open ${item.title} in a new tab`}
                                  >
                                    <ArrowUpRight size={17} />
                                  </a>
                                )}
                              </li>
                            ))}
                          </ol>
                        </details>
                      ))}
                    </section>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}

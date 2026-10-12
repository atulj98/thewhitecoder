import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  CircleHelp,
  RefreshCw,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getSheet } from "../api/sheets";
import {
  accountRequest,
  accountsEnabled,
  progressPath,
  questionKey,
} from "../api/account";
import CompletionCheckbox from "../components/CompletionCheckbox";
import NotesDialog from "../components/NotesDialog";
import { useSheetProgress } from "../lib/useSheetProgress";

function jumpToStep(stableKey: string) {
  const heading = document.getElementById(`step-heading-${stableKey}`);
  const step = heading?.closest("details");
  if (step) step.open = true;
  heading?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "start",
  });
  heading?.focus({ preventScroll: true });
}

function platformName(url: string) {
  const host = new URL(url).hostname;
  if (host === "leetcode.com" || host === "www.leetcode.com") return "LeetCode";
  if (host === "geeksforgeeks.org" || host === "www.geeksforgeeks.org")
    return "GeeksforGeeks";
  if (host === "codeforces.com" || host === "www.codeforces.com")
    return "Codeforces";
  return "Open question";
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
  const tracking = useSheetProgress(slug, sheet);
  const [note, setNote] = useState<{
    step: string;
    topic: string;
    item: string;
    title: string;
    notes: string;
    owner: string;
  } | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState("");
  async function openNotes(
    step: string,
    topic: string,
    item: string,
    title: string,
  ) {
    const owner = tracking.account.data?.user.id;
    if (!owner) return;
    setNotesLoading(true);
    setNotesError("");
    try {
      const result = await accountRequest<{ notes: string }>(
        progressPath(slug, "questions", step, topic, item, "notes"),
      );
      setNote({ owner, step, topic, item, title, notes: result.notes });
    } catch (failure) {
      setNotesError(
        failure instanceof Error ? failure.message : "Unable to load notes.",
      );
    } finally {
      setNotesLoading(false);
    }
  }
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
                  topics ·{" "}
                  {sheet.steps.reduce(
                    (count, step) =>
                      count +
                      step.topics.reduce(
                        (topicCount, topic) =>
                          topicCount +
                          topic.items.filter((item) => item.kind === "practice")
                            .length,
                        0,
                      ),
                    0,
                  )}{" "}
                  questions
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
                  Back to available sheets <ArrowLeft size={17} />
                </Link>
              </div>
            ) : (
              <>
                <div className="progress-panel" aria-label="My progress">
                  {tracking.account.data ? (
                    <>
                      <strong>My progress</strong>
                      {tracking.progress.data && tracking.aligned && (
                        <>
                          <span aria-live="polite">
                            {tracking.progress.data.completed}/{tracking.total}{" "}
                            questions completed
                            {" · "}
                            {tracking.total
                              ? Math.round(
                                  (100 * tracking.progress.data.completed) /
                                    tracking.total,
                                )
                              : 0}
                            %
                          </span>
                          <progress
                            aria-label="Completed questions"
                            max={tracking.total || 1}
                            value={tracking.progress.data.completed}
                          />
                        </>
                      )}
                      {tracking.progress.isPending && (
                        <p role="status">Loading your progress…</p>
                      )}
                      {tracking.progress.isError && (
                        <p role="alert">
                          Your saved progress could not load.{" "}
                          <button
                            className="text-button"
                            onClick={() => void tracking.progress.refetch()}
                          >
                            Retry
                          </button>
                        </p>
                      )}
                      {tracking.progress.data && !tracking.aligned && (
                        <p role="alert">
                          This sheet and your saved progress are using different
                          versions. Refresh the page or try again later.
                        </p>
                      )}
                      {tracking.account.isError && (
                        <p role="alert">
                          Account connection lost. Use Retry account above.
                        </p>
                      )}
                      {tracking.change.isPending && (
                        <p role="status">Saving…</p>
                      )}
                      {notesLoading && <p role="status">Loading notes…</p>}
                      {notesError && <p role="alert">{notesError}</p>}
                      {tracking.change.isError && (
                        <p role="alert">{tracking.change.error.message}</p>
                      )}
                    </>
                  ) : (
                    <p>
                      {accountsEnabled
                        ? "Sign in with Google above to save your progress and private notes."
                        : "Google sign-in and saved progress will be available here soon."}
                    </p>
                  )}
                </div>
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
                  {sheet.steps.map((step, stepIndex) => {
                    const questionCount = step.topics.reduce(
                      (count, topic) =>
                        count +
                        topic.items.filter((item) => item.kind === "practice")
                          .length,
                      0,
                    );
                    const completedCount = step.topics.reduce(
                      (count, topic) =>
                        count +
                        topic.items.filter(
                          (item) =>
                            item.kind === "practice" &&
                            tracking.entries.get(
                              questionKey(
                                step.stable_key,
                                topic.stable_key,
                                item.stable_key,
                              ),
                            )?.completed,
                        ).length,
                      0,
                    );
                    return (
                      <details className="step-block" key={step.stable_key}>
                        <summary
                          className="step-summary"
                          id={`step-heading-${step.stable_key}`}
                        >
                          <h2>
                            <span className="step-summary-heading">
                              <span className="step-label">
                                STEP {String(stepIndex + 1).padStart(2, "0")}
                              </span>
                              <span className="step-title">{step.title}</span>
                              <span className="step-summary-meta">
                                {step.topics.length}{" "}
                                {step.topics.length === 1
                                  ? "subtopic"
                                  : "subtopics"}
                                {" · "}
                                {tracking.account.data && tracking.aligned
                                  ? completedCount + "/"
                                  : ""}
                                {questionCount}{" "}
                                {questionCount === 1 ? "question" : "questions"}
                              </span>
                            </span>
                            <ChevronDown
                              className="step-chevron"
                              size={22}
                              aria-hidden="true"
                            />
                          </h2>
                        </summary>
                        <div className="step-topics">
                          {step.topics.map((topic) => {
                            const concepts = topic.items.filter(
                              (item) => item.kind === "concept",
                            );
                            const questions = topic.items.filter(
                              (item) => item.kind === "practice",
                            );
                            const resources = topic.items.filter(
                              (item) =>
                                item.kind !== "concept" &&
                                item.kind !== "practice",
                            );
                            const done = questions.filter(
                              (item) =>
                                tracking.entries.get(
                                  questionKey(
                                    step.stable_key,
                                    topic.stable_key,
                                    item.stable_key,
                                  ),
                                )?.completed,
                            ).length;
                            return (
                              <details className="topic" key={topic.stable_key}>
                                <summary>
                                  <span>{topic.title}</span>
                                  <span className="topic-summary-meta">
                                    <span>
                                      {tracking.account.data &&
                                      tracking.aligned &&
                                      questions.length > 0
                                        ? done + "/"
                                        : ""}
                                      {questions.length || topic.items.length}{" "}
                                      {questions.length
                                        ? questions.length === 1
                                          ? "question"
                                          : "questions"
                                        : topic.items.length === 1
                                          ? "item"
                                          : "items"}
                                    </span>
                                    <ChevronDown
                                      className="topic-chevron"
                                      size={17}
                                      aria-hidden="true"
                                    />
                                  </span>
                                </summary>
                                <div className="topic-body">
                                  {questions.length > 0 && (
                                    <label className="topic-completion">
                                      <CompletionCheckbox
                                        checked={done === questions.length}
                                        partial={
                                          done > 0 && done < questions.length
                                        }
                                        disabled={!tracking.canEdit}
                                        label={
                                          "Mark all questions in " +
                                          topic.title +
                                          " complete"
                                        }
                                        onChange={(completed) =>
                                          tracking.change.mutate({
                                            step: step.stable_key,
                                            topic: topic.stable_key,
                                            completed,
                                          })
                                        }
                                      />
                                      <span>
                                        Mark topic done{" "}
                                        <small>
                                          Includes all {questions.length}{" "}
                                          questions
                                        </small>
                                      </span>
                                    </label>
                                  )}

                                  {concepts.map((item) => (
                                    <p
                                      className="study-focus"
                                      key={item.stable_key}
                                    >
                                      <strong>Study focus</strong> {item.title}
                                    </p>
                                  ))}
                                  {questions.length > 0 && (
                                    <p className="practice-note">
                                      Solve these in order. Revisit the study
                                      focus if you get stuck.
                                    </p>
                                  )}
                                  {questions.length > 0 && (
                                    <div className="question-table-scroll">
                                      <table className="question-table">
                                        <thead>
                                          <tr>
                                            <th scope="col">Question</th>
                                            <th scope="col">Content</th>
                                            <th scope="col">Practice</th>
                                            <th scope="col">My notes</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {questions.map((item, index) => (
                                            <tr key={item.stable_key}>
                                              <td>
                                                <div className="question-completion">
                                                  <CompletionCheckbox
                                                    checked={Boolean(
                                                      tracking.entries.get(
                                                        questionKey(
                                                          step.stable_key,
                                                          topic.stable_key,
                                                          item.stable_key,
                                                        ),
                                                      )?.completed,
                                                    )}
                                                    disabled={!tracking.canEdit}
                                                    label={
                                                      "Mark " +
                                                      item.title +
                                                      " complete"
                                                    }
                                                    onChange={(completed) =>
                                                      tracking.change.mutate({
                                                        step: step.stable_key,
                                                        topic: topic.stable_key,
                                                        item: item.stable_key,
                                                        completed,
                                                      })
                                                    }
                                                  />
                                                  <span>
                                                    <span className="question-number">
                                                      {String(
                                                        index + 1,
                                                      ).padStart(2, "0")}
                                                    </span>{" "}
                                                    {item.title}
                                                  </span>
                                                </div>
                                              </td>
                                              <td>
                                                {item.content_url ? (
                                                  <a
                                                    href={item.content_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    aria-label={`Read content for ${item.title} in a new tab`}
                                                  >
                                                    Read{" "}
                                                    <ArrowUpRight size={14} />
                                                  </a>
                                                ) : (
                                                  <span
                                                    className="missing-link"
                                                    aria-label="Content link coming soon"
                                                  >
                                                    -
                                                  </span>
                                                )}
                                              </td>
                                              <td>
                                                {item.source_url ? (
                                                  <a
                                                    href={item.source_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    aria-label={`Solve ${item.title} on ${platformName(item.source_url)} in a new tab`}
                                                  >
                                                    {platformName(
                                                      item.source_url,
                                                    )}{" "}
                                                    <ArrowUpRight size={14} />
                                                  </a>
                                                ) : (
                                                  <span className="missing-link">
                                                    -
                                                  </span>
                                                )}
                                              </td>
                                              <td>
                                                <button
                                                  className="notes-button"
                                                  disabled={
                                                    !tracking.canEdit ||
                                                    notesLoading
                                                  }
                                                  aria-label={
                                                    "Edit private notes for " +
                                                    item.title
                                                  }
                                                  onClick={() =>
                                                    void openNotes(
                                                      step.stable_key,
                                                      topic.stable_key,
                                                      item.stable_key,
                                                      item.title,
                                                    )
                                                  }
                                                >
                                                  {tracking.entries.get(
                                                    questionKey(
                                                      step.stable_key,
                                                      topic.stable_key,
                                                      item.stable_key,
                                                    ),
                                                  )?.has_notes
                                                    ? "Edit notes"
                                                    : "Add notes"}
                                                </button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                  {resources.length > 0 && (
                                    <ul className="topic-resources">
                                      {resources.map((item) => (
                                        <li key={item.stable_key}>
                                          {item.source_url ? (
                                            <a
                                              href={item.source_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                            >
                                              {item.title}{" "}
                                              <ArrowUpRight size={14} />
                                            </a>
                                          ) : (
                                            item.title
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </details>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
        {note &&
          tracking.account.data &&
          note.owner === tracking.account.data.user.id && (
            <NotesDialog
              key={
                tracking.account.data.user.id +
                questionKey(note.step, note.topic, note.item)
              }
              title={note.title}
              initialNotes={note.notes}
              onClose={() => setNote(null)}
              onSave={(notes) =>
                tracking.change.mutateAsync({
                  step: note.step,
                  topic: note.topic,
                  item: note.item,
                  notes,
                })
              }
            />
          )}
      </div>
    </section>
  );
}

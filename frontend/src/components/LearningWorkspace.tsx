import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ListTree,
  Search,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { accountsEnabled } from "../api/account";
import type { SheetDetail } from "../api/sheets";
import type { SheetTracking } from "../lib/useSheetProgress";
import {
  completedCount,
  filterQuestions,
  workspaceTopics,
  type QuestionFilter,
  type WorkspaceQuestion,
  type WorkspaceTopic,
} from "../lib/workspace";
import CompletionCheckbox from "./CompletionCheckbox";
import NotesPanel from "./NotesPanel";
import RoadmapStep from "./WorkspaceRoadmapStep";
import WorkspaceQuestions from "./WorkspaceQuestions";
import { getProgrammingLesson } from "../learning/lessons";
import LessonArticle from "../learning/LessonArticle";
import LessonLab from "../learning/LessonLab";
import "../workspace.css";

export default function LearningWorkspace({
  sheet,
  tracking,
}: {
  sheet: SheetDetail;
  tracking: SheetTracking;
}) {
  const contexts = useMemo(() => workspaceTopics(sheet), [sheet]);
  const questions = useMemo(
    () => contexts.flatMap((context) => context.questions),
    [contexts],
  );
  const [params, setParams] = useSearchParams();
  const current =
    contexts.find(
      (context) =>
        context.step.stable_key === params.get("step") &&
        context.topic.stable_key === params.get("topic"),
    ) ?? contexts[0];
  const selected =
    current?.questions.find(
      (question) => question.item.stable_key === params.get("question"),
    ) ?? current?.questions[0];
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<QuestionFilter>("all");
  const [navOpen, setNavOpen] = useState(false);
  const [notesFocusKey, setNotesFocusKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const ready = Boolean(
    tracking.account.data &&
    tracking.aligned &&
    !tracking.account.isError &&
    !tracking.progress.isError,
  );
  const searching = Boolean(search.trim());
  const lesson = getProgrammingLesson(
    sheet.slug,
    current?.step.stable_key ?? "",
    current?.topic.stable_key ?? "",
  );
  const requestedView = params.get("view");
  const view =
    !lesson || searching
      ? "practice"
      : requestedView === "learn" ||
          requestedView === "visualize" ||
          requestedView === "practice"
        ? requestedView
        : params.has("question")
          ? "practice"
          : "learn";
  const visible = filterQuestions(
    searching ? questions : (current?.questions ?? []),
    search,
    ready ? filter : "all",
    ready ? tracking.entries : new Map(),
  );
  const next = ready
    ? questions.find(
        (question) => !tracking.entries.get(question.key)?.completed,
      )
    : questions[0];
  const totalDone = ready ? completedCount(questions, tracking.entries) : 0;
  const topicDone =
    ready && current ? completedCount(current.questions, tracking.entries) : 0;
  const percentage = questions.length
    ? Math.round((100 * totalDone) / questions.length)
    : 0;
  const mainHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!Object.keys(drafts).length) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [drafts]);
  function navigate(context: WorkspaceTopic, question?: WorkspaceQuestion) {
    const value = new URLSearchParams(params);
    value.set("step", context.step.stable_key);
    value.set("topic", context.topic.stable_key);
    if (question) {
      value.set("question", question.item.stable_key);
      value.set("view", "practice");
    } else {
      value.delete("question");
      value.delete("view");
    }
    setParams(value, { preventScrollReset: true });
    setNavOpen(false);
    setNotesFocusKey(null);
  }
  function selectQuestion(question: WorkspaceQuestion) {
    const context = contexts.find(
      (candidate) =>
        candidate.step.stable_key === question.step.stable_key &&
        candidate.topic.stable_key === question.topic.stable_key,
    )!;
    navigate(context, question);
  }
  function showView(nextView: "learn" | "visualize" | "practice") {
    const value = new URLSearchParams(params);
    value.set("step", current.step.stable_key);
    value.set("topic", current.topic.stable_key);
    value.set("view", nextView);
    setParams(value, { preventScrollReset: true });
    setSearch("");
    requestAnimationFrame(() => {
      mainHeading.current?.focus({ preventScroll: true });
      mainHeading.current?.scrollIntoView?.({ block: "start" });
    });
  }
  function setDraft(
    key: string,
    value: string | undefined,
    savedValue?: string,
  ) {
    setDrafts((existing) => {
      // A note can finish saving after the student has returned and typed more.
      if (savedValue !== undefined && existing[key] !== savedValue)
        return existing;
      const result = { ...existing };
      if (value === undefined) delete result[key];
      else result[key] = value;
      return result;
    });
  }
  if (!current)
    return (
      <div className="container status-panel">
        This sheet has no published topics yet.
      </div>
    );
  return (
    <section className="learning-workspace" aria-label="Learning workspace">
      <div className="workspace-topline">
        <Link className="back-link" to="/">
          <ArrowLeft size={15} /> Study sheets
        </Link>
        <span>YOUR LEARNING WORKSPACE</span>
        <span>
          {sheet.steps.length} steps · {questions.length} questions
        </span>
      </div>
      <div className="workspace-welcome">
        <div>
          <span className="section-kicker">
            {sheet.slug.toUpperCase()} / ONE STEP AT A TIME
          </span>
          <h1>
            {lesson && view !== "practice"
              ? "Build your programming foundations."
              : ready && totalDone === questions.length
                ? "Look how far you've come."
                : "Pick up your next question."}
          </h1>
          <p>{sheet.description} Your own pace, your own progress.</p>
        </div>
        <button
          className="primary-button workspace-continue"
          disabled={!next || Boolean(tracking.account.data && !ready)}
          onClick={() => {
            if (next) {
              setSearch("");
              setFilter("all");
              const context = contexts.find((candidate) =>
                candidate.questions.some(
                  (question) => question.key === next.key,
                ),
              )!;
              if (
                !ready &&
                getProgrammingLesson(
                  sheet.slug,
                  context.step.stable_key,
                  context.topic.stable_key,
                )
              )
                navigate(context);
              else selectQuestion(next);
              requestAnimationFrame(() =>
                mainHeading.current?.focus({ preventScroll: true }),
              );
            }
          }}
        >
          {ready
            ? next
              ? "Continue learning"
              : "All questions completed"
            : "Start learning"}
          <ArrowRight size={17} />
        </button>
      </div>
      <div className="workspace-account-strip" aria-label="My progress">
        {ready ? (
          <>
            <strong>
              {totalDone}
              <span> / {questions.length} questions done</span>
            </strong>
            <progress
              aria-label="Overall question progress"
              max={questions.length || 1}
              value={totalDone}
            />
            <span>{percentage}% complete</span>
          </>
        ) : tracking.account.isError ? (
          <p role="alert">
            Your account connection needs attention. Use Retry account above.
          </p>
        ) : tracking.account.data ? (
          tracking.progress.isError ? (
            <p role="alert">
              We couldn't load your progress.{" "}
              <button
                className="text-button"
                onClick={() => void tracking.progress.refetch()}
              >
                Retry progress
              </button>
            </p>
          ) : tracking.progress.data && !tracking.aligned ? (
            <p role="alert">
              This sheet and your saved progress use different versions. Refresh
              or try again later.
            </p>
          ) : (
            <p role="status">Loading your saved progress…</p>
          )
        ) : tracking.account.isPending && accountsEnabled ? (
          <p role="status">Checking your account…</p>
        ) : (
          <p>
            {accountsEnabled
              ? "Explore freely. Sign in with Google above to save progress and private notes."
              : "Explore freely. Saved progress becomes available when Google sign-in is configured."}
          </p>
        )}
        {tracking.change.isPending && (
          <span className="workspace-sync" role="status">
            Saving…
          </span>
        )}
        {tracking.change.isError && (
          <span className="workspace-error" role="alert">
            {tracking.change.error.message}
          </span>
        )}
      </div>
      <div
        className={`workspace-layout ${view !== "practice" ? "has-lesson-view" : ""}`}
      >
        <aside
          className={`workspace-roadmap ${navOpen ? "is-open" : ""}`}
          aria-label="Topic navigation"
        >
          <button
            className="workspace-roadmap-toggle"
            aria-expanded={navOpen}
            aria-controls="workspace-roadmap-list"
            onClick={() => setNavOpen(!navOpen)}
          >
            <ListTree size={17} /> Browse topics <ChevronDown size={16} />
          </button>
          <div
            className="workspace-roadmap-content"
            id="workspace-roadmap-list"
          >
            <div className="workspace-panel-label">
              <ListTree size={16} /> THE ROADMAP
            </div>
            <p>Small steps. Strong foundations.</p>
            {sheet.steps
              .filter((step) => step.topics.length)
              .map((step) => (
                <RoadmapStep
                  key={step.stable_key}
                  contexts={contexts.filter(
                    (context) => context.step.stable_key === step.stable_key,
                  )}
                  current={current}
                  tracking={tracking}
                  select={(context) => {
                    navigate(context);
                    setSearch("");
                    mainHeading.current?.focus({ preventScroll: true });
                  }}
                />
              ))}
          </div>
        </aside>
        <div className="workspace-practice">
          <div className="workspace-topic-heading">
            <span className="workspace-breadcrumb">
              STEP {String(current.stepIndex + 1).padStart(2, "0")} /{" "}
              {current.step.title}
            </span>
            <h2 ref={mainHeading} tabIndex={-1}>
              {searching ? "Find your next problem." : current.topic.title}
            </h2>
            <p>
              {searching
                ? "Search questions and topics across the whole sheet."
                : "Understand the idea. Solve the problems. Make it yours."}
            </p>
          </div>
          {!searching && (
            <>
              <div className="workspace-topic-stats">
                <span>
                  {ready
                    ? `${topicDone} of ${current.questions.length} completed`
                    : `${current.questions.length} practice questions`}
                </span>
                {ready && current.questions.length > 0 && (
                  <progress
                    aria-label="Subtopic question progress"
                    max={current.questions.length}
                    value={topicDone}
                  />
                )}
              </div>
              {!lesson &&
                current.topic.items.filter((item) => item.kind !== "practice")
                  .length > 0 && (
                  <details className="workspace-study-focus">
                    <summary>
                      <BookOpen size={15} /> Study focus & resources{" "}
                      <ChevronDown size={15} />
                    </summary>
                    <ul>
                      {current.topic.items
                        .filter((item) => item.kind !== "practice")
                        .map((item) => (
                          <li key={item.stable_key}>
                            {item.title}
                            {(item.content_url || item.source_url) && (
                              <a
                                href={item.content_url || item.source_url!}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Read <ArrowUpRight size={13} />
                              </a>
                            )}
                          </li>
                        ))}
                    </ul>
                  </details>
                )}
            </>
          )}
          {lesson && !searching && (
            <div
              className="lesson-view-switch"
              role="group"
              aria-label="Subtopic learning views"
            >
              <button
                aria-pressed={view === "learn"}
                onClick={() => showView("learn")}
              >
                Learn
              </button>
              <button
                aria-pressed={view === "visualize"}
                onClick={() => showView("visualize")}
              >
                Visualize
              </button>
              <button
                aria-pressed={view === "practice"}
                onClick={() => showView("practice")}
              >
                Practice ({current.questions.length})
              </button>
            </div>
          )}
          <div className="workspace-tools">
            <label className="workspace-search">
              <Search size={17} />
              <input
                type="search"
                value={search}
                placeholder="Search the whole sheet…"
                aria-label="Search all questions"
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button aria-label="Clear search" onClick={() => setSearch("")}>
                  <X size={15} />
                </button>
              )}
            </label>
            {view === "practice" && (
              <div className="workspace-filters" aria-label="Question filters">
                {(
                  [
                    ["all", "All"],
                    ["unsolved", "Unsolved"],
                    ["solved", "Solved"],
                    ["notes", "Has notes"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={(ready ? filter : "all") === value}
                    disabled={value !== "all" && !ready}
                    title={
                      value !== "all" && !ready
                        ? "Sign in to filter your progress"
                        : undefined
                    }
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {lesson && view === "learn" && (
            <LessonArticle
              key={current.key}
              lesson={lesson}
              onVisualize={() => showView("visualize")}
            />
          )}
          {lesson && view === "visualize" && (
            <LessonLab
              key={current.key}
              lesson={lesson}
              onPractice={() => showView("practice")}
            />
          )}
          {view === "practice" && (
            <>
              <div className="workspace-list-meta">
                <span>
                  {visible.length}{" "}
                  {visible.length === 1 ? "question" : "questions"}
                  {searching ? " found" : " shown"}
                </span>
                {!searching && current.questions.length > 0 && (
                  <label className="workspace-mark-all">
                    <CompletionCheckbox
                      checked={ready && topicDone === current.questions.length}
                      disabled={!tracking.canEdit}
                      label={`Mark all ${current.questions.length} questions in ${current.topic.title} complete`}
                      onChange={(completed) =>
                        tracking.change.mutate({
                          step: current.step.stable_key,
                          topic: current.topic.stable_key,
                          completed,
                        })
                      }
                    />
                    <span>
                      Mark subtopic done
                      <small>All {current.questions.length} questions</small>
                    </span>
                  </label>
                )}
              </div>
              <WorkspaceQuestions
                slug={sheet.slug}
                visible={visible}
                selected={selected}
                ready={ready}
                tracking={tracking}
                searching={searching}
                drafts={drafts}
                onSelect={selectQuestion}
                onLearn={(question) => {
                  const context = contexts.find(
                    (candidate) =>
                      candidate.step.stable_key === question.step.stable_key &&
                      candidate.topic.stable_key === question.topic.stable_key,
                  )!;
                  setSearch("");
                  navigate(context);
                  requestAnimationFrame(() => {
                    mainHeading.current?.focus({ preventScroll: true });
                    mainHeading.current?.scrollIntoView?.({ block: "start" });
                  });
                }}
                onFocusNotes={(question) => {
                  selectQuestion(question);
                  setNotesFocusKey(question.key);
                }}
              />
              {!visible.length && (
                <div className="workspace-no-results">
                  <Search size={23} />
                  <h3>
                    {searching || filter !== "all"
                      ? "No matching questions."
                      : "No practice questions in this subtopic yet."}
                  </h3>
                  <p>
                    {searching || filter !== "all"
                      ? "Try another search or show all questions."
                      : "Explore the study focus or choose another subtopic."}
                  </p>
                  {(searching || filter !== "all") && (
                    <button
                      className="text-button"
                      onClick={() => {
                        setSearch("");
                        setFilter("all");
                      }}
                    >
                      Reset search & filters
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          <div className="workspace-topic-footer">
            <span>
              {Object.keys(drafts).length
                ? `${Object.keys(drafts).length} unsaved note ${Object.keys(drafts).length === 1 ? "draft" : "drafts"}`
                : "One question at a time is still progress."}
            </span>
            {contexts[contexts.indexOf(current) + 1] && (
              <button
                className="text-button"
                onClick={() => {
                  navigate(contexts[contexts.indexOf(current) + 1]);
                  setSearch("");
                  mainHeading.current?.focus({ preventScroll: true });
                }}
              >
                Next subtopic <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
        {view === "practice" && (
          <NotesPanel
            key={selected?.key ?? "empty"}
            slug={sheet.slug}
            question={selected}
            tracking={tracking}
            draft={selected ? drafts[selected.key] : undefined}
            setDraft={setDraft}
            focusRequested={notesFocusKey === selected?.key}
          />
        )}
      </div>
    </section>
  );
}

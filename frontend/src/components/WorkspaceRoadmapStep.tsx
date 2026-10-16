import { useEffect, useRef } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { SheetTracking } from "../lib/useSheetProgress";
import { completedCount, type WorkspaceTopic } from "../lib/workspace";

export default function RoadmapStep({
  contexts,
  current,
  select,
  tracking,
}: {
  contexts: WorkspaceTopic[];
  current: WorkspaceTopic;
  select: (context: WorkspaceTopic) => void;
  tracking: SheetTracking;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const active = contexts[0].step.stable_key === current.step.stable_key;
  useEffect(() => {
    if (active && details.current) details.current.open = true;
  }, [active]);
  const questions = contexts.flatMap((context) => context.questions);
  const ready = Boolean(
    tracking.account.data &&
    tracking.aligned &&
    !tracking.account.isError &&
    !tracking.progress.isError,
  );
  const done = ready ? completedCount(questions, tracking.entries) : 0;
  return (
    <details className="workspace-step" ref={details}>
      <summary>
        <span
          className={`workspace-step-number ${ready && questions.length > 0 && done === questions.length ? "is-complete" : ""}`}
        >
          {ready && questions.length > 0 && done === questions.length ? (
            <Check size={13} />
          ) : (
            String(contexts[0].stepIndex + 1).padStart(2, "0")
          )}
        </span>
        <span className="workspace-step-title">
          {contexts[0].step.title}
          <small>
            {ready ? `${done}/` : ""}
            {questions.length} questions
          </small>
        </span>
        <ChevronDown className="workspace-chevron" size={15} />
      </summary>
      <div className="workspace-topic-list">
        {contexts.map((context) => {
          const count = ready
            ? completedCount(context.questions, tracking.entries)
            : 0;
          return (
            <button
              key={context.key}
              type="button"
              className={current.key === context.key ? "is-active" : ""}
              aria-current={
                current.key === context.key ? "location" : undefined
              }
              onClick={() => select(context)}
            >
              <span>{context.topic.title}</span>
              <small>
                {ready ? `${count}/` : ""}
                {context.questions.length}
              </small>
            </button>
          );
        })}
      </div>
    </details>
  );
}

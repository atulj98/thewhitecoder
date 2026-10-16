import { ArrowUpRight, FilePenLine } from "lucide-react";
import CompletionCheckbox from "./CompletionCheckbox";
import { platformName, type WorkspaceQuestion } from "../lib/workspace";
import type { SheetTracking } from "../lib/useSheetProgress";
import { getProgrammingLesson } from "../learning/lessons";

export default function WorkspaceQuestions({
  slug,
  visible,
  selected,
  ready,
  tracking,
  searching,
  drafts,
  onSelect,
  onLearn,
  onFocusNotes,
}: {
  slug: string;
  visible: WorkspaceQuestion[];
  selected: WorkspaceQuestion | undefined;
  ready: boolean;
  tracking: SheetTracking;
  searching: boolean;
  drafts: Record<string, string>;
  onSelect: (question: WorkspaceQuestion) => void;
  onLearn: (question: WorkspaceQuestion) => void;
  onFocusNotes: (question: WorkspaceQuestion) => void;
}) {
  return (
    <div className="workspace-question-list" aria-label="Practice questions">
      {visible.map((question) => {
        const entry = ready ? tracking.entries.get(question.key) : undefined;
        return (
          <article
            key={question.key}
            className={`workspace-question ${selected?.key === question.key ? "is-selected" : ""} ${entry?.completed ? "is-complete" : ""}`}
          >
            <div className="workspace-question-main">
              <CompletionCheckbox
                checked={Boolean(entry?.completed)}
                disabled={!tracking.canEdit}
                label={`Mark ${question.item.title} complete`}
                onChange={(completed) =>
                  tracking.change.mutate({
                    step: question.step.stable_key,
                    topic: question.topic.stable_key,
                    item: question.item.stable_key,
                    completed,
                  })
                }
              />
              <span className="workspace-question-number">
                {String(question.index + 1).padStart(2, "0")}
              </span>
              <button
                className="workspace-question-title"
                onClick={() => onSelect(question)}
                aria-pressed={selected?.key === question.key}
              >
                {question.item.title}
                {searching && (
                  <small>
                    {question.step.title} / {question.topic.title}
                  </small>
                )}
              </button>
            </div>
            <div className="workspace-question-actions">
              <span className="workspace-content-link">
                Content{" "}
                {getProgrammingLesson(
                  slug,
                  question.step.stable_key,
                  question.topic.stable_key,
                ) ? (
                  <button
                    className="workspace-content-read"
                    aria-label={`Read lesson for ${question.topic.title}`}
                    onClick={() => onLearn(question)}
                  >
                    Learn
                  </button>
                ) : question.item.content_url ? (
                  <a
                    href={question.item.content_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Read <ArrowUpRight size={12} />
                  </a>
                ) : (
                  <span aria-label="Content coming soon">—</span>
                )}
              </span>
              {question.item.source_url && (
                <a
                  className="workspace-solve-link"
                  href={question.item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {platformName(question.item.source_url)}
                  <ArrowUpRight size={13} />
                </a>
              )}
              <button
                className={`workspace-notes-button ${entry?.has_notes || drafts[question.key] !== undefined ? "has-note" : ""}`}
                disabled={!ready}
                aria-label={`Open notes for ${question.item.title}`}
                title={
                  entry?.has_notes ? "View saved note" : "Add a private note"
                }
                onClick={() => {
                  onFocusNotes(question);
                }}
              >
                <FilePenLine size={16} />
                {entry?.has_notes || drafts[question.key] !== undefined ? (
                  <span className="workspace-note-dot" />
                ) : null}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

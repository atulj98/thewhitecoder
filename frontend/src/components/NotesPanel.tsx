import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePenLine, LockKeyhole, Save } from "lucide-react";
import {
  accountRequest,
  ApiError,
  progressPath,
  type Account,
} from "../api/account";
import type { WorkspaceQuestion } from "../lib/workspace";
import type { SheetTracking } from "../lib/useSheetProgress";

export default function NotesPanel({
  slug,
  question,
  tracking,
  draft,
  setDraft,
  focusRequested,
}: {
  slug: string;
  question: WorkspaceQuestion | undefined;
  tracking: SheetTracking;
  draft: string | undefined;
  setDraft: (
    key: string,
    value: string | undefined,
    savedValue?: string,
  ) => void;
  focusRequested: boolean;
}) {
  const owner = tracking.account.data?.user.id;
  const allowed = Boolean(
    owner &&
    tracking.aligned &&
    !tracking.account.isError &&
    !tracking.progress.isError,
  );
  const client = useQueryClient();
  const queryKey = ["question-notes", owner, slug, question?.key];
  const notes = useQuery({
    queryKey,
    enabled: Boolean(question && allowed),
    queryFn: ({ signal }) =>
      accountRequest<{ notes: string }>(
        progressPath(
          slug,
          "questions",
          question!.step.stable_key,
          question!.topic.stable_key,
          question!.item.stable_key,
          "notes",
        ),
        { signal },
      ),
    retry: false,
    staleTime: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const mounted = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const focused = useRef(false);
  useEffect(() => {
    if (focusRequested && allowed && notes.data && !focused.current) {
      textarea.current?.focus();
      focused.current = true;
    }
    if (!focusRequested) focused.current = false;
  }, [focusRequested, allowed, notes.data]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (notes.error instanceof ApiError && notes.error.status === 401)
      void client.invalidateQueries({ queryKey: ["account"] });
  }, [notes.error, client]);
  const value = draft ?? notes.data?.notes ?? "";
  const dirty = draft !== undefined && draft !== notes.data?.notes;

  async function save() {
    if (!question || !allowed || !tracking.canEdit || !notes.data || saving)
      return;
    const captured = question;
    const text = value;
    setSaving(true);
    setError("");
    try {
      await tracking.change.mutateAsync({
        step: captured.step.stable_key,
        topic: captured.topic.stable_key,
        item: captured.item.stable_key,
        notes: text,
      });
      if (client.getQueryData<Account | null>(["account"])?.user.id !== owner)
        return;
      client.setQueryData(queryKey, { notes: text });
      setDraft(captured.key, undefined, text);
      if (mounted.current) setSaved(true);
    } catch (failure) {
      if (mounted.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "Your note could not save. Try again.",
        );
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  return (
    <aside className="workspace-notes" aria-labelledby="notes-heading">
      <div className="workspace-panel-label">
        <FilePenLine size={17} /> YOUR NOTES <LockKeyhole size={13} />
      </div>
      <h2 id="notes-heading">A little clarity for later.</h2>
      {!owner ? (
        <div className="workspace-notes-empty">
          <LockKeyhole size={25} />
          <p>
            Sign in with Google above to keep private notes for each question.
          </p>
        </div>
      ) : !question ? (
        <p className="workspace-muted">Choose a question to open its notes.</p>
      ) : !allowed ? (
        <p className="workspace-muted">
          Your notes will appear when your account and saved progress are
          connected.
        </p>
      ) : (
        <>
          <p className="workspace-note-question">{question.item.title}</p>
          {notes.isPending && <p role="status">Loading your note…</p>}
          {notes.isError && (
            <div className="workspace-message" role="alert">
              <p>{notes.error.message}</p>
              <button
                className="text-button"
                onClick={() => void notes.refetch()}
              >
                Retry notes
              </button>
            </div>
          )}
          {notes.data && !notes.isError && (
            <>
              <label className="workspace-note-label" htmlFor="question-notes">
                Private note
              </label>
              <textarea
                ref={textarea}
                id="question-notes"
                value={value}
                maxLength={10000}
                disabled={saving}
                placeholder="What clicked? Write the approach, an edge case, or something to revisit."
                onChange={(event) => {
                  setDraft(
                    question.key,
                    event.target.value === notes.data.notes
                      ? undefined
                      : event.target.value,
                  );
                  setSaved(false);
                  setError("");
                }}
                onKeyDown={(event) => {
                  if (
                    (event.ctrlKey || event.metaKey) &&
                    event.key === "Enter"
                  ) {
                    event.preventDefault();
                    void save();
                  }
                }}
              />
              <div className="workspace-note-meta">
                <span>{dirty ? "Unsaved draft" : "Private to you"}</span>
                <span>{value.length.toLocaleString()}/10,000</span>
              </div>
              <button
                className="primary-button workspace-save"
                disabled={!tracking.canEdit || !dirty || saving}
                onClick={() => void save()}
              >
                <Save size={15} />
                {saving ? "Saving…" : "Save note"}
              </button>
              <p className="workspace-note-hint">
                ⌘ / Ctrl + Enter to save. Drafts stay while you switch
                questions; save before leaving.
              </p>
              {saved && (
                <p className="workspace-save-status" role="status">
                  Note saved.
                </p>
              )}
              {error && (
                <p className="workspace-error" role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </>
      )}
    </aside>
  );
}

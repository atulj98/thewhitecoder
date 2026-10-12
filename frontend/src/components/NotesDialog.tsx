import { useEffect, useRef, useState } from "react";

export default function NotesDialog({
  title,
  initialNotes,
  onSave,
  onClose,
}: {
  title: string;
  initialNotes: string;
  onSave: (notes: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const modal = dialog.current;
    modal?.showModal();
    return () => modal?.close();
  }, []);
  async function save() {
    setSaving(true);
    setError("");
    try {
      await onSave(notes);
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Unable to save notes.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="account-dialog notes-dialog"
      onCancel={(event) => {
        if (saving) event.preventDefault();
        else onClose();
      }}
    >
      <h2>My notes</h2>
      <p>{title}</p>
      <label htmlFor="private-notes">
        Approach, mistakes, or points to revisit
      </label>
      <textarea
        id="private-notes"
        value={notes}
        maxLength={10000}
        rows={9}
        disabled={saving}
        onChange={(event) => setNotes(event.target.value)}
      />
      <p className="notes-hint">
        Private to your account · {notes.length}/10,000 characters
      </p>
      {error && (
        <p role="alert" className="account-error">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button className="account-button" disabled={saving} onClick={onClose}>
          {notes !== initialNotes ? "Discard changes" : "Close"}
        </button>
        <button
          className="primary-button"
          disabled={saving || notes === initialNotes}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save notes"}
        </button>
      </div>
    </dialog>
  );
}

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  accountRequest,
  accountsEnabled,
  ApiError,
  googleClientId,
  useAccount,
  type Account,
} from "../api/account";

interface GoogleIdentity {
  initialize: (options: {
    client_id: string;
    nonce: string;
    callback: (response: { credential: string }) => void;
    auto_select: boolean;
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: { theme: string; size: string; text: string; width: number },
  ) => void;
  disableAutoSelect: () => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
  }
}

let sdk: Promise<GoogleIdentity> | undefined;
function loadGoogle() {
  if (window.google) return Promise.resolve(window.google.accounts.id);
  if (!sdk) {
    sdk = new Promise<GoogleIdentity>((resolve, reject) => {
      const script = document.createElement("script");
      const fail = () => {
        clearTimeout(timer);
        script.remove();
        sdk = undefined;
        reject(
          new Error(
            "Google sign-in could not load. Check your connection and retry.",
          ),
        );
      };
      const timer = window.setTimeout(fail, 12000);
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => {
        clearTimeout(timer);
        if (window.google) resolve(window.google.accounts.id);
        else fail();
      };
      script.onerror = fail;
      document.head.append(script);
    });
  }
  return sdk;
}

export default function AccountControls() {
  const account = useAccount();
  const client = useQueryClient();
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const modal = dialog.current;
    modal?.showModal();
    const target = button.current;
    target?.replaceChildren();
    Promise.all([
      loadGoogle(),
      accountRequest<{ csrf_token: string }>("/auth/csrf", { method: "POST" }),
    ])
      .then(([google, challenge]) => {
        if (!active || !target) return;
        google.initialize({
          client_id: googleClientId,
          nonce: challenge.csrf_token,
          auto_select: false,
          callback: async ({ credential }) => {
            if (!active) return;
            setBusy(true);
            setError("");
            try {
              const result = await accountRequest<Account>(
                "/auth/google",
                { method: "POST", body: JSON.stringify({ credential }) },
                challenge.csrf_token,
              );
              client.removeQueries({ queryKey: ["progress"] });
              client.setQueryData(["account"], result);
              setOpen(false);
            } catch (failure) {
              if (active)
                setError(
                  failure instanceof Error
                    ? failure.message
                    : "Sign-in failed.",
                );
            } finally {
              if (active) setBusy(false);
            }
          },
        });
        google.renderButton(target, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          width: Math.min(320, target.clientWidth),
        });
      })
      .catch((failure) => {
        if (active)
          setError(
            failure instanceof Error ? failure.message : "Sign-in failed.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      modal?.close();
    };
  }, [open, attempt, client]);

  const logout = useMutation({
    mutationFn: async () => {
      try {
        await accountRequest(
          "/auth/logout",
          { method: "POST" },
          account.data?.csrf_token,
        );
      } catch (failure) {
        if (!(failure instanceof ApiError && failure.status === 401))
          throw failure;
      }
    },
    onSuccess: () => {
      window.google?.accounts.id.disableAutoSelect();
      client.removeQueries({ queryKey: ["progress"] });
      client.setQueryData(["account"], null);
    },
  });

  if (!accountsEnabled) return null;
  return (
    <div className="account-controls">
      {account.data ? (
        <>
          <span
            className="account-name"
            title={account.data.user.email}
            aria-label={"Signed in as " + account.data.user.email}
          >
            {account.data.user.name.split(" ")[0]}
          </span>
          <button
            className="account-button"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
          >
            {logout.isPending ? "Signing out…" : "Sign out"}
          </button>
        </>
      ) : (
        <button
          className="account-button"
          disabled={account.isPending}
          onClick={() => {
            if (account.isError) void account.refetch();
            else {
              setError("");
              setLoading(true);
              setBusy(false);
              setOpen(true);
            }
          }}
        >
          {account.isPending
            ? "Checking account…"
            : account.isError
              ? "Retry account"
              : "Sign in"}
        </button>
      )}
      {logout.isError && (
        <span role="alert" className="account-error">
          Sign-out failed. Retry.
        </span>
      )}
      <dialog
        ref={dialog}
        className="account-dialog"
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else setOpen(false);
        }}
      >
        <h2>Keep your learning progress.</h2>
        <p>
          Sign in with Google to save completed questions and private notes
          across your devices.
        </p>
        <div ref={button} className="google-signin" />
        {(loading || busy) && (
          <p role="status">
            {busy ? "Signing you in…" : "Loading Google sign-in…"}
          </p>
        )}
        {error && (
          <p role="alert" className="account-error">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          {error && (
            <button
              className="account-button"
              disabled={busy}
              onClick={() => {
                setError("");
                setLoading(true);
                setAttempt(attempt + 1);
              }}
            >
              Retry
            </button>
          )}
          <button
            className="account-button"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
      </dialog>
    </div>
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertIcon, CheckIcon, CloseIcon } from "@/components/icons";

/* ================================================================
   A single dialog instance, opened from anywhere via context
   ================================================================ */

type DemoDialogState = { open: () => void };

const Ctx = createContext<DemoDialogState | null>(null);

export function useDemoDialog() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDemoDialog must be used inside <DemoDialogProvider>");
  return ctx;
}

/** Deliberately permissive: reject the obviously-wrong, never the unusual. */
function emailLooksValid(value: string) {
  const v = value.trim();
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v) && v.length <= 254;
}

export function DemoDialogProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const emailId = useId();
  const companyId = useId();
  const errorId = useId();

  const open = useCallback(() => {
    setSent(false);
    setError(null);
    ref.current?.showModal();
    // Let the dialog paint before taking focus, so the caret is visible.
    requestAnimationFrame(() => emailRef.current?.focus());
  }, []);

  const close = useCallback(() => ref.current?.close(), []);

  // Clicking the backdrop closes; clicking the panel does not.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      if (e.target === el) el.close();
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailLooksValid(email)) {
      setError("Enter a work email address so we know where to send the walkthrough.");
      emailRef.current?.focus();
      return;
    }
    setError(null);
    // This demo has no backend. A production build posts to your CRM here;
    // the form contract (validation, states, focus) is already in place.
    setSent(true);
  };

  const value = useMemo(() => ({ open }), [open]);

  return (
    <Ctx.Provider value={value}>
      {children}

      <dialog
        className="modal"
        ref={ref}
        aria-labelledby={`${emailId}-title`}
        onClose={() => {
          setEmail("");
          setCompany("");
          setError(null);
        }}
      >
        <div className="modal__head">
          <div>
            <span className="eyebrow">Request a demo</span>
            <h2
              id={`${emailId}-title`}
              className="display"
              style={{ fontSize: "var(--fs-2xl)", marginTop: "var(--sp-2)" }}
            >
              {sent ? "Request received" : "See it on your data"}
            </h2>
          </div>
          <button
            type="button"
            className="btn btn--icon btn--ghost"
            onClick={close}
            aria-label="Close dialog"
          >
            <CloseIcon size={15} />
          </button>
        </div>

        <div className="modal__body">
          {sent ? (
            <>
              <div className="modal__success">
                <span className="modal__tick" aria-hidden>
                  <CheckIcon size={20} />
                </span>
                <p style={{ fontSize: "var(--fs-sm)", color: "var(--ink-2)" }}>
                  Thanks, we&rsquo;ll be in touch at{" "}
                  <strong style={{ color: "var(--ink)" }}>{email}</strong> within one
                  working day.
                </p>
              </div>
              <p
                className="field__hint"
                style={{ textAlign: "center", marginTop: "var(--sp-4)" }}
              >
                This is a demonstration build, so nothing was actually sent. Reach the
                team directly at{" "}
                <a
                  href="https://pixlotech.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  style={{ color: "var(--accent)" }}
                >
                  pixlotech.com
                </a>
                .
              </p>
              <button
                type="button"
                className="btn btn--primary btn--lg"
                onClick={close}
                style={{ width: "100%", marginTop: "var(--sp-5)" }}
              >
                Close
              </button>
            </>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <p style={{ fontSize: "var(--fs-sm)", color: "var(--ink-2)" }}>
                Send a work email and we&rsquo;ll walk you through the console with your
                own yard layout and one day of move history.
              </p>

              <label className="field" htmlFor={emailId}>
                <span className="field__label">Work email</span>
                <input
                  id={emailId}
                  ref={emailRef}
                  className="field__input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@terminal.com"
                  value={email}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                />
                {error && (
                  <span className="field__error" id={errorId} role="alert">
                    <AlertIcon size={13} />
                    {error}
                  </span>
                )}
              </label>

              <label className="field" htmlFor={companyId}>
                <span className="field__label">
                  Terminal or company{" "}
                  <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>
                    (optional)
                  </span>
                </span>
                <input
                  id={companyId}
                  className="field__input"
                  type="text"
                  name="company"
                  autoComplete="organization"
                  placeholder="Port of Rotterdam"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </label>

              <button
                type="submit"
                className="btn btn--accent btn--lg"
                style={{ width: "100%", marginTop: "var(--sp-6)" }}
              >
                Request the walkthrough
              </button>

              <p className="field__hint" style={{ textAlign: "center" }}>
                Demonstration build. The form validates and confirms, but sends
                nothing.
              </p>
            </form>
          )}
        </div>
      </dialog>
    </Ctx.Provider>
  );
}

/** Any button that should open the dialog. */
export function DemoButton({
  className = "btn btn--primary",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { open } = useDemoDialog();
  return (
    <button type="button" className={className} onClick={open}>
      {children}
    </button>
  );
}

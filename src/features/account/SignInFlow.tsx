"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { signInStep, type SignInState } from "./actions";
import { Field, Notice, SubmitButton, describedBy, inputClass } from "./ui";
import { ACCOUNT_HONEYPOT_FIELD } from "./validate";

/** Who the sign-in is for: agencies (the default) or the site's admin. */
export type SignInAudience = "agency" | "admin";

/**
 * Sign-in in two short steps: your work email, then the short code we
 * email you. There is no password to choose or remember.
 */
export function SignInFlow({ notice, audience = "agency" }: { notice?: string; audience?: SignInAudience }) {
  // "Use a different email address" starts the steps again from scratch.
  const [round, setRound] = useState(0);
  return (
    <SignInSteps
      key={round}
      audience={audience}
      notice={round === 0 ? notice : undefined}
      onRestart={() => setRound((n) => n + 1)}
    />
  );
}

function SignInSteps({
  notice,
  audience,
  onRestart,
}: {
  notice?: string;
  audience: SignInAudience;
  onRestart: () => void;
}) {
  const forAdmin = audience === "admin";
  // Tells the server where to go once the code is accepted.
  const destination = <input type="hidden" name="next" value={forAdmin ? "admin" : "account"} />;
  const [view, action] = useActionState<SignInState, FormData>(signInStep, { step: "email" });
  const id = useId();
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view.error || view.step === "code") statusRef.current?.focus();
  }, [view]);

  if (view.step === "code") {
    const codeId = `${id}-code`;
    return (
      <div className="flex flex-col gap-6">
        <div ref={statusRef} tabIndex={-1} className="outline-none">
          <h2 className="mb-2 font-heading text-[26px] leading-tight font-extrabold tracking-[-0.03em]">
            Check your email
          </h2>
          <p className="text-[17px] text-muted">
            We have sent a sign-in code to <strong className="text-navy">{view.email}</strong>. It
            can take a minute to arrive. If you cannot see it, look in your junk folder.
          </p>
        </div>

        {view.error ? <Notice tone="error">{view.error}</Notice> : null}
        {!view.error && view.resent ? <Notice tone="success">A new code is on its way.</Notice> : null}

        <form action={action} noValidate className="flex flex-col gap-5">
          <input type="hidden" name="intent" value="verify" />
          <input type="hidden" name="email" value={view.email} />
          {destination}
          <Field id={codeId} label="Sign-in code" hint="The 8 numbers from the email we just sent.">
            <input
              id={codeId}
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]*"
              maxLength={12}
              required
              autoFocus
              aria-describedby={describedBy(codeId, true, false)}
              className={`${inputClass} max-w-[300px] text-center font-mono text-[26px] tracking-[0.25em]`}
            />
          </Field>
          <div>
            <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-5 text-base">
          <form action={action}>
            <input type="hidden" name="intent" value="send" />
            <input type="hidden" name="email" value={view.email} />
            <input type="hidden" name="resend" value="1" />
            {destination}
            <button
              type="submit"
              className="min-h-11 cursor-pointer font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
            >
              Send a new code
            </button>
          </form>
          <button
            type="button"
            onClick={onRestart}
            className="min-h-11 cursor-pointer font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
          >
            Use a different email address
          </button>
        </div>
      </div>
    );
  }

  const emailId = `${id}-email`;
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="intent" value="send" />
      {destination}
      {notice ? <Notice tone="info">{notice}</Notice> : null}
      {view.error ? (
        <Notice tone="error" innerRef={statusRef}>
          {view.error}
        </Notice>
      ) : null}
      <Field
        id={emailId}
        label={forAdmin ? "Your email address" : "Your work email address"}
        hint={
          forAdmin
            ? "Only the RecruiterLink administrator's address can open the admin area."
            : "Use the address at your agency's own domain, such as name@youragency.com. That is how we know which listing is yours."
        }
      >
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={view.email ?? ""}
          aria-invalid={view.error ? true : undefined}
          aria-describedby={describedBy(emailId, true, false)}
          placeholder={forAdmin ? "name@example.com" : "name@youragency.com"}
          className={inputClass}
        />
      </Field>
      {/* Hidden from people; bots fill it in and are ignored. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Fax
          <input type="text" name={ACCOUNT_HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div>
        <SubmitButton pendingLabel="Sending your code…" variant="primary">
          Email me a sign-in code
        </SubmitButton>
      </div>
      <p className="text-[15px] text-muted">
        {forAdmin
          ? "No password needed. We email you a code each time you sign in."
          : "No password needed. We email you a code each time you sign in. It is free, and nothing is charged."}
      </p>
    </form>
  );
}

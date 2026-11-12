"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { buttonClasses } from "@/components/ButtonLink";
import { cx } from "@/components/cx";
import { submitRequest, type RequestFormState } from "./actions";
import { HONEYPOT_FIELD, LIMITS, type RequestField } from "./validate";

export type RequestFormProps = {
  /** "agency" asks about a listing; "contact" is a general message. */
  mode: "agency" | "contact";
  /** The page the form is on, stored with the request. */
  source: "/for-agencies" | "/contact";
};

const inputClass =
  "w-full rounded-btn border-[1.5px] border-line-control bg-white px-4 py-3 text-[17px] text-navy placeholder:text-[#6B6490] focus:border-indigo focus:outline-none focus:ring-4 focus:ring-indigo/25 aria-[invalid=true]:border-[#B3261E]";

function Field({
  label,
  hint,
  error,
  children,
  id,
}: {
  label: string;
  hint?: string;
  error?: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-base font-bold">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-[15px] text-muted">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[15px] font-semibold text-[#B3261E]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The form that records a request in the database. It works without
 * scripts (it is a plain form post) and says clearly what happens next:
 * nothing is charged and no account is created.
 */
export function RequestForm({ mode, source }: RequestFormProps) {
  const [state, action, pending] = useActionState<RequestFormState, FormData>(submitRequest, {
    status: "idle",
  });
  const id = useId();
  const statusRef = useRef<HTMLDivElement>(null);

  const errors = state.status === "error" ? state.errors : {};
  const values = state.status === "error" ? state.values : {};
  const fieldId = (name: RequestField) => `${id}-${name}`;
  const described = (name: RequestField, hint = false) =>
    [hint ? `${fieldId(name)}-hint` : null, errors[name] ? `${fieldId(name)}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  // Move focus to the confirmation or the error summary once it appears.
  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  if (state.status === "sent") {
    return (
      <div
        ref={statusRef}
        tabIndex={-1}
        role="status"
        className="rounded-card border-[1.5px] border-navy bg-white p-7 outline-none sm:p-9"
      >
        <h3 className="mb-2 font-heading text-[26px] leading-tight font-extrabold tracking-[-0.03em]">
          Thank you. Your {mode === "contact" ? "message" : "request"} has been recorded.
        </h3>
        <p className="text-[17px] text-muted">
          {mode === "contact"
            ? "The RecruiterLink team will read it and reply by email"
            : "Agency logins and Premium payments are not open yet. Nothing has been charged and no account has been created. The RecruiterLink team will email you"}
          {state.email ? (
            <>
              {" "}
              at <strong className="text-navy">{state.email}</strong>
            </>
          ) : null}
          {mode === "contact" ? "." : " when you can claim your listing."}
        </p>
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="source" value={source} />
      {mode === "contact" ? <input type="hidden" name="kind" value="contact" /> : null}

      {state.status === "error" ? (
        <div
          ref={statusRef}
          tabIndex={-1}
          role="alert"
          className="rounded-btn border-[1.5px] border-[#B3261E] bg-white px-4 py-3 text-base font-semibold text-[#8C1D18] outline-none"
        >
          {state.message ??
            (errorCount === 1
              ? "Please check the field marked below."
              : `Please check the ${errorCount} fields marked below.`)}
        </div>
      ) : null}

      {mode === "agency" ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-base font-bold">What would you like to do?</legend>
          {(
            [
              ["claim", "Claim my agency's free listing"],
              ["premium", "Hear about Premium when it opens"],
            ] as const
          ).map(([value, label], index) => (
            <label
              key={value}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-btn border-[1.5px] border-line-control bg-white px-4 py-2.5 text-[17px] font-semibold has-[:checked]:border-navy has-[:checked]:bg-lavender"
            >
              <input
                type="radio"
                name="kind"
                value={value}
                defaultChecked={values.kind ? values.kind === value : index === 0}
                className="size-5 accent-[#21174B]"
              />
              {label}
            </label>
          ))}
          {errors.kind ? (
            <p className="text-[15px] font-semibold text-[#B3261E]">{errors.kind}</p>
          ) : null}
        </fieldset>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" id={fieldId("name")} error={errors.name}>
          <input
            id={fieldId("name")}
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={LIMITS.name}
            defaultValue={values.name}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={described("name")}
            className={inputClass}
          />
        </Field>
        <Field
          label={mode === "agency" ? "Work email" : "Email"}
          id={fieldId("email")}
          error={errors.email}
        >
          <input
            id={fieldId("email")}
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={LIMITS.email}
            defaultValue={values.email}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={described("email")}
            className={inputClass}
          />
        </Field>
      </div>

      {mode === "agency" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Agency name" id={fieldId("agencyName")} error={errors.agencyName}>
            <input
              id={fieldId("agencyName")}
              name="agencyName"
              type="text"
              autoComplete="organization"
              required
              maxLength={LIMITS.agencyName}
              defaultValue={values.agencyName}
              aria-invalid={errors.agencyName ? true : undefined}
              aria-describedby={described("agencyName")}
              className={inputClass}
            />
          </Field>
          <Field label="Agency website (optional)" id={fieldId("website")} error={errors.website}>
            <input
              id={fieldId("website")}
              name="website"
              type="text"
              inputMode="url"
              autoComplete="url"
              maxLength={LIMITS.website}
              placeholder="www.example.com"
              defaultValue={values.website}
              aria-invalid={errors.website ? true : undefined}
              aria-describedby={described("website")}
              className={inputClass}
            />
          </Field>
        </div>
      ) : null}

      <Field
        label={mode === "agency" ? "Anything we should know? (optional)" : "Your message"}
        hint={
          mode === "agency"
            ? "For example the address of your listing on RecruiterLink, or what is wrong with it."
            : undefined
        }
        id={fieldId("message")}
        error={errors.message}
      >
        <textarea
          id={fieldId("message")}
          name="message"
          rows={mode === "agency" ? 3 : 6}
          required={mode === "contact"}
          maxLength={LIMITS.message}
          defaultValue={values.message}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={described("message", mode === "agency")}
          className={cx(inputClass, "resize-y")}
        />
      </Field>

      {/* Hidden from people; bots that fill every field give themselves away. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Fax number
          <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <p className="text-[15px] text-muted">
        We store these details so the RecruiterLink team can reply to you. They
        are not shown on the site.
      </p>

      <button
        type="submit"
        disabled={pending}
        className={buttonClasses(
          "primary",
          "cursor-pointer self-start disabled:cursor-wait disabled:opacity-70 max-sm:w-full",
        )}
      >
        {pending
          ? "Sending…"
          : mode === "agency"
            ? "Register my interest"
            : "Send message"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { buttonClasses, type ButtonVariant } from "@/components/ButtonLink";
import { cx } from "@/components/cx";

export const inputClass =
  "w-full rounded-btn border-[1.5px] border-line-control bg-white px-4 py-3 text-[17px] text-navy placeholder:text-[#6B6490] focus:border-indigo focus:outline-none focus:ring-4 focus:ring-indigo/25 aria-[invalid=true]:border-[#B3261E]";

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
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

/** `aria-describedby` for a field with an optional hint and error. */
export function describedBy(id: string, hint: boolean, error: boolean): string | undefined {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

/** A submit button that shows it is working and cannot be pressed twice. */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary-small",
  className,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: ButtonVariant;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-disabled={pending}
      className={buttonClasses(variant, cx("cursor-pointer disabled:cursor-wait disabled:opacity-70", className))}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function Notice({
  tone,
  children,
  innerRef,
}: {
  tone: "success" | "error" | "info";
  children: React.ReactNode;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={innerRef}
      tabIndex={-1}
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "rounded-btn border-[1.5px] px-4 py-3 text-base font-semibold outline-none",
        tone === "error" && "border-[#B3261E] bg-white text-[#8C1D18]",
        tone === "success" && "border-[#1B7A43] bg-[#EAF7EF] text-[#12552E]",
        tone === "info" && "border-indigo bg-lavender text-navy",
      )}
    >
      {children}
    </div>
  );
}

/** A text box that shows how many characters have been used. */
export function CountedTextarea({
  id,
  name,
  defaultValue,
  rows,
  min,
  max,
  invalid,
  describedby,
}: {
  id: string;
  name: string;
  defaultValue: string;
  rows: number;
  min?: number;
  max: number;
  invalid: boolean;
  describedby?: string;
}) {
  const [length, setLength] = useState(defaultValue.length);
  const tooShort = min !== undefined && length < min;
  const tooLong = length > max;
  return (
    <>
      <textarea
        id={id}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        onChange={(event) => setLength(event.target.value.length)}
        aria-invalid={invalid || undefined}
        aria-describedby={[describedby, `${id}-count`].filter(Boolean).join(" ")}
        className={cx(inputClass, "resize-y leading-relaxed")}
      />
      <p
        id={`${id}-count`}
        className={cx("text-[15px]", tooLong ? "font-semibold text-[#B3261E]" : "text-muted")}
      >
        {length.toLocaleString("en")} of {max.toLocaleString("en")} characters
        {tooShort ? ` (at least ${min})` : ""}
      </p>
    </>
  );
}

/** Tick boxes for specialisms, with a running count against the limit. */
export function SpecialismPicker({
  specialisms,
  selected,
  max,
  error,
  id,
}: {
  specialisms: { id: number; name: string }[];
  selected: number[];
  max: number;
  error?: string;
  id: string;
}) {
  const [chosen, setChosen] = useState(() => new Set(selected));
  const over = chosen.size > max;
  return (
    <fieldset aria-describedby={`${id}-count${error ? ` ${id}-error` : ""}`} className="flex flex-col gap-2">
      <legend className="mb-1 text-base font-bold">Specialisms</legend>
      <p className="text-[15px] text-muted">
        The sectors your agency recruits for. Choose up to {max}; these decide which searches and
        city pages you appear in.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {specialisms.map((specialism) => (
          <label
            key={specialism.id}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-btn border-[1.5px] border-line-control bg-white px-3.5 py-2 text-base font-semibold has-[:checked]:border-navy has-[:checked]:bg-lavender"
          >
            <input
              type="checkbox"
              name="specialisms"
              value={specialism.id}
              defaultChecked={chosen.has(specialism.id)}
              onChange={(event) =>
                setChosen((current) => {
                  const next = new Set(current);
                  if (event.target.checked) next.add(specialism.id);
                  else next.delete(specialism.id);
                  return next;
                })
              }
              className="size-5 shrink-0 accent-[#21174B]"
            />
            {specialism.name}
          </label>
        ))}
      </div>
      <p
        id={`${id}-count`}
        aria-live="polite"
        className={cx("text-[15px]", over ? "font-semibold text-[#B3261E]" : "text-muted")}
      >
        {chosen.size} of {max} chosen{over ? ". Please untick some." : ""}
      </p>
      {error ? (
        <p id={`${id}-error`} className="text-[15px] font-semibold text-[#B3261E]">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

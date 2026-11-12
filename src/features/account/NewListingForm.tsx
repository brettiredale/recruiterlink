"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef } from "react";
import { submitNewListing, type NewListingState } from "./actions";
import {
  CountedTextarea,
  Field,
  Notice,
  SpecialismPicker,
  SubmitButton,
  describedBy,
  inputClass,
} from "./ui";
import { LISTING_LIMITS } from "./validate";

/** A brand-new listing, sent for review before it appears on the site. */
export function NewListingForm({
  domain,
  countries,
  specialisms,
}: {
  domain: string;
  countries: { id: number; name: string }[];
  specialisms: { id: number; name: string }[];
}) {
  const [state, action] = useActionState<NewListingState, FormData>(submitNewListing, {
    status: "idle",
  });
  const id = useId();
  const statusRef = useRef<HTMLDivElement>(null);

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
        <h2 className="mb-2 font-heading text-[26px] leading-tight font-extrabold tracking-[-0.03em]">
          Thank you. {state.name} has been sent for review.
        </h2>
        <p className="mb-5 text-[17px] text-muted">
          A member of the RecruiterLink team checks every new listing before it goes on the site.
          We will email you as soon as it is published, usually within two working days. Nothing
          has been charged.
        </p>
        <Link
          href="/account"
          className="font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
        >
          Back to your account
        </Link>
      </div>
    );
  }

  const errors = state.status === "error" ? state.errors : {};
  const values = state.status === "error" ? state.values : {};
  const text = (name: string) => (typeof values[name] === "string" ? (values[name] as string) : "");
  const chosen = Array.isArray(values.specialisms) ? values.specialisms.map(Number) : [];
  const errorCount = Object.keys(errors).length;
  const fid = (name: string) => `${id}-${name}`;
  // Redraw the fields with what was typed when the server sends it back.
  const formKey = state.status === "error" ? state.at : 0;

  return (
    <form key={formKey} action={action} noValidate className="flex flex-col gap-7">
      {state.status === "error" ? (
        <Notice tone="error" innerRef={statusRef}>
          {state.message ??
            (errorCount === 1
              ? "Nothing was sent. Please check the field marked below."
              : `Nothing was sent. Please check the ${errorCount} fields marked below.`)}
        </Notice>
      ) : null}

      <Field id={fid("name")} label="Agency name" error={errors.name}>
        <input
          id={fid("name")}
          name="name"
          type="text"
          autoComplete="organization"
          maxLength={LISTING_LIMITS.name.max}
          required
          defaultValue={text("name")}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy(fid("name"), false, Boolean(errors.name))}
          className={inputClass}
        />
      </Field>

      <Field
        id={fid("website")}
        label="Website"
        hint={`Must be on ${domain}, the domain of the email address you signed in with.`}
        error={errors.website}
      >
        <input
          id={fid("website")}
          name="website"
          type="text"
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={text("website") || domain}
          aria-invalid={errors.website ? true : undefined}
          aria-describedby={describedBy(fid("website"), true, Boolean(errors.website))}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-7 sm:grid-cols-2">
        <Field
          id={fid("country")}
          label="Country"
          hint="Where your main office is."
          error={errors.country}
        >
          <select
            id={fid("country")}
            name="country"
            required
            defaultValue={text("country")}
            aria-invalid={errors.country ? true : undefined}
            aria-describedby={describedBy(fid("country"), true, Boolean(errors.country))}
            className={inputClass}
          >
            <option value="">Choose a country</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </Field>

        <Field id={fid("city")} label="City" hint="Your main office's city." error={errors.city}>
          <input
            id={fid("city")}
            name="city"
            type="text"
            autoComplete="address-level2"
            maxLength={LISTING_LIMITS.city.max}
            required
            defaultValue={text("city")}
            aria-invalid={errors.city ? true : undefined}
            aria-describedby={describedBy(fid("city"), true, Boolean(errors.city))}
            className={inputClass}
          />
        </Field>
      </div>
      <p className="-mt-3 text-[15px] text-muted">
        Is your country not in the list?{" "}
        <Link href="/contact" className="font-bold text-indigo underline underline-offset-4">
          Tell us
        </Link>{" "}
        and we will add it.
      </p>

      <Field
        id={fid("introduction")}
        label="Introduction"
        hint="One or two sentences shown on your card in the directory. Optional."
        error={errors.introduction}
      >
        <CountedTextarea
          id={fid("introduction")}
          name="introduction"
          rows={3}
          max={LISTING_LIMITS.introduction.max}
          defaultValue={text("introduction")}
          invalid={Boolean(errors.introduction)}
          describedby={describedBy(fid("introduction"), true, Boolean(errors.introduction))}
        />
      </Field>

      <Field
        id={fid("description")}
        label="About your agency"
        hint="The main text on your agency page: who you recruit for, the roles and sectors you cover, and where. Plain text; leave a blank line between paragraphs."
        error={errors.description}
      >
        <CountedTextarea
          id={fid("description")}
          name="description"
          rows={10}
          min={LISTING_LIMITS.description.min}
          max={LISTING_LIMITS.description.max}
          defaultValue={text("description")}
          invalid={Boolean(errors.description)}
          describedby={describedBy(fid("description"), true, Boolean(errors.description))}
        />
      </Field>

      <SpecialismPicker
        id={fid("specialisms")}
        specialisms={specialisms}
        selected={chosen}
        max={LISTING_LIMITS.specialisms.max}
        error={errors.specialisms}
      />

      <div className="flex flex-col gap-3">
        <div>
          <SubmitButton pendingLabel="Sending…" variant="primary">
            Send for review
          </SubmitButton>
        </div>
        <p className="text-[15px] text-muted">
          A free listing costs nothing. You can add your logo once the listing is published.
        </p>
      </div>
    </form>
  );
}

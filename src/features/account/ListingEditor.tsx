"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { saveListing, saveLogo, type ListingFormState, type LogoFormState } from "./actions";
import { CountedTextarea, Field, Notice, SpecialismPicker, SubmitButton, describedBy } from "./ui";
import { LISTING_LIMITS } from "./validate";

export type EditableListing = {
  id: string;
  introduction: string;
  description: string;
  specialismIds: number[];
  hasLogo: boolean;
};

/** The words and specialisms of a listing. */
export function ListingTextForm({
  listing,
  specialisms,
}: {
  listing: EditableListing;
  specialisms: { id: number; name: string }[];
}) {
  const [state, action] = useActionState<ListingFormState, FormData>(saveListing, { status: "idle" });
  const id = useId();
  const statusRef = useRef<HTMLDivElement>(null);
  const errors = state.status === "error" ? state.errors : {};
  const errorCount = Object.keys(errors).length;
  // After an answer from the server, show what was typed, not the old text.
  const current = state.status === "idle" ? listing : { ...listing, ...state.values };
  const formKey = state.status === "idle" ? 0 : state.at;

  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  const introId = `${id}-introduction`;
  const descriptionId = `${id}-description`;

  return (
    <form key={formKey} action={action} noValidate className="flex flex-col gap-7">
      <input type="hidden" name="agency_id" value={listing.id} />

      {state.status === "saved" ? (
        <Notice tone="success" innerRef={statusRef}>
          Saved. Your public page will show the changes within a minute or two.
        </Notice>
      ) : null}
      {state.status === "error" ? (
        <Notice tone="error" innerRef={statusRef}>
          {state.message ??
            (errorCount === 1
              ? "Nothing was saved. Please check the field marked below."
              : `Nothing was saved. Please check the ${errorCount} fields marked below.`)}
        </Notice>
      ) : null}

      <Field
        id={introId}
        label="Introduction"
        hint="One or two sentences shown on your card in the directory. Optional."
        error={errors.introduction}
      >
        <CountedTextarea
          id={introId}
          name="introduction"
          rows={3}
          max={LISTING_LIMITS.introduction.max}
          defaultValue={current.introduction}
          invalid={Boolean(errors.introduction)}
          describedby={describedBy(introId, true, Boolean(errors.introduction))}
        />
      </Field>

      <Field
        id={descriptionId}
        label="About your agency"
        hint="The main text on your agency page: who you recruit for, the roles and sectors you cover, and where. Plain text; leave a blank line between paragraphs."
        error={errors.description}
      >
        <CountedTextarea
          id={descriptionId}
          name="description"
          rows={12}
          min={LISTING_LIMITS.description.min}
          max={LISTING_LIMITS.description.max}
          defaultValue={current.description}
          invalid={Boolean(errors.description)}
          describedby={describedBy(descriptionId, true, Boolean(errors.description))}
        />
      </Field>

      <SpecialismPicker
        id={`${id}-specialisms`}
        specialisms={specialisms}
        selected={current.specialismIds}
        max={LISTING_LIMITS.specialisms.max}
        error={errors.specialisms}
      />

      <div>
        <SubmitButton pendingLabel="Saving…" variant="primary">
          Save changes
        </SubmitButton>
      </div>
    </form>
  );
}

/** Upload, replace or remove the logo. */
export function LogoForm({ listing }: { listing: EditableListing }) {
  const [state, action] = useActionState<LogoFormState, FormData>(saveLogo, { status: "idle" });
  const id = useId();
  const statusRef = useRef<HTMLDivElement>(null);
  const fileId = `${id}-logo`;

  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  return (
    <div className="flex flex-col gap-4">
      {state.status === "saved" ? (
        <Notice tone="success" innerRef={statusRef}>
          Logo updated. Your public page will show it within a minute or two.
        </Notice>
      ) : null}
      {state.status === "error" ? (
        <Notice tone="error" innerRef={statusRef}>
          {state.message}
        </Notice>
      ) : null}

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="agency_id" value={listing.id} />
        <Field
          id={fileId}
          label={listing.hasLogo ? "Replace the logo" : "Add a logo"}
          hint="A square PNG, JPEG or WebP image, up to 1 MB. At least 400 pixels wide looks best."
        >
          <input
            id={fileId}
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
            aria-describedby={describedBy(fileId, true, false)}
            className="w-full rounded-btn border-[1.5px] border-line-control bg-white p-3 text-base text-navy file:mr-4 file:cursor-pointer file:rounded-btn-sm file:border-0 file:bg-lavender file:px-4 file:py-2.5 file:font-bold file:text-navy focus:border-indigo focus:outline-none focus:ring-4 focus:ring-indigo/25"
          />
        </Field>
        <div>
          <SubmitButton pendingLabel="Uploading…">Upload logo</SubmitButton>
        </div>
      </form>

      {listing.hasLogo ? (
        <form action={action}>
          <input type="hidden" name="agency_id" value={listing.id} />
          <input type="hidden" name="remove" value="1" />
          <button
            type="submit"
            className="min-h-11 cursor-pointer text-base font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
          >
            Remove the logo and show our initials instead
          </button>
        </form>
      ) : null}
    </div>
  );
}

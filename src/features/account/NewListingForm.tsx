"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { cityLabel, type RegionChoices } from "@/lib/regions";
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
import { LISTING_LIMITS, type NewListingErrors } from "./validate";

/** A brand-new listing, sent for review before it appears on the site. */
export function NewListingForm({
  domain,
  countries,
  regionChoices,
  specialisms,
}: {
  domain: string;
  countries: { id: number; name: string }[];
  regionChoices: RegionChoices;
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

      <PlaceFields
        fid={fid}
        countries={countries}
        regionChoices={regionChoices}
        errors={errors}
        initial={{ country: text("country"), region: text("region"), city: text("city") }}
      />
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

type Suggestion = { name: string; regionCode: string | null; agencyCount: number };

/**
 * Country, state and city. The state list follows the country, and the city
 * field suggests the cities already in the directory, so an agency joins the
 * existing "Miami, FL" instead of making a second Miami. The server matches
 * the city again on review, whatever is typed.
 */
function PlaceFields({
  fid,
  countries,
  regionChoices,
  errors,
  initial,
}: {
  fid: (name: string) => string;
  countries: { id: number; name: string }[];
  regionChoices: RegionChoices;
  errors: NewListingErrors;
  initial: { country: string; region: string; city: string };
}) {
  const [country, setCountry] = useState(initial.country);
  const [region, setRegion] = useState(initial.region);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const lookup = useRef<{ timer?: ReturnType<typeof setTimeout>; abort?: AbortController }>({});
  const regions = country ? regionChoices[Number(country)] : undefined;
  const listId = fid("city-suggestions");

  useEffect(() => {
    const current = lookup.current;
    return () => {
      clearTimeout(current.timer);
      current.abort?.abort();
    };
  }, []);

  function suggest(typed: string) {
    clearTimeout(lookup.current.timer);
    lookup.current.abort?.abort();
    if (!country || typed.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    lookup.current.timer = setTimeout(async () => {
      const abort = new AbortController();
      lookup.current.abort = abort;
      try {
        const params = new URLSearchParams({ country, q: typed.trim() });
        const res = await fetch(`/api/cities?${params.toString()}`, { signal: abort.signal });
        if (!res.ok) return;
        const body = (await res.json()) as { cities?: Suggestion[] };
        setSuggestions(body.cities ?? []);
      } catch {
        // Suggestions are a help only; the form works without them.
      }
    }, 200);
  }

  function onCityInput(typed: string) {
    // Picking "Miami, FL" from the list also picks Florida.
    const picked = suggestions.find((city) => cityLabel(city) === typed);
    if (picked?.regionCode && regions) {
      const match = regions.options.find((option) => option.code === picked.regionCode);
      if (match) setRegion(String(match.id));
    }
    suggest(typed);
  }

  const cityField = (
    <Field
      id={fid("city")}
      label="City"
      hint={regions ? "Start typing to see the cities we list." : "Your main office's city."}
      error={errors.city}
    >
      <input
        id={fid("city")}
        name="city"
        type="text"
        autoComplete="address-level2"
        maxLength={LISTING_LIMITS.city.max}
        required
        defaultValue={initial.city}
        list={suggestions.length > 0 ? listId : undefined}
        onChange={(event) => onCityInput(event.currentTarget.value)}
        aria-invalid={errors.city ? true : undefined}
        aria-describedby={describedBy(fid("city"), true, Boolean(errors.city))}
        className={inputClass}
      />
      <datalist id={listId}>
        {suggestions.map((city) => (
          <option key={`${city.name}-${city.regionCode ?? ""}`} value={cityLabel(city)} />
        ))}
      </datalist>
    </Field>
  );

  return (
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
          value={country}
          onChange={(event) => {
            setCountry(event.currentTarget.value);
            setRegion("");
            setSuggestions([]);
          }}
          aria-invalid={errors.country ? true : undefined}
          aria-describedby={describedBy(fid("country"), true, Boolean(errors.country))}
          className={inputClass}
        >
          <option value="">Choose a country</option>
          {countries.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </Field>

      {regions ? (
        <Field
          key={`region-${country}`}
          id={fid("region")}
          label={regions.label}
          hint={`Your main office's ${regions.label.toLowerCase()}.`}
          error={errors.region}
        >
          <select
            id={fid("region")}
            name="region"
            required
            value={region}
            onChange={(event) => setRegion(event.currentTarget.value)}
            aria-invalid={errors.region ? true : undefined}
            aria-describedby={describedBy(fid("region"), true, Boolean(errors.region))}
            className={inputClass}
          >
            <option value="">Choose the {regions.label.toLowerCase()}</option>
            {regions.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {/* Same slot with or without a state list, so the typed city stays. */}
      {cityField}
    </div>
  );
}

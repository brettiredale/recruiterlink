"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { askToBeLinked, linkPerson, type HelpState, type LinkPersonState } from "./actions";
import { Field, Notice, SubmitButton, inputClass } from "./ui";

/** For people who signed in with a personal address: tell us your agency. */
export function LinkRequestForm() {
  const [state, action] = useActionState<HelpState, FormData>(askToBeLinked, { status: "idle" });
  const id = useId();
  const statusRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  if (state.status === "sent") {
    return (
      <Notice tone="success" innerRef={statusRef}>
        Thank you. We have your details and will check them by hand. We will email you when your
        listing is linked to this account, usually within two working days.
      </Notice>
    );
  }
  const values = state.status === "error" ? state.values : { name: "", agencyName: "", website: "" };
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state.status === "error" ? (
        <Notice tone="error" innerRef={statusRef}>
          {state.message}
        </Notice>
      ) : null}
      <Field id={`${id}-name`} label="Your name">
        <input id={`${id}-name`} name="name" type="text" autoComplete="name" maxLength={120} required defaultValue={values.name} className={inputClass} />
      </Field>
      <Field id={`${id}-agency`} label="Your agency's name">
        <input id={`${id}-agency`} name="agencyName" type="text" autoComplete="organization" maxLength={160} required defaultValue={values.agencyName} className={inputClass} />
      </Field>
      <Field id={`${id}-website`} label="Your agency's website">
        <input id={`${id}-website`} name="website" type="text" inputMode="url" autoCapitalize="none" spellCheck={false} maxLength={300} required defaultValue={values.website} className={inputClass} />
      </Field>
      <div>
        <SubmitButton pendingLabel="Sending…">Send to the RecruiterLink team</SubmitButton>
      </div>
    </form>
  );
}

/** For the people who run the site: link a person to a listing by hand. */
export function LinkPersonForm() {
  const [state, action] = useActionState<LinkPersonState, FormData>(linkPerson, { status: "idle" });
  const id = useId();
  const statusRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);
  const values = state.status === "error" ? state.values : { email: "", slug: "" };
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state.status === "linked" ? (
        <Notice tone="success" innerRef={statusRef}>
          Done. {state.email} can now manage the listing “{state.slug}”.
        </Notice>
      ) : null}
      {state.status === "error" ? (
        <Notice tone="error" innerRef={statusRef}>
          {state.message}
        </Notice>
      ) : null}
      <Field
        id={`${id}-email`}
        label="The person's email address"
        hint="The address they signed in to RecruiterLink with. They must have signed in at least once."
      >
        <input id={`${id}-email`} name="email" type="email" autoCapitalize="none" spellCheck={false} required defaultValue={values.email} className={inputClass} />
      </Field>
      <Field
        id={`${id}-slug`}
        label="The listing"
        hint="Paste the web address of the agency's page, for example recruiterlink.com/agencies/caroo-manchester."
      >
        <input id={`${id}-slug`} name="slug" type="text" autoCapitalize="none" spellCheck={false} required defaultValue={values.slug} className={inputClass} />
      </Field>
      <div>
        <SubmitButton pendingLabel="Linking…">Link this person to the listing</SubmitButton>
      </div>
    </form>
  );
}

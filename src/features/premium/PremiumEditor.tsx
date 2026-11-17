"use client";

import Image from "next/image";
import { useActionState, useEffect, useId, useRef } from "react";
import { CountedTextarea, Field, Notice, SubmitButton, describedBy, inputClass } from "@/features/account/ui";
import {
  addPhoto,
  addTeamMember,
  addTestimonial,
  removePremiumItem,
  saveVideo,
  type PremiumFormState,
} from "./content-actions";
import { PREMIUM_LIMITS } from "./validate";

export type EditorContent = {
  videoUrl: string | null;
  photos: { id: string; url: string; caption: string | null }[];
  team: { id: string; name: string; jobTitle: string | null; photoUrl: string | null; linkedInUrl: string | null }[];
  testimonials: { id: string; quote: string; person: string; detail: string | null }[];
};

const fileClass =
  "w-full rounded-btn border-[1.5px] border-line-control bg-white p-3 text-base text-navy file:mr-4 file:cursor-pointer file:rounded-btn-sm file:border-0 file:bg-lavender file:px-4 file:py-2.5 file:font-bold file:text-navy focus:border-indigo focus:outline-none focus:ring-4 focus:ring-indigo/25";
const subheadClass = "font-heading text-xl font-bold tracking-[-0.02em]";

/** One form's answer, focused when it arrives so screen readers hear it. */
function useForm(action: (state: PremiumFormState, data: FormData) => Promise<PremiumFormState>) {
  const [state, run] = useActionState<PremiumFormState, FormData>(action, { status: "idle" });
  const statusRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);
  const notice =
    state.status === "idle" ? null : (
      <Notice tone={state.status === "saved" ? "success" : "error"} innerRef={statusRef}>
        {state.message}
      </Notice>
    );
  // A saved form starts empty again; a refused one keeps what was typed.
  const key = state.status === "saved" ? state.at : 0;
  return { state, run, notice, key };
}

function RemoveButton({ agencyId, kind, itemId, label }: { agencyId: string; kind: string; itemId: string; label: string }) {
  const { run, notice } = useForm(removePremiumItem);
  return (
    <form action={run} className="flex flex-col gap-2">
      <input type="hidden" name="agency_id" value={agencyId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="item_id" value={itemId} />
      {notice}
      <button
        type="submit"
        className="min-h-11 cursor-pointer self-start text-[15px] font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
      >
        Remove<span className="sr-only"> {label}</span>
      </button>
    </form>
  );
}

function VideoForm({ agencyId, videoUrl }: { agencyId: string; videoUrl: string | null }) {
  const { state, run, notice } = useForm(saveVideo);
  const id = useId();
  const inputId = `${id}-video`;
  const formKey = state.status === "idle" ? 0 : state.at;
  return (
    <div className="flex flex-col gap-4">
      <h3 className={subheadClass}>Video</h3>
      {notice}
      <form key={formKey} action={run} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="agency_id" value={agencyId} />
        <Field
          id={inputId}
          label="YouTube or Vimeo link"
          hint="One short video about your agency, shown near the top of your page."
        >
          <input
            id={inputId}
            name="video_url"
            type="url"
            inputMode="url"
            defaultValue={videoUrl ?? ""}
            placeholder="https://www.youtube.com/watch?v=…"
            aria-describedby={describedBy(inputId, true, false)}
            className={inputClass}
          />
        </Field>
        <div>
          <SubmitButton pendingLabel="Saving…">{videoUrl ? "Save video" : "Add video"}</SubmitButton>
        </div>
      </form>
      {videoUrl ? (
        <form action={run}>
          <input type="hidden" name="agency_id" value={agencyId} />
          <input type="hidden" name="remove" value="1" />
          <button
            type="submit"
            className="min-h-11 cursor-pointer text-[15px] font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
          >
            Remove the video
          </button>
        </form>
      ) : null}
    </div>
  );
}

function PhotosForm({ agencyId, photos }: { agencyId: string; photos: EditorContent["photos"] }) {
  const { run, notice, key } = useForm(addPhoto);
  const id = useId();
  const full = photos.length >= PREMIUM_LIMITS.photos;
  return (
    <div className="flex flex-col gap-4">
      <h3 className={subheadClass}>
        Photos <span className="text-base font-semibold text-muted">({photos.length} of {PREMIUM_LIMITS.photos})</span>
      </h3>
      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li key={photo.id} className="flex flex-col gap-1">
              <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-pale">
                <Image src={photo.url} alt={photo.caption ?? `Photo ${index + 1}`} fill sizes="240px" className="object-cover" />
              </div>
              {photo.caption ? <p className="text-[15px] text-muted">{photo.caption}</p> : null}
              <RemoveButton agencyId={agencyId} kind="photo" itemId={photo.id} label={`photo ${index + 1}`} />
            </li>
          ))}
        </ul>
      ) : null}
      {notice}
      {full ? (
        <p className="text-base text-muted">You have the most photos a page can show. Remove one to add another.</p>
      ) : (
        <form key={key} action={run} className="flex flex-col gap-4">
          <input type="hidden" name="agency_id" value={agencyId} />
          <Field id={`${id}-photo`} label="Add a photo" hint="Your office, your team at work or an event. PNG, JPEG or WebP, up to 2 MB.">
            <input
              id={`${id}-photo`}
              name="photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
              aria-describedby={describedBy(`${id}-photo`, true, false)}
              className={fileClass}
            />
          </Field>
          <Field id={`${id}-caption`} label="Caption" hint="Optional.">
            <input
              id={`${id}-caption`}
              name="caption"
              maxLength={PREMIUM_LIMITS.caption}
              aria-describedby={describedBy(`${id}-caption`, true, false)}
              className={inputClass}
            />
          </Field>
          <div>
            <SubmitButton pendingLabel="Uploading…">Upload photo</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}

function TeamForm({ agencyId, team }: { agencyId: string; team: EditorContent["team"] }) {
  const { run, notice, key } = useForm(addTeamMember);
  const id = useId();
  const full = team.length >= PREMIUM_LIMITS.team;
  return (
    <div className="flex flex-col gap-4">
      <h3 className={subheadClass}>
        Team <span className="text-base font-semibold text-muted">({team.length} of {PREMIUM_LIMITS.team})</span>
      </h3>
      {team.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {team.map((person) => (
            <li key={person.id} className="flex items-start gap-4 rounded-card border border-line p-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-lavender">
                {person.photoUrl ? <Image src={person.photoUrl} alt="" fill sizes="64px" className="object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <p className="font-bold break-words">{person.name}</p>
                {person.jobTitle ? <p className="text-[15px] text-muted">{person.jobTitle}</p> : null}
                <RemoveButton agencyId={agencyId} kind="team" itemId={person.id} label={person.name} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {notice}
      {full ? (
        <p className="text-base text-muted">You have the most team profiles a page can show. Remove one to add another.</p>
      ) : (
        <form key={key} action={run} noValidate className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="agency_id" value={agencyId} />
          <Field id={`${id}-name`} label="Name">
            <input id={`${id}-name`} name="name" required maxLength={PREMIUM_LIMITS.name.max} autoComplete="off" className={inputClass} />
          </Field>
          <Field id={`${id}-title`} label="Job title" hint="Optional.">
            <input
              id={`${id}-title`}
              name="job_title"
              maxLength={PREMIUM_LIMITS.jobTitle}
              aria-describedby={describedBy(`${id}-title`, true, false)}
              className={inputClass}
            />
          </Field>
          <Field id={`${id}-linkedin`} label="LinkedIn profile" hint="Optional, for example https://www.linkedin.com/in/their-name.">
            <input
              id={`${id}-linkedin`}
              name="linkedin_url"
              type="url"
              inputMode="url"
              aria-describedby={describedBy(`${id}-linkedin`, true, false)}
              className={inputClass}
            />
          </Field>
          <Field id={`${id}-photo`} label="Photo" hint="Optional. A head-and-shoulders photo, up to 2 MB.">
            <input
              id={`${id}-photo`}
              name="photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-describedby={describedBy(`${id}-photo`, true, false)}
              className={fileClass}
            />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton pendingLabel="Adding…">Add to team</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}

function TestimonialsForm({ agencyId, testimonials }: { agencyId: string; testimonials: EditorContent["testimonials"] }) {
  const { run, notice, key } = useForm(addTestimonial);
  const id = useId();
  const full = testimonials.length >= PREMIUM_LIMITS.testimonials;
  return (
    <div className="flex flex-col gap-4">
      <h3 className={subheadClass}>
        Testimonials{" "}
        <span className="text-base font-semibold text-muted">
          ({testimonials.length} of {PREMIUM_LIMITS.testimonials})
        </span>
      </h3>
      {testimonials.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {testimonials.map((item) => (
            <li key={item.id} className="rounded-card bg-cream p-5">
              <p className="text-base text-navy">&ldquo;{item.quote}&rdquo;</p>
              <p className="mt-2 text-[15px]">
                <span className="font-bold">{item.person}</span>
                {item.detail ? <span className="text-muted">, {item.detail}</span> : null}
              </p>
              <RemoveButton agencyId={agencyId} kind="testimonial" itemId={item.id} label={`testimonial from ${item.person}`} />
            </li>
          ))}
        </ul>
      ) : null}
      {notice}
      {full ? (
        <p className="text-base text-muted">You have the most testimonials a page can show. Remove one to add another.</p>
      ) : (
        <form key={key} action={run} noValidate className="flex flex-col gap-4">
          <input type="hidden" name="agency_id" value={agencyId} />
          <Field id={`${id}-quote`} label="What they said">
            <CountedTextarea
              id={`${id}-quote`}
              name="quote"
              rows={4}
              min={PREMIUM_LIMITS.quote.min}
              max={PREMIUM_LIMITS.quote.max}
              defaultValue=""
              invalid={false}
              describedby={describedBy(`${id}-quote`, false, false)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${id}-person`} label="Who said it">
              <input id={`${id}-person`} name="person" required maxLength={PREMIUM_LIMITS.person.max} className={inputClass} />
            </Field>
            <Field id={`${id}-detail`} label="Their role and company" hint="Optional, for example Head of Talent, Acme.">
              <input
                id={`${id}-detail`}
                name="detail"
                maxLength={PREMIUM_LIMITS.detail}
                aria-describedby={describedBy(`${id}-detail`, true, false)}
                className={inputClass}
              />
            </Field>
          </div>
          <div>
            <SubmitButton pendingLabel="Adding…">Add testimonial</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}

/** Everything a Premium agency adds to its page, one form per kind. */
export function PremiumEditor({ agencyId, content }: { agencyId: string; content: EditorContent }) {
  return (
    <div className="flex flex-col gap-12">
      <VideoForm agencyId={agencyId} videoUrl={content.videoUrl} />
      <PhotosForm agencyId={agencyId} photos={content.photos} />
      <TeamForm agencyId={agencyId} team={content.team} />
      <TestimonialsForm agencyId={agencyId} testimonials={content.testimonials} />
    </div>
  );
}

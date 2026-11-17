import Image from "next/image";
import { Container } from "@/components";
import { agencyMediaUrl, type PremiumContent } from "@/lib/data/premium";
import { parseVideoUrl, videoEmbedUrl } from "./validate";

const headingClass =
  "mb-6 font-heading text-[clamp(1.625rem,2.8vw,2.125rem)] leading-[1.15] font-extrabold tracking-[-0.03em]";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** The video, photos, team and testimonials of a Premium agency's page. */
export function PremiumShowcase({ name, content }: { name: string; content: PremiumContent }) {
  const video = content.videoUrl ? parseVideoUrl(content.videoUrl) : null;
  const { photos, team, testimonials } = content;
  if (!video && photos.length + team.length + testimonials.length === 0) return null;

  return (
    <Container className="flex flex-col gap-14 pb-14 sm:gap-[72px] sm:pb-[88px]">
      {video ? (
        <section aria-labelledby="video-heading">
          <h2 id="video-heading" className={headingClass}>
            Meet {name}
          </h2>
          <div className="aspect-video w-full max-w-[960px] overflow-hidden rounded-card bg-navy">
            <iframe
              src={videoEmbedUrl(video)}
              title={`Video from ${name}`}
              loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
        </section>
      ) : null}

      {photos.length > 0 ? (
        <section aria-labelledby="photos-heading">
          <h2 id="photos-heading" className={headingClass}>
            Inside {name}
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <li key={photo.id}>
                <figure className="flex flex-col gap-2">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-pale">
                    <Image
                      src={agencyMediaUrl(photo.path)}
                      alt={photo.caption ?? `Photo from ${name}`}
                      fill
                      sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  {photo.caption ? <figcaption className="text-[15px] text-muted">{photo.caption}</figcaption> : null}
                </figure>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {team.length > 0 ? (
        <section aria-labelledby="team-heading">
          <h2 id="team-heading" className={headingClass}>
            The team
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {team.map((person) => (
              <li key={person.id} className="flex flex-col gap-3">
                <div className="relative aspect-square overflow-hidden rounded-card bg-lavender">
                  {person.photoPath ? (
                    <Image
                      src={agencyMediaUrl(person.photoPath)}
                      alt={person.name}
                      fill
                      sizes="(min-width: 1024px) 300px, (min-width: 640px) 33vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-full w-full items-center justify-center font-heading text-4xl font-extrabold text-indigo"
                    >
                      {initials(person.name)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-[17px] font-bold break-words">{person.name}</p>
                  {person.jobTitle ? <p className="text-[15px] text-muted">{person.jobTitle}</p> : null}
                  {person.linkedInUrl ? (
                    <a
                      href={person.linkedInUrl}
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                      className="mt-1 inline-flex min-h-11 items-center text-[15px] font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
                    >
                      LinkedIn<span className="sr-only"> profile of {person.name} (opens in a new tab)</span>
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {testimonials.length > 0 ? (
        <section aria-labelledby="testimonials-heading">
          <h2 id="testimonials-heading" className={headingClass}>
            What clients and candidates say
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {testimonials.map((item) => (
              <li key={item.id} className="rounded-card bg-cream p-7">
                <figure className="flex h-full flex-col gap-4">
                  <blockquote className="flex flex-col gap-3 text-[17px] text-navy">
                    {item.quote.split(/\n{2,}/).map((paragraph, index) => (
                      <p key={index}>{index === 0 ? `“${paragraph}` : paragraph}</p>
                    ))}
                  </blockquote>
                  <figcaption className="mt-auto text-[15px]">
                    <span className="font-bold">{item.person}</span>
                    {item.detail ? <span className="text-muted">, {item.detail}</span> : null}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}

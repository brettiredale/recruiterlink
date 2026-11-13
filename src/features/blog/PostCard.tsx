import Link from "next/link";
import { cx } from "@/components/cx";
import { blogPostPath } from "@/lib/routes";
import type { PostSummary } from "./data";
import { formatShortDate } from "./rules";

/**
 * One article in a grid: cover picture, date and reading time, title,
 * summary and "Read article". The whole card is one link.
 */
export function PostCard({
  post,
  headingLevel = 2,
  eager = false,
}: {
  post: PostSummary;
  /** 3 when the card sits under a section heading (home page, "More articles"). */
  headingLevel?: 2 | 3;
  /** Load the picture straight away (cards at the top of the page). */
  eager?: boolean;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <Link
      href={blogPostPath(post.slug)}
      className="group flex h-full flex-col overflow-hidden rounded-card border-[1.5px] border-line bg-white transition duration-200 hover:-translate-y-1 hover:border-line-strong hover:shadow-card"
    >
      <PostCover url={post.coverImageUrl} alt="" eager={eager} />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="flex flex-wrap items-center gap-x-2 text-[15px] text-muted">
          <time dateTime={post.publishedAt}>{formatShortDate(post.publishedAt)}</time>
          <span aria-hidden>·</span>
          <span>{post.readingMinutes} min read</span>
        </p>
        <Heading className="mt-2 font-heading text-[21px] leading-snug font-extrabold tracking-[-0.02em] text-balance text-navy group-hover:text-indigo-deep">
          {post.title}
        </Heading>
        {post.excerpt ? (
          <p className="mt-2 line-clamp-3 text-base leading-relaxed text-muted">{post.excerpt}</p>
        ) : null}
        <span className="mt-auto pt-5 text-base font-bold text-indigo group-hover:text-indigo-deep">
          Read article <span aria-hidden>→</span>
        </span>
      </div>
    </Link>
  );
}

/**
 * A post's cover at 16:9, or a plain brand panel when it has none, so every
 * card in a grid lines up.
 */
export function PostCover({
  url,
  alt,
  eager = false,
  className,
}: {
  url: string | null;
  alt: string;
  eager?: boolean;
  className?: string;
}) {
  if (!url) {
    return (
      <div
        aria-hidden
        className={cx(
          "aspect-[16/9] w-full bg-[linear-gradient(135deg,var(--color-lavender),var(--color-pink-tint))]",
          className,
        )}
      />
    );
  }
  return (
    // Covers can come from any https address, so a plain image is used.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={cx("aspect-[16/9] w-full bg-pale object-cover", className)}
    />
  );
}

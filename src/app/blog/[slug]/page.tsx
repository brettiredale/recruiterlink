import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Breadcrumbs, Container, JsonLd, SearchBox, SectionHeading } from "@/components";
import { getPublishedPost, getRecentPosts, getRenamedPostSlug, type PublicPost } from "@/features/blog/data";
import { PostBody } from "@/features/blog/PostBody";
import { PostCard, PostCover } from "@/features/blog/PostCard";
import { formatLongDate, isReservedPostSlug } from "@/features/blog/rules";
import { robotsRule } from "@/lib/indexability";
import { blogPath, blogPostPath, homePath, isValidSlug } from "@/lib/routes";
import { absoluteUrl, isIndexable, siteName, siteUrl } from "@/lib/site";

export const ensureStatic = "navigation";

const RELATED = 3;

/**
 * Built ahead of time: the newest articles; the rest on first visit. The
 * framework needs at least one address, so before the first post an
 * address that can never be a post is listed (it answers "not found").
 */
export async function generateStaticParams() {
  const posts = await getRecentPosts(30);
  return posts.length > 0 ? posts.map((post) => ({ slug: post.slug })) : [{ slug: "_" }];
}

type Props = PageProps<"/blog/[slug]">;

async function loadPost(slug: string) {
  return isValidSlug(slug) && !isReservedPostSlug(slug) ? getPublishedPost(slug) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) return { title: "Article not found" };

  const url = absoluteUrl(blogPostPath(post.slug));
  const description = (post.excerpt || post.title).slice(0, 160);
  const image = post.coverImageUrl
    ? { url: post.coverImageUrl, alt: post.coverImageAlt || post.title }
    : { url: `${siteUrl}/opengraph-image`, width: 1200, height: 630, alt: siteName };
  return {
    title: post.title,
    description,
    alternates: { canonical: url },
    // A post with no article text is not worth a place in search results.
    robots: robotsRule(post.bodyMarkdown.trim().length > 0, isIndexable),
    openGraph: {
      type: "article",
      siteName,
      locale: "en",
      url,
      title: post.title,
      description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: post.author ? [post.author] : undefined,
      tags: post.tags,
      images: [image],
    },
    twitter: { card: "summary_large_image", title: post.title, description, images: [image.url] },
  };
}

function articleJsonLd(post: PublicPost) {
  const url = absoluteUrl(blogPostPath(post.slug));
  const organization = { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: siteName, url: absoluteUrl("/") };
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: post.author ? { "@type": "Person", name: post.author } : organization,
    publisher: organization,
    mainEntityOfPage: url,
    url,
    image: post.coverImageUrl ?? undefined,
    keywords: post.tags.length > 0 ? post.tags.join(", ") : undefined,
    inLanguage: "en",
  };
}

/** Shown only when the post was changed on a later day than it went out. */
function wasUpdated(post: PublicPost): boolean {
  return post.updatedAt.slice(0, 10) > post.publishedAt.slice(0, 10);
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) {
    // A post whose address was changed moves for good to its new one.
    const renamed = isValidSlug(slug) ? await getRenamedPostSlug(slug) : null;
    if (renamed && renamed !== slug) permanentRedirect(blogPostPath(renamed));
    notFound();
  }

  const related = (await getRecentPosts(RELATED + 1)).filter((p) => p.slug !== post.slug).slice(0, RELATED);

  return (
    <>
      <Container width="narrow">
        <Breadcrumbs
          baseUrl={siteUrl}
          items={[
            { label: "Home", href: homePath },
            { label: "Blog", href: blogPath },
            { label: post.title, href: blogPostPath(post.slug) },
          ]}
        />
      </Container>

      <article className="pt-4 pb-14 sm:pt-8 sm:pb-20">
        <Container width="narrow">
          <header>
            <h1 className="font-heading text-[clamp(2.125rem,4.6vw,3.5rem)] leading-[1.06] font-extrabold tracking-[-0.035em] text-balance">
              {post.title}
            </h1>
            <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-muted">
              <time dateTime={post.publishedAt}>{formatLongDate(post.publishedAt)}</time>
              <span aria-hidden>·</span>
              <span>{post.readingMinutes} min read</span>
              <span aria-hidden>·</span>
              <span>
                By <span className="font-semibold text-navy">{post.author ?? siteName}</span>
              </span>
            </p>
            {wasUpdated(post) ? (
              <p className="mt-1 text-[15px] text-muted">
                Updated <time dateTime={post.updatedAt}>{formatLongDate(post.updatedAt)}</time>
              </p>
            ) : null}
          </header>

          {post.coverImageUrl ? (
            <PostCover
              url={post.coverImageUrl}
              alt={post.coverImageAlt ?? ""}
              eager
              className="mt-8 rounded-card"
            />
          ) : null}

          {post.excerpt ? (
            <p className="mt-8 text-xl leading-relaxed text-muted sm:text-[22px]">{post.excerpt}</p>
          ) : null}

          <div className="mt-8">
            <PostBody markdown={post.bodyMarkdown} />
          </div>

          {post.tags.length > 0 ? (
            <ul aria-label="Topics" className="mt-12 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-lavender px-3.5 py-1.5 text-[15px] font-semibold text-navy"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}

          <aside
            aria-labelledby="find-agency-heading"
            className="mt-12 rounded-panel bg-[linear-gradient(to_bottom_right,var(--color-lavender),var(--color-pale))] p-6 sm:p-9"
          >
            <h2
              id="find-agency-heading"
              className="font-heading text-[clamp(1.5rem,2.6vw,2rem)] leading-tight font-extrabold tracking-[-0.03em]"
            >
              Find the right recruitment agency
            </h2>
            <p className="mt-2 mb-5 text-[17px] text-muted">
              Search agencies by city, country and specialism. Say what you need in your own words.
            </p>
            <SearchBox variant="compact" />
          </aside>
        </Container>
      </article>

      {related.length > 0 ? (
        <section aria-labelledby="more-articles-heading" className="border-t-[1.5px] border-line bg-pale py-12 sm:py-16">
          <Container>
            <SectionHeading
              id="more-articles-heading"
              title={`More from ${siteName}`}
              action={{ label: "All articles", href: blogPath }}
            />
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <li key={item.slug}>
                  <PostCard post={item} headingLevel={3} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      <JsonLd data={articleJsonLd(post)} />
    </>
  );
}

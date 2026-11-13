import type { Metadata } from "next";
import { Breadcrumbs, Container, EmptyState, JsonLd, PageIntro, Pagination, PricingBanner } from "@/components";
import { blogPagePath, blogPath, blogPostPath, forAgenciesPath, homePath } from "@/lib/routes";
import { linkListJsonLd, pageMetadata } from "@/lib/seo";
import { siteName, siteUrl } from "@/lib/site";
import { getBlogPage } from "./data";
import { PostCard } from "./PostCard";
import { POSTS_PER_PAGE } from "./rules";

export const BLOG_TITLE = `${siteName} Blog`;
const BLOG_INTRO =
  "Advice on hiring through recruitment agencies, finding the right recruiter for your job search, and running a recruitment agency.";

/** The posts on one page of /blog, or null when that page does not exist. */
export async function loadBlogPage(page: number) {
  const { posts, total } = await getBlogPage(page);
  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
  if (page > totalPages) return null;
  return { page, posts, total, totalPages };
}

type Listing = NonNullable<Awaited<ReturnType<typeof loadBlogPage>>>;

export function blogIndexMetadata(listing: Listing | null): Metadata {
  if (!listing) return { title: "Page not found" };
  const { page, total } = listing;
  return pageMetadata({
    title: page > 1 ? `${BLOG_TITLE}: page ${page}` : BLOG_TITLE,
    description: BLOG_INTRO,
    path: blogPagePath(page),
    // The list is worth indexing once it lists a post; later pages are
    // followed but not indexed, as on the rest of the site.
    indexable: total > 0 && page === 1,
  });
}

/** /blog and /blog/page/N. */
export function BlogIndexPage({ listing }: { listing: Listing }) {
  const { page, posts, total, totalPages } = listing;
  const first = (page - 1) * POSTS_PER_PAGE + 1;
  return (
    <>
      <Container>
        <Breadcrumbs
          baseUrl={siteUrl}
          items={[
            { label: "Home", href: homePath },
            { label: "Blog", href: blogPath },
            ...(page > 1 ? [{ label: `Page ${page}`, href: blogPagePath(page) }] : []),
          ]}
        />
      </Container>

      <PageIntro eyebrow="Blog" title={BLOG_TITLE} intro={BLOG_INTRO} />

      <section aria-label="Articles" className="py-10 sm:py-14">
        <Container>
          {posts.length === 0 ? (
            <EmptyState
              title="No articles yet"
              description="The first articles are on their way. Check back soon."
              action={{ label: "Find a recruitment agency", href: "/search" }}
            />
          ) : (
            <>
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post, index) => (
                  <li key={post.slug}>
                    <PostCard post={post} eager={index < 3} />
                  </li>
                ))}
              </ul>
              {totalPages > 1 ? (
                <Pagination
                  className="mt-10"
                  currentPage={page}
                  totalPages={totalPages}
                  basePath={blogPath}
                  label="Blog articles"
                  summary={`Showing ${first} to ${first + posts.length - 1} of ${total} articles`}
                />
              ) : null}
              <JsonLd
                data={linkListJsonLd(
                  page > 1 ? `${BLOG_TITLE}: page ${page}` : BLOG_TITLE,
                  blogPagePath(page),
                  posts.map((post) => ({ name: post.title, path: blogPostPath(post.slug) })),
                )}
              />
            </>
          )}
        </Container>
      </section>

      <section className="pb-16 sm:pb-[88px]">
        <Container>
          <PricingBanner variant="compact" freeHref={forAgenciesPath} />
        </Container>
      </section>
    </>
  );
}

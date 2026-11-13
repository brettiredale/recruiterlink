import { Container, SectionHeading } from "@/components";
import { blogPath } from "@/lib/routes";
import { getRecentPosts } from "./data";
import { PostCard } from "./PostCard";

/**
 * The three newest articles, for the home page. Shows nothing until the
 * first post is published.
 */
export async function LatestArticles() {
  const posts = await getRecentPosts(3);
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby="latest-articles-heading" className="pt-10 pb-6">
      <Container>
        <SectionHeading
          id="latest-articles-heading"
          title="Latest articles"
          action={{ label: "View all articles", href: blogPath }}
        />
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <PostCard post={post} headingLevel={3} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

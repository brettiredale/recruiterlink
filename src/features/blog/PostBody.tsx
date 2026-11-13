import { renderMarkdown } from "./markdown";

/**
 * An article's text. The renderer escapes any raw HTML and only lets
 * through safe links, images and YouTube or Vimeo players, so its output can
 * be placed on the page as it is.
 */
export function PostBody({ markdown }: { markdown: string }) {
  return <div className="blog-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }} />;
}

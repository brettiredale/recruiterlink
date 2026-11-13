-- Word count of each blog post, kept by the database, so the blog's lists can
-- show reading time without downloading every article.
alter table public.blog_posts
  add column word_count integer generated always as (
    coalesce(array_length(regexp_split_to_array(btrim(body_markdown), '\s+'), 1), 0)
  ) stored;

grant select (word_count) on public.blog_posts to anon, authenticated;

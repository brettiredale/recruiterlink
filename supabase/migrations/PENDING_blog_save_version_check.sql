-- Two fixes after review:
-- 1. Saving a post now says which version it is based on
--    (expected_updated_at). If someone else (the admin or Grokbot) changed
--    the post since, the save is refused with code 40001 instead of quietly
--    overwriting their change. New posts pass null.
-- 2. bot_key_is_live: checks an API key without counting a call, for the
--    connector's up-front check, so each tool call counts once.

drop function public.admin_save_blog_post(uuid, text, text, text, text, text, text, text, text[], text, timestamptz);
drop function public.bot_save_blog_post(text, uuid, text, text, text, text, text, text, text, text[], text, timestamptz);
drop function private.blog_save(uuid, text, text, text, text, text, text, text, text[], text, timestamptz, text);

create function private.blog_save(
  target uuid,
  expected_updated_at timestamptz,
  new_slug text,
  new_title text,
  new_excerpt text,
  new_body text,
  new_cover_url text,
  new_cover_alt text,
  new_author text,
  new_tags text[],
  new_status text,
  new_published_at timestamptz,
  actor text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_slug text := lower(btrim(coalesce(new_slug, '')));
  clean_title text := private.clean_text(new_title);
  current_version timestamptz;
  saved public.blog_posts;
begin
  if clean_title is null then
    raise exception 'A title is required.' using errcode = '22023';
  end if;
  if clean_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(clean_slug) > 96 then
    raise exception 'The slug must be lowercase words joined by hyphens, at most 96 characters.' using errcode = '22023';
  end if;
  if new_status not in ('draft', 'published') then
    raise exception 'Status must be draft or published.' using errcode = '22023';
  end if;

  if target is not null then
    select updated_at into current_version from public.blog_posts where id = target for update;
    if not found then
      raise exception 'That post no longer exists.' using errcode = 'P0002';
    end if;
    if expected_updated_at is not null and current_version <> expected_updated_at then
      raise exception 'This post was changed by someone else after you opened it.' using errcode = '40001';
    end if;
  end if;

  if exists (select 1 from public.blog_posts where slug = clean_slug and id is distinct from target) then
    raise exception 'Another post already uses the slug "%". Choose a different one.', clean_slug
      using errcode = '23505';
  end if;

  if target is null then
    insert into public.blog_posts (
      slug, title, excerpt, body_markdown, cover_image_url, cover_image_alt, author,
      tags, status, published_at, created_by, updated_by
    ) values (
      clean_slug, clean_title, left(coalesce(private.clean_text(new_excerpt), ''), 160),
      private.clean_markdown(new_body), private.clean_text(new_cover_url),
      left(private.clean_text(new_cover_alt), 200), left(private.clean_text(new_author), 80),
      private.blog_clean_tags(new_tags), new_status, coalesce(new_published_at, now()), actor, actor
    )
    returning * into saved;
  else
    update public.blog_posts set
      slug = clean_slug,
      title = clean_title,
      excerpt = left(coalesce(private.clean_text(new_excerpt), ''), 160),
      body_markdown = private.clean_markdown(new_body),
      cover_image_url = private.clean_text(new_cover_url),
      cover_image_alt = left(private.clean_text(new_cover_alt), 200),
      author = left(private.clean_text(new_author), 80),
      tags = private.blog_clean_tags(new_tags),
      status = new_status,
      published_at = coalesce(new_published_at, published_at),
      updated_at = clock_timestamp(),
      updated_by = actor
    where id = target
    returning * into saved;
  end if;

  return private.blog_post_json(saved, true);
end
$$;

create function public.admin_save_blog_post(
  target uuid,
  expected_updated_at timestamptz,
  new_slug text,
  new_title text,
  new_excerpt text,
  new_body text,
  new_cover_url text,
  new_cover_alt text,
  new_author text,
  new_tags text[],
  new_status text,
  new_published_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text := private.require_site_admin();
begin
  return private.blog_save(target, expected_updated_at, new_slug, new_title, new_excerpt, new_body,
    new_cover_url, new_cover_alt, new_author, new_tags, new_status, new_published_at, who);
end
$$;

create function public.bot_save_blog_post(
  api_key text,
  target uuid,
  expected_updated_at timestamptz,
  new_slug text,
  new_title text,
  new_excerpt text,
  new_body text,
  new_cover_url text,
  new_cover_alt text,
  new_author text,
  new_tags text[],
  new_status text,
  new_published_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  k private.api_keys := private.use_api_key(api_key, true);
begin
  return private.blog_save(target, expected_updated_at, new_slug, new_title, new_excerpt, new_body,
    new_cover_url, new_cover_alt, new_author, new_tags, new_status, new_published_at,
    private.api_key_actor(k));
end
$$;

create function public.bot_key_is_live(api_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select api_key is not null and length(api_key) <= 200 and left(api_key, 8) = 'rl_live_'
    and exists (
      select 1 from private.api_keys
      where key_hash = encode(sha256(convert_to(btrim(api_key), 'UTF8')), 'hex')
        and revoked_at is null
    )
$$;

revoke all on function
  private.blog_save(uuid, timestamptz, text, text, text, text, text, text, text, text[], text, timestamptz, text)
from public, anon, authenticated;

revoke all on function
  public.admin_save_blog_post(uuid, timestamptz, text, text, text, text, text, text, text, text[], text, timestamptz),
  public.bot_save_blog_post(text, uuid, timestamptz, text, text, text, text, text, text, text, text[], text, timestamptz),
  public.bot_key_is_live(text)
from public, anon, authenticated;

grant execute on function
  public.admin_save_blog_post(uuid, timestamptz, text, text, text, text, text, text, text, text[], text, timestamptz)
to authenticated;

grant execute on function
  public.bot_save_blog_post(text, uuid, timestamptz, text, text, text, text, text, text, text, text[], text, timestamptz),
  public.bot_key_is_live(text)
to anon, authenticated;

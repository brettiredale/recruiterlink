-- The RecruiterLink blog, its admin tools and the keys that let the owner's
-- AI agent (Grokbot) write posts through /api/mcp and /api/v1/blog.
--
-- Same rules as the rest of the database:
-- - The public (the site's publishable key) can read published posts and
--   nothing else. It cannot see drafts, who wrote a post, or any key.
-- - Every write goes through a function that checks the caller itself:
--   admin_* functions need a signed-in site admin (private.site_admins);
--   bot_* functions need a live API key, sent in full and hashed here, and
--   are rate limited per key.
-- - Deleted posts are copied to private.blog_post_archive first, so a
--   mistaken delete can be undone by hand.
-- - When a post's slug changes, the old address is kept in
--   public.blog_slug_redirects so links to it still work.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (length(slug) <= 96 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(title) between 1 and 200),
  -- Meta description and card summary.
  excerpt text not null default '' check (length(excerpt) <= 160),
  -- The article in markdown. The site's renderer escapes raw HTML and only
  -- allows safe links, images and YouTube/Vimeo embeds.
  body_markdown text not null default '' check (length(body_markdown) <= 100000),
  cover_image_url text
    check (cover_image_url is null or (length(cover_image_url) <= 2048 and cover_image_url ~ '^https://')),
  cover_image_alt text check (cover_image_alt is null or length(cover_image_alt) <= 200),
  author text check (author is null or length(author) <= 80),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Who made and last changed the post: an admin's email, or the API key's
  -- name. Not readable by the public.
  created_by text not null,
  updated_by text not null
);

comment on table public.blog_posts is
  'Blog articles at /blog. Public can read published rows (not created_by/updated_by). Written only through admin_* and bot_* functions.';

create index blog_posts_published_idx on public.blog_posts (status, published_at desc);

create table public.blog_slug_redirects (
  old_slug text primary key,
  post_id uuid not null references public.blog_posts (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.blog_slug_redirects is
  'Earlier slugs of blog posts. /blog/<old slug> redirects to the post''s current address.';

create index blog_slug_redirects_post_idx on public.blog_slug_redirects (post_id);

create table private.blog_post_archive (
  id bigint generated always as identity primary key,
  post_id uuid not null,
  post jsonb not null,
  deleted_by text not null,
  deleted_at timestamptz not null default now()
);

comment on table private.blog_post_archive is
  'A full copy of every deleted blog post, so a mistaken delete can be restored by hand.';

create table private.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 60),
  -- The first characters of the key, so it can be recognised in lists.
  key_prefix text not null check (length(key_prefix) between 8 and 20),
  -- SHA-256 of the full key. The key itself is shown once and never stored.
  key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  created_by text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

comment on table private.api_keys is
  'Keys for the blog API and MCP connector (Grokbot). Created and revoked by site admins at /admin/connect.';

create table private.api_key_calls (
  key_id uuid not null references private.api_keys (id) on delete cascade,
  called_at timestamptz not null default now(),
  is_write boolean not null
);

create index api_key_calls_key_time_idx on private.api_key_calls (key_id, called_at);

-- ---------------------------------------------------------------------------
-- Access rules
-- ---------------------------------------------------------------------------

alter table public.blog_posts enable row level security;
alter table public.blog_slug_redirects enable row level security;
alter table private.blog_post_archive enable row level security;
alter table private.api_keys enable row level security;
alter table private.api_key_calls enable row level security;

revoke all on public.blog_posts, public.blog_slug_redirects from public, anon, authenticated;

-- Column list on purpose: created_by and updated_by stay private.
grant select (
  id, slug, title, excerpt, body_markdown, cover_image_url, cover_image_alt,
  author, tags, status, published_at, updated_at
) on public.blog_posts to anon, authenticated;
grant select on public.blog_slug_redirects to anon, authenticated;

create policy "Anyone can read published posts" on public.blog_posts
  for select to anon, authenticated using (status = 'published');

create policy "Anyone can read redirects of published posts" on public.blog_slug_redirects
  for select to anon, authenticated
  using (exists (
    select 1 from public.blog_posts p where p.id = post_id and p.status = 'published'
  ));

-- ---------------------------------------------------------------------------
-- Keeping things tidy
-- ---------------------------------------------------------------------------

-- A changed slug leaves a redirect behind; a slug that is used again stops
-- being a redirect.
create function private.blog_posts_track_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.slug is distinct from old.slug then
    insert into public.blog_slug_redirects (old_slug, post_id)
    values (old.slug, new.id)
    on conflict (old_slug) do update set post_id = excluded.post_id, created_at = now();
  end if;
  delete from public.blog_slug_redirects where old_slug = new.slug;
  return new;
end
$$;

create trigger blog_posts_track_slug
  after insert or update of slug on public.blog_posts
  for each row execute function private.blog_posts_track_slug();

-- Line breaks and tabs kept (markdown needs them); other control characters
-- removed; outer blank lines trimmed.
create function private.clean_markdown(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(btrim(regexp_replace(
    replace(replace(input, E'\r\n', E'\n'), E'\r', E'\n'),
    '[\x01-\x08\x0B-\x1F\x7F]', '', 'g'), E' \n'), '')
$$;

-- Tags: trimmed, blanks and repeats dropped, at most 20 of 40 characters.
create function private.blog_clean_tags(input text[])
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(t order by first_seen), '{}')
  from (
    select left(private.clean_text(raw), 40) as t, min(ord) as first_seen
    from unnest(coalesce(input, '{}')) with ordinality as u(raw, ord)
    where private.clean_text(raw) is not null
    group by left(private.clean_text(raw), 40)
    order by min(ord)
    limit 20
  ) tags
$$;

-- ---------------------------------------------------------------------------
-- The one write path, used by both the admin and the bot functions
-- ---------------------------------------------------------------------------

create function private.blog_post_json(p public.blog_posts, with_body boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'slug', p.slug, 'title', p.title, 'excerpt', p.excerpt,
    'cover_image_url', p.cover_image_url, 'cover_image_alt', p.cover_image_alt,
    'author', p.author, 'tags', to_jsonb(p.tags), 'status', p.status,
    'published_at', p.published_at, 'created_at', p.created_at,
    'updated_at', p.updated_at, 'created_by', p.created_by, 'updated_by', p.updated_by,
    'words', coalesce(array_length(regexp_split_to_array(btrim(p.body_markdown), '\s+'), 1), 0)
  ) || case when with_body then jsonb_build_object('body_markdown', p.body_markdown) else '{}'::jsonb end
$$;

create function private.blog_save(
  target uuid,
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
      updated_at = now(),
      updated_by = actor
    where id = target
    returning * into saved;
    if not found then
      raise exception 'That post no longer exists.' using errcode = 'P0002';
    end if;
  end if;

  return private.blog_post_json(saved, true);
end
$$;

create function private.blog_delete(target uuid, actor text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  gone public.blog_posts;
begin
  delete from public.blog_posts where id = target returning * into gone;
  if not found then
    raise exception 'That post no longer exists.' using errcode = 'P0002';
  end if;
  insert into private.blog_post_archive (post_id, post, deleted_by)
  values (gone.id, to_jsonb(gone), actor);
  return jsonb_build_object('id', gone.id, 'slug', gone.slug, 'status', gone.status);
end
$$;

create function private.blog_list(only_status text, max_rows integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(j order by sort_key desc), '[]'::jsonb)
  from (
    select private.blog_post_json(p, false) as j, p.updated_at as sort_key
    from public.blog_posts p
    where only_status is null or p.status = only_status
    order by p.updated_at desc
    limit greatest(1, least(coalesce(max_rows, 500), 500))
  ) rows
$$;

-- ---------------------------------------------------------------------------
-- API keys: checking a key and counting its use
-- ---------------------------------------------------------------------------

-- Returns the key's row when the key is live and within its limits, and
-- records the call. Limits per key: 120 reads a minute; 30 writes a minute
-- and 600 a day.
create function private.use_api_key(raw_key text, is_write boolean)
returns private.api_keys
language plpgsql
security definer
set search_path = ''
as $$
declare
  k private.api_keys;
  per_minute integer;
  per_day integer;
begin
  if raw_key is null or length(raw_key) > 200 or left(raw_key, 8) <> 'rl_live_' then
    raise exception 'Invalid or revoked API key.' using errcode = '28000';
  end if;
  select * into k from private.api_keys
  where key_hash = encode(sha256(convert_to(btrim(raw_key), 'UTF8')), 'hex')
    and revoked_at is null;
  if not found then
    raise exception 'Invalid or revoked API key.' using errcode = '28000';
  end if;

  delete from private.api_key_calls where key_id = k.id and called_at < now() - interval '1 day';

  select count(*) filter (where c.called_at > now() - interval '1 minute'),
         count(*) filter (where c.is_write)
    into per_minute, per_day
  from private.api_key_calls c
  where c.key_id = k.id and c.is_write = use_api_key.is_write;

  if (is_write and (per_minute >= 30 or per_day >= 600)) or (not is_write and per_minute >= 120) then
    raise exception 'Rate limit reached for this key. Wait a minute and try again (writes: 30 a minute, 600 a day; reads: 120 a minute).'
      using errcode = 'RLIMT';
  end if;

  insert into private.api_key_calls (key_id, is_write) values (k.id, use_api_key.is_write);
  update private.api_keys set last_used_at = now() where id = k.id;
  return k;
end
$$;

create function private.api_key_actor(k private.api_keys)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'API key "' || k.name || '" (' || k.key_prefix || '…)'
$$;

-- ---------------------------------------------------------------------------
-- Functions for signed-in site admins (the /admin pages)
-- ---------------------------------------------------------------------------

create function private.require_site_admin()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  who text := private.current_confirmed_email();
begin
  if who is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if not private.is_site_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return who;
end
$$;

create function public.admin_list_blog_posts()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_site_admin();
  return private.blog_list(null, 500);
end
$$;

create function public.admin_get_blog_post(target uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p public.blog_posts;
begin
  perform private.require_site_admin();
  select * into p from public.blog_posts where id = target;
  if not found then return null; end if;
  return private.blog_post_json(p, true);
end
$$;

create function public.admin_save_blog_post(
  target uuid,
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
  return private.blog_save(target, new_slug, new_title, new_excerpt, new_body, new_cover_url,
    new_cover_alt, new_author, new_tags, new_status, new_published_at, who);
end
$$;

create function public.admin_delete_blog_post(target uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text := private.require_site_admin();
begin
  return private.blog_delete(target, who);
end
$$;

-- Lets the admin image upload go ahead (the file itself is stored by the
-- server with the secret key, after this check).
create function public.admin_check()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select private.require_site_admin()
$$;

create function public.admin_list_api_keys()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_site_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', k.id, 'name', k.name, 'key_prefix', k.key_prefix, 'created_by', k.created_by,
      'created_at', k.created_at, 'last_used_at', k.last_used_at, 'revoked_at', k.revoked_at
    ) order by k.revoked_at is not null, k.created_at desc)
    from private.api_keys k
  ), '[]'::jsonb);
end
$$;

-- The server makes the key and sends only its hash and prefix.
create function public.admin_create_api_key(key_name text, new_key_prefix text, new_key_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text := private.require_site_admin();
  clean_name text := left(private.clean_text(key_name), 60);
  k private.api_keys;
begin
  if clean_name is null then
    raise exception 'Give the key a name, for example "Grokbot".' using errcode = '22023';
  end if;
  if (select count(*) from private.api_keys where revoked_at is null) >= 10 then
    raise exception 'There are already 10 live keys. Revoke one you no longer use first.' using errcode = '22023';
  end if;
  insert into private.api_keys (name, key_prefix, key_hash, created_by)
  values (clean_name, new_key_prefix, lower(new_key_hash), who)
  returning * into k;
  return jsonb_build_object('id', k.id, 'name', k.name, 'key_prefix', k.key_prefix);
end
$$;

create function public.admin_revoke_api_key(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_site_admin();
  update private.api_keys set revoked_at = now() where id = target and revoked_at is null;
end
$$;

-- ---------------------------------------------------------------------------
-- Functions for the API and MCP connector (key sent in full, every call)
-- ---------------------------------------------------------------------------

create function public.bot_check_key(api_key text, is_write boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  k private.api_keys := private.use_api_key(api_key, is_write);
begin
  return jsonb_build_object('name', k.name, 'key_prefix', k.key_prefix);
end
$$;

create function public.bot_list_blog_posts(api_key text, only_status text default null, max_rows integer default 60)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.use_api_key(api_key, false);
  if only_status is not null and only_status not in ('draft', 'published') then
    raise exception 'Status must be draft or published.' using errcode = '22023';
  end if;
  return private.blog_list(only_status, max_rows);
end
$$;

create function public.bot_get_blog_post(api_key text, post_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.blog_posts;
begin
  perform private.use_api_key(api_key, false);
  select * into p from public.blog_posts where slug = lower(btrim(post_slug));
  if not found then return null; end if;
  return private.blog_post_json(p, true);
end
$$;

create function public.bot_save_blog_post(
  api_key text,
  target uuid,
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
  return private.blog_save(target, new_slug, new_title, new_excerpt, new_body, new_cover_url,
    new_cover_alt, new_author, new_tags, new_status, new_published_at, private.api_key_actor(k));
end
$$;

create function public.bot_delete_blog_post(api_key text, target uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  k private.api_keys := private.use_api_key(api_key, true);
begin
  return private.blog_delete(target, private.api_key_actor(k));
end
$$;

-- ---------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------

revoke all on function
  private.blog_posts_track_slug(),
  private.clean_markdown(text),
  private.blog_clean_tags(text[]),
  private.blog_post_json(public.blog_posts, boolean),
  private.blog_save(uuid, text, text, text, text, text, text, text, text[], text, timestamptz, text),
  private.blog_delete(uuid, text),
  private.blog_list(text, integer),
  private.use_api_key(text, boolean),
  private.api_key_actor(private.api_keys),
  private.require_site_admin()
from public, anon, authenticated;

revoke all on function
  public.admin_list_blog_posts(),
  public.admin_get_blog_post(uuid),
  public.admin_save_blog_post(uuid, text, text, text, text, text, text, text, text[], text, timestamptz),
  public.admin_delete_blog_post(uuid),
  public.admin_check(),
  public.admin_list_api_keys(),
  public.admin_create_api_key(text, text, text),
  public.admin_revoke_api_key(uuid),
  public.bot_check_key(text, boolean),
  public.bot_list_blog_posts(text, text, integer),
  public.bot_get_blog_post(text, text),
  public.bot_save_blog_post(text, uuid, text, text, text, text, text, text, text, text[], text, timestamptz),
  public.bot_delete_blog_post(text, uuid)
from public, anon, authenticated;

grant execute on function
  public.admin_list_blog_posts(),
  public.admin_get_blog_post(uuid),
  public.admin_save_blog_post(uuid, text, text, text, text, text, text, text, text[], text, timestamptz),
  public.admin_delete_blog_post(uuid),
  public.admin_check(),
  public.admin_list_api_keys(),
  public.admin_create_api_key(text, text, text),
  public.admin_revoke_api_key(uuid)
to authenticated;

-- The key is the credential: the site's server calls these with the
-- publishable key, and each one checks the API key before doing anything.
grant execute on function
  public.bot_check_key(text, boolean),
  public.bot_list_blog_posts(text, text, integer),
  public.bot_get_blog_post(text, text),
  public.bot_save_blog_post(text, uuid, text, text, text, text, text, text, text, text[], text, timestamptz),
  public.bot_delete_blog_post(text, uuid)
to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Images
-- ---------------------------------------------------------------------------

-- Public storage for blog images (covers and pictures in articles). Public
-- read by address only; nobody can list, upload, change or delete files
-- without the server's secret key (no storage policies are added). SVG is
-- not accepted: it can carry script.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
);

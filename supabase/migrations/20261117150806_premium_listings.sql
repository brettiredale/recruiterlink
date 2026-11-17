-- Premium listings: the content a paying agency adds (photos, one video,
-- team, testimonials), where a listing sits in its city's list, and the
-- link between a listing and its Stripe subscription.
--
-- Rules, the same as the rest of the accounts schema:
--   * Who is asking always comes from the session (auth.uid()).
--   * The public reads Premium content only while the listing is published
--     AND on the Premium plan. When a subscription ends the content stays
--     stored but stops showing; paying again brings it back.
--   * Nobody writes the tables directly. People go through my_* / *_my_*
--     functions, which check membership, the plan and the limits. The
--     payment functions are for the server's secret key only.
--   * Limits (owner approved 13 Nov 2026): 8 photos, 1 video link (YouTube
--     or Vimeo), 12 team profiles, 6 testimonials.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.agency_videos (
  agency_id uuid primary key references public.agencies (id) on delete cascade,
  url text not null check (
    url ~ '^https://(www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}|vimeo\.com/[0-9]{6,12})$'
  ),
  updated_at timestamptz not null default now()
);

create table public.agency_photos (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  path text not null unique check (path ~ '^[0-9a-f-]{36}/photo-[0-9]{10,16}\.(png|jpg|webp)$'),
  caption text check (char_length(caption) <= 140),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index agency_photos_agency_idx on public.agency_photos (agency_id, sort_order, created_at);

create table public.agency_team_members (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  job_title text check (char_length(job_title) <= 80),
  photo_path text unique check (photo_path ~ '^[0-9a-f-]{36}/team-[0-9]{10,16}\.(png|jpg|webp)$'),
  linkedin_url text check (linkedin_url ~ '^https://([a-z]{2,3}\.)?linkedin\.com/in/[A-Za-z0-9_%-]{2,100}/?$'),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index agency_team_members_agency_idx on public.agency_team_members (agency_id, sort_order, created_at);

create table public.agency_testimonials (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  quote text not null check (char_length(quote) between 20 and 600),
  person text not null check (char_length(person) between 2 and 80),
  detail text check (char_length(detail) <= 120),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index agency_testimonials_agency_idx on public.agency_testimonials (agency_id, sort_order, created_at);

-- Every Stripe event handled, so a repeated delivery does nothing twice.
create table private.stripe_events (
  id text primary key,
  type text not null,
  agency_id uuid,
  received_at timestamptz not null default now()
);

alter table private.agency_private add column if not exists premium_since timestamptz;
alter table private.agency_private add column if not exists premium_interval text
  check (premium_interval in ('month', 'year'));

-- ---------------------------------------------------------------------------
-- Access: the public reads content of published Premium listings only.
-- ---------------------------------------------------------------------------

alter table public.agency_videos enable row level security;
alter table public.agency_photos enable row level security;
alter table public.agency_team_members enable row level security;
alter table public.agency_testimonials enable row level security;
alter table private.stripe_events enable row level security;

revoke all on public.agency_videos, public.agency_photos, public.agency_team_members, public.agency_testimonials
  from anon, authenticated;
grant select on public.agency_videos, public.agency_photos, public.agency_team_members, public.agency_testimonials
  to anon, authenticated;

create policy "Premium videos of published listings are public" on public.agency_videos
  for select to anon, authenticated using (exists (select 1 from public.agencies a where a.id = agency_id and a.status = 'published' and a.plan = 'premium'));
create policy "Premium photos of published listings are public" on public.agency_photos
  for select to anon, authenticated using (exists (select 1 from public.agencies a where a.id = agency_id and a.status = 'published' and a.plan = 'premium'));
create policy "Premium team of published listings is public" on public.agency_team_members
  for select to anon, authenticated using (exists (select 1 from public.agencies a where a.id = agency_id and a.status = 'published' and a.plan = 'premium'));
create policy "Premium testimonials of published listings are public" on public.agency_testimonials
  for select to anon, authenticated using (exists (select 1 from public.agencies a where a.id = agency_id and a.status = 'published' and a.plan = 'premium'));

-- Photos for photo galleries and team portraits. Public read; written only
-- by the server with the secret key after it has checked the person.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('agency-media', 'agency-media', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Where a listing sits in its city's list (premium first, then by name,
-- 24 a page): the upsell page shows "page 96 of 159". Public facts only.
-- ---------------------------------------------------------------------------

create function public.listing_position(target_agency uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select a.id, a.city_id, a.is_premium, a.sort_name
    from public.agencies a
    where a.id = target_agency and a.status = 'published'
  ),
  city_list as (
    select a.is_premium, a.sort_name, a.id
    from public.agencies a, me
    where a.city_id = me.city_id and a.status = 'published'
  )
  select case when me.city_id is null then null else jsonb_build_object(
    'position', (
      select count(*) + 1 from city_list c
      where (c.is_premium and not me.is_premium)
         or (c.is_premium = me.is_premium and (c.sort_name, c.id) < (me.sort_name, me.id))
    ),
    'total', (select count(*) from city_list),
    'premium_count', (select count(*) from city_list c where c.is_premium),
    'per_page', 24
  ) end
  from me
$$;
revoke all on function public.listing_position(uuid) from public;
grant execute on function public.listing_position(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- The signed-in person's Premium content, for the editor.
-- ---------------------------------------------------------------------------

create function private.require_premium_member(target uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if not private.is_agency_member(target) then
    raise exception 'You do not manage this listing' using errcode = '42501', hint = 'not_member';
  end if;
  if not exists (select 1 from public.agencies a where a.id = target and a.plan = 'premium') then
    raise exception 'This listing is not on Premium' using errcode = 'P0001', hint = 'not_premium';
  end if;
end
$$;
revoke all on function private.require_premium_member(uuid) from public, anon, authenticated;

create function public.my_premium_content(target_agency uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if not private.is_agency_member(target_agency) then
    raise exception 'You do not manage this listing' using errcode = '42501', hint = 'not_member';
  end if;
  return jsonb_build_object(
    'video_url', (select v.url from public.agency_videos v where v.agency_id = target_agency),
    'photos', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'path', p.path, 'caption', p.caption)
                       order by p.sort_order, p.created_at)
      from public.agency_photos p where p.agency_id = target_agency), '[]'::jsonb),
    'team', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'job_title', t.job_title,
                                          'photo_path', t.photo_path, 'linkedin_url', t.linkedin_url)
                       order by t.sort_order, t.created_at)
      from public.agency_team_members t where t.agency_id = target_agency), '[]'::jsonb),
    'testimonials', coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'quote', q.quote, 'person', q.person, 'detail', q.detail)
                       order by q.sort_order, q.created_at)
      from public.agency_testimonials q where q.agency_id = target_agency), '[]'::jsonb)
  );
end
$$;

create function public.set_my_video(target_agency uuid, new_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_premium_member(target_agency);
  if new_url is null or new_url = '' then
    delete from public.agency_videos where agency_id = target_agency;
    return;
  end if;
  insert into public.agency_videos (agency_id, url) values (target_agency, new_url)
  on conflict (agency_id) do update set url = excluded.url, updated_at = now();
end
$$;

create function public.add_my_photo(target_agency uuid, new_path text, new_caption text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  perform private.require_premium_member(target_agency);
  perform 1 from public.agencies where id = target_agency for update;
  if (select count(*) from public.agency_photos where agency_id = target_agency) >= 8 then
    raise exception 'You already have 8 photos' using errcode = 'P0001', hint = 'limit';
  end if;
  if split_part(new_path, '/', 1) <> target_agency::text then
    raise exception 'Unexpected file name' using errcode = 'P0001';
  end if;
  insert into public.agency_photos (agency_id, path, caption, sort_order)
  values (target_agency, new_path, nullif(new_caption, ''),
          (select coalesce(max(sort_order), 0) + 1 from public.agency_photos where agency_id = target_agency))
  returning id into new_id;
  return new_id;
end
$$;

create function public.add_my_team_member(
  target_agency uuid, new_name text, new_job_title text, new_photo_path text, new_linkedin_url text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  perform private.require_premium_member(target_agency);
  perform 1 from public.agencies where id = target_agency for update;
  if (select count(*) from public.agency_team_members where agency_id = target_agency) >= 12 then
    raise exception 'You already have 12 team profiles' using errcode = 'P0001', hint = 'limit';
  end if;
  if new_photo_path is not null and split_part(new_photo_path, '/', 1) <> target_agency::text then
    raise exception 'Unexpected file name' using errcode = 'P0001';
  end if;
  insert into public.agency_team_members (agency_id, name, job_title, photo_path, linkedin_url, sort_order)
  values (target_agency, new_name, nullif(new_job_title, ''), new_photo_path, nullif(new_linkedin_url, ''),
          (select coalesce(max(sort_order), 0) + 1 from public.agency_team_members where agency_id = target_agency))
  returning id into new_id;
  return new_id;
end
$$;

create function public.add_my_testimonial(target_agency uuid, new_quote text, new_person text, new_detail text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  perform private.require_premium_member(target_agency);
  perform 1 from public.agencies where id = target_agency for update;
  if (select count(*) from public.agency_testimonials where agency_id = target_agency) >= 6 then
    raise exception 'You already have 6 testimonials' using errcode = 'P0001', hint = 'limit';
  end if;
  insert into public.agency_testimonials (agency_id, quote, person, detail, sort_order)
  values (target_agency, new_quote, new_person, nullif(new_detail, ''),
          (select coalesce(max(sort_order), 0) + 1 from public.agency_testimonials where agency_id = target_agency))
  returning id into new_id;
  return new_id;
end
$$;

-- Removing is allowed on any plan (a lapsed agency can still tidy up).
-- Returns the file to delete from storage, if any.
create function public.remove_my_premium_item(target_agency uuid, item_kind text, item_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_path text;
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if not private.is_agency_member(target_agency) then
    raise exception 'You do not manage this listing' using errcode = '42501', hint = 'not_member';
  end if;
  if item_kind = 'photo' then
    delete from public.agency_photos where id = item_id and agency_id = target_agency returning path into old_path;
  elsif item_kind = 'team' then
    delete from public.agency_team_members where id = item_id and agency_id = target_agency returning photo_path into old_path;
  elsif item_kind = 'testimonial' then
    delete from public.agency_testimonials where id = item_id and agency_id = target_agency;
  else
    raise exception 'Unknown item' using errcode = 'P0001';
  end if;
  return old_path;
end
$$;

revoke all on function
  public.my_premium_content(uuid),
  public.set_my_video(uuid, text),
  public.add_my_photo(uuid, text, text),
  public.add_my_team_member(uuid, text, text, text, text),
  public.add_my_testimonial(uuid, text, text, text),
  public.remove_my_premium_item(uuid, text, uuid)
from public, anon;
grant execute on function
  public.my_premium_content(uuid),
  public.set_my_video(uuid, text),
  public.add_my_photo(uuid, text, text),
  public.add_my_team_member(uuid, text, text, text, text),
  public.add_my_testimonial(uuid, text, text, text),
  public.remove_my_premium_item(uuid, text, uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- Payments (server's secret key only). The server has already checked the
-- Stripe signature or read the session back from Stripe itself.
-- ---------------------------------------------------------------------------

-- The Stripe customer for a listing, so a returning agency reuses it.
create function public.agency_stripe_customer(target_agency uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.stripe_customer_id from private.agency_private p where p.agency_id = target_agency
$$;

-- Turns Premium on or off for a listing from a Stripe subscription.
-- Returns the listing's slug, country and city, so the server can refresh
-- the right pages; null if the listing is unknown.
create function public.set_agency_premium_from_stripe(
  target_agency uuid,
  premium boolean,
  customer_id text,
  subscription_id text,
  billing_interval text,
  event_id text default null,
  event_type text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
  current_subscription text;
begin
  if event_id is not null then
    insert into private.stripe_events (id, type, agency_id) values (event_id, coalesce(event_type, ''), target_agency)
    on conflict (id) do nothing;
    if not found then return null; end if;
  end if;

  select jsonb_build_object('slug', a.slug, 'country_slug', c.slug, 'city_slug', ci.slug, 'name', a.name)
  into result
  from public.agencies a
  join public.countries c on c.id = a.country_id
  left join public.cities ci on ci.id = a.city_id
  where a.id = target_agency
  for update of a;
  if result is null then return null; end if;

  insert into private.agency_private (agency_id) values (target_agency) on conflict (agency_id) do nothing;
  select p.stripe_subscription_id into current_subscription
  from private.agency_private p where p.agency_id = target_agency;

  -- An ending subscription only turns Premium off if it is the listing's
  -- current one (not an older one the agency replaced).
  if not premium and current_subscription is not null and current_subscription <> subscription_id then
    return result;
  end if;

  update private.agency_private set
    stripe_customer_id = coalesce(customer_id, stripe_customer_id),
    stripe_subscription_id = coalesce(subscription_id, stripe_subscription_id),
    premium_interval = case when premium then coalesce(billing_interval, premium_interval) else premium_interval end,
    premium_since = case when premium then coalesce(premium_since, now()) else null end
  where agency_id = target_agency;

  update public.agencies set plan = case when premium then 'premium' else 'free' end
  where id = target_agency and plan is distinct from case when premium then 'premium' else 'free' end;

  return result;
end
$$;

revoke all on function
  public.agency_stripe_customer(uuid),
  public.set_agency_premium_from_stripe(uuid, boolean, text, text, text, text, text)
from public, anon, authenticated;
grant execute on function
  public.agency_stripe_customer(uuid),
  public.set_agency_premium_from_stripe(uuid, boolean, text, text, text, text, text)
to service_role;

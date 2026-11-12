-- Agency accounts: who manages which listing, how a listing is claimed by a
-- confirmed work email, edits by the people who manage it, requests to join
-- a listing somebody else manages, and new listings waiting for review.
--
-- Rules that hold everywhere in this file:
--   * Nobody writes to these tables directly. Every change goes through a
--     function below, which checks who is asking.
--   * "Who is asking" always comes from the signed-in session (auth.uid())
--     and the confirmed email on that login, never from anything the browser
--     sends.

-- ---------------------------------------------------------------------------
-- Reference lists (private)
-- ---------------------------------------------------------------------------

create table private.personal_email_domains (
  domain text primary key check (domain = lower(domain))
);
comment on table private.personal_email_domains is
  'Email providers anyone can sign up to (Gmail and similar) and shared website hosts. An address on one of these proves nothing about where a person works, so it can never claim a listing by itself.';
alter table private.personal_email_domains enable row level security;

insert into private.personal_email_domains (domain) values
  ('gmail.com'), ('googlemail.com'), ('yahoo.com'), ('yahoo.co.uk'), ('yahoo.fr'), ('yahoo.de'),
  ('yahoo.es'), ('yahoo.it'), ('yahoo.ca'), ('yahoo.com.au'), ('yahoo.co.in'), ('yahoo.in'),
  ('yahoo.com.br'), ('yahoo.com.mx'), ('yahoo.co.jp'), ('ymail.com'), ('rocketmail.com'),
  ('hotmail.com'), ('hotmail.co.uk'), ('hotmail.fr'), ('hotmail.de'), ('hotmail.es'),
  ('hotmail.it'), ('hotmail.nl'), ('hotmail.ca'), ('hotmail.com.au'), ('outlook.com'),
  ('outlook.co.uk'), ('outlook.fr'), ('outlook.de'), ('outlook.es'), ('outlook.it'),
  ('outlook.com.au'), ('outlook.ie'), ('live.com'), ('live.co.uk'), ('live.fr'), ('live.nl'),
  ('live.com.au'), ('live.ca'), ('msn.com'), ('passport.com'), ('icloud.com'), ('me.com'),
  ('mac.com'), ('aol.com'), ('aol.co.uk'), ('aim.com'), ('proton.me'), ('protonmail.com'),
  ('protonmail.ch'), ('pm.me'), ('tutanota.com'), ('tuta.io'), ('tutamail.com'), ('gmx.com'),
  ('gmx.de'), ('gmx.net'), ('gmx.at'), ('gmx.ch'), ('gmx.co.uk'), ('gmx.fr'), ('gmx.us'),
  ('mail.com'), ('email.com'), ('usa.com'), ('europe.com'), ('consultant.com'), ('web.de'),
  ('t-online.de'), ('freenet.de'), ('arcor.de'), ('yandex.com'), ('yandex.ru'), ('ya.ru'),
  ('mail.ru'), ('bk.ru'), ('inbox.ru'), ('list.ru'), ('rambler.ru'), ('zoho.com'),
  ('zohomail.com'), ('zohomail.eu'), ('zohomail.in'), ('hey.com'), ('fastmail.com'),
  ('fastmail.fm'), ('hushmail.com'), ('mailbox.org'), ('posteo.de'), ('qq.com'), ('163.com'),
  ('126.com'), ('sina.com'), ('sohu.com'), ('foxmail.com'), ('naver.com'), ('daum.net'),
  ('hanmail.net'), ('rediffmail.com'), ('orange.fr'), ('wanadoo.fr'), ('free.fr'), ('sfr.fr'),
  ('laposte.net'), ('neuf.fr'), ('bbox.fr'), ('libero.it'), ('virgilio.it'), ('tiscali.it'),
  ('alice.it'), ('tin.it'), ('tiscali.co.uk'), ('btinternet.com'), ('btopenworld.com'),
  ('sky.com'), ('virginmedia.com'), ('ntlworld.com'), ('blueyonder.co.uk'), ('talktalk.net'),
  ('talk21.com'), ('comcast.net'), ('verizon.net'), ('att.net'), ('sbcglobal.net'),
  ('bellsouth.net'), ('cox.net'), ('charter.net'), ('earthlink.net'), ('juno.com'),
  ('optonline.net'), ('roadrunner.com'), ('frontier.com'), ('windstream.net'), ('shaw.ca'),
  ('rogers.com'), ('sympatico.ca'), ('telus.net'), ('videotron.ca'), ('bell.net'),
  ('bigpond.com'), ('bigpond.net.au'), ('optusnet.com.au'), ('telstra.com'), ('iinet.net.au'),
  ('tpg.com.au'), ('xtra.co.nz'), ('ziggo.nl'), ('kpnmail.nl'), ('hetnet.nl'), ('home.nl'),
  ('planet.nl'), ('xs4all.nl'), ('telenet.be'), ('skynet.be'), ('proximus.be'), ('bluewin.ch'),
  ('terra.es'), ('telefonica.net'), ('movistar.es'), ('sapo.pt'), ('uol.com.br'), ('bol.com.br'),
  ('terra.com.br'), ('seznam.cz'), ('centrum.cz'), ('wp.pl'), ('o2.pl'), ('onet.pl'),
  ('interia.pl'), ('eircom.net'), ('mweb.co.za'), ('webmail.co.za'), ('telkomsa.net'),
  ('vodamail.co.za'), ('emirates.net.ae'), ('eim.ae'),
  -- Shared website hosts and social sites, in case a listing's website is on one.
  ('linkedin.com'), ('facebook.com'), ('instagram.com'), ('twitter.com'), ('x.com'),
  ('youtube.com'), ('google.com'), ('sites.google.com'), ('business.site'), ('wixsite.com'),
  ('wix.com'), ('weebly.com'), ('wordpress.com'), ('blogspot.com'), ('squarespace.com'),
  ('godaddysites.com'), ('webflow.io'), ('github.io'), ('carrd.co'), ('jimdofree.com'),
  ('jimdosite.com'), ('strikingly.com'), ('myshopify.com'), ('indeed.com'), ('glassdoor.com'),
  ('linktr.ee'), ('bit.ly'), ('yolasite.com'), ('site123.me'), ('webnode.com'), ('ueniweb.com');

create table private.site_admins (
  email text primary key check (email = lower(email)),
  added_at timestamptz not null default now()
);
comment on table private.site_admins is
  'Email addresses of the people who run RecruiterLink. A signed-in user whose confirmed email is here can review new listings and link people to listings.';
alter table private.site_admins enable row level security;

insert into private.site_admins (email) values
  ('brett@recruiterlink.com'), ('brettiredale@gmail.com');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.agency_members (
  agency_id uuid not null references public.agencies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (agency_id, user_id)
);
comment on table public.agency_members is
  'Which signed-in people manage which agency listing. Owners can also approve colleagues. Written only by the functions in this migration.';
create index agency_members_user_idx on public.agency_members (user_id);

create table public.agency_access_requests (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null
);
comment on table public.agency_access_requests is
  'A person with a confirmed email on an agency''s domain asking to join a listing that a colleague already manages.';
create unique index agency_access_requests_one_open_idx
  on public.agency_access_requests (agency_id, user_id) where status = 'pending';
create index agency_access_requests_user_idx on public.agency_access_requests (user_id);
create index agency_access_requests_decided_by_idx
  on public.agency_access_requests (decided_by) where decided_by is not null;

create table public.listing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  website text not null check (website ~ '^https://[^/\s]+$' and char_length(website) <= 260),
  domain text not null,
  country_id smallint not null references public.countries (id) on delete restrict,
  city_name text not null check (char_length(btrim(city_name)) between 2 and 80),
  introduction text check (char_length(introduction) <= 300),
  description text not null check (char_length(description) between 80 and 4000),
  specialism_ids smallint[] not null
    check (cardinality(specialism_ids) between 1 and 8),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  review_note text check (char_length(review_note) <= 500),
  agency_id uuid references public.agencies (id) on delete set null
);
comment on table public.listing_submissions is
  'A new agency listing sent in by a signed-in person whose confirmed email is on the agency''s own website domain. Held until a site admin approves it.';
create unique index listing_submissions_one_open_per_domain_idx
  on public.listing_submissions (domain) where status = 'pending';
create index listing_submissions_user_idx on public.listing_submissions (user_id);
create index listing_submissions_status_idx on public.listing_submissions (status, created_at);
create index listing_submissions_country_idx on public.listing_submissions (country_id);
create index listing_submissions_agency_idx
  on public.listing_submissions (agency_id) where agency_id is not null;
create index listing_submissions_reviewed_by_idx
  on public.listing_submissions (reviewed_by) where reviewed_by is not null;

create table private.login_email_log (
  id bigint generated always as identity primary key,
  email text not null,
  ip text,
  created_at timestamptz not null default now()
);
comment on table private.login_email_log is
  'One row per sign-in email sent, to limit how many one address, one visitor or the whole site can trigger. Rows older than two days are removed as new ones arrive.';
alter table private.login_email_log enable row level security;
create index login_email_log_email_idx on private.login_email_log (email, created_at desc);
create index login_email_log_ip_idx on private.login_email_log (ip, created_at desc);
create index login_email_log_created_idx on private.login_email_log (created_at desc);

-- A way to find a domain's listings quickly.
create index agencies_domain_idx on public.agencies (domain)
  where status = 'published' and domain is not null;

-- ---------------------------------------------------------------------------
-- Access rules
-- ---------------------------------------------------------------------------

alter table public.agency_members enable row level security;
alter table public.agency_access_requests enable row level security;
alter table public.listing_submissions enable row level security;

revoke all on public.agency_members, public.agency_access_requests, public.listing_submissions
  from public, anon, authenticated;
grant select on public.agency_members, public.agency_access_requests, public.listing_submissions
  to authenticated;

create policy "People see their own memberships" on public.agency_members
  for select to authenticated using (user_id = (select auth.uid()));

create policy "People see their own access requests" on public.agency_access_requests
  for select to authenticated using (user_id = (select auth.uid()));

create policy "People see their own submissions" on public.listing_submissions
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Helpers (private; not callable through the API)
-- ---------------------------------------------------------------------------

-- The signed-in person's confirmed email, lower case, or null.
create function private.current_confirmed_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email)
  from auth.users u
  where u.id = (select auth.uid())
    and u.email_confirmed_at is not null
    and u.email is not null
$$;

create function private.is_personal_email_domain(d text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.personal_email_domains p where p.domain = lower(d))
$$;

create function private.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.site_admins s
    where s.email = private.current_confirmed_email()
  )
$$;

create function private.is_agency_member(target uuid, owners_only boolean default false)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.agency_members m
    where m.agency_id = target
      and m.user_id = (select auth.uid())
      and (not owners_only or m.role = 'owner')
  )
$$;

-- Trims, turns blank into null, and strips characters that should never be
-- stored (control characters other than line breaks).
create function private.clean_text(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(btrim(regexp_replace(
    replace(input, E'\r\n', E'\n'),
    '[\x01-\x09\x0B-\x1F\x7F]', '', 'g')), '')
$$;

-- Makes somebody a manager of a listing and marks the listing as claimed.
create function private.grant_membership(target uuid, person uuid, member_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.agency_members (agency_id, user_id, role)
  values (target, person, member_role)
  on conflict (agency_id, user_id) do nothing;

  update public.agencies set is_claimed = true
  where id = target and not is_claimed;

  insert into private.agency_private (agency_id, claimed_at)
  values (target, now())
  on conflict (agency_id) do update
    set claimed_at = coalesce(private.agency_private.claimed_at, excluded.claimed_at);
end
$$;

revoke all on function
  private.current_confirmed_email(),
  private.is_personal_email_domain(text),
  private.is_site_admin(),
  private.is_agency_member(uuid, boolean),
  private.clean_text(text),
  private.grant_membership(uuid, uuid, text)
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Functions the signed-in site calls
-- ---------------------------------------------------------------------------

-- Everything the account page needs, in one call.
create function public.my_account()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  my_email text := private.current_confirmed_email();
  my_domain text;
  personal boolean;
begin
  if me is null or my_email is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  my_domain := split_part(my_email, '@', 2);
  personal := private.is_personal_email_domain(my_domain);

  return jsonb_build_object(
    'email', my_email,
    'domain', my_domain,
    'is_personal_email', personal,
    'is_admin', private.is_site_admin(),
    'listings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'name', a.name, 'slug', a.slug, 'status', a.status,
        'plan', a.plan, 'logo_path', a.logo_path, 'role', m.role,
        'city', c.name, 'country', co.name
      ) order by a.sort_name)
      from public.agency_members m
      join public.agencies a on a.id = m.agency_id
      join public.countries co on co.id = a.country_id
      left join public.cities c on c.id = a.city_id
      where m.user_id = me
    ), '[]'::jsonb),
    -- Listings on this person's email domain that they do not manage yet.
    'matches', case when personal then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'name', a.name, 'slug', a.slug,
        'city', c.name, 'country', co.name,
        'managed', exists (select 1 from public.agency_members x where x.agency_id = a.id),
        'requested', exists (
          select 1 from public.agency_access_requests r
          where r.agency_id = a.id and r.user_id = me and r.status = 'pending')
      ) order by a.sort_name)
      from public.agencies a
      join public.countries co on co.id = a.country_id
      left join public.cities c on c.id = a.city_id
      where a.status = 'published' and a.domain = my_domain
        and not exists (
          select 1 from public.agency_members x
          where x.agency_id = a.id and x.user_id = me)
    ), '[]'::jsonb) end,
    'submissions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'status', s.status, 'created_at', s.created_at,
        'review_note', s.review_note
      ) order by s.created_at desc)
      from public.listing_submissions s
      where s.user_id = me and s.status <> 'approved'
    ), '[]'::jsonb),
    -- Colleagues waiting for this person (an owner) to let them in.
    'requests_to_review', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'agency_id', a.id, 'agency_name', a.name,
        'email', lower(u.email), 'created_at', r.created_at
      ) order by r.created_at)
      from public.agency_access_requests r
      join public.agencies a on a.id = r.agency_id
      join auth.users u on u.id = r.user_id
      where r.status = 'pending'
        and exists (
          select 1 from public.agency_members m
          where m.agency_id = r.agency_id and m.user_id = me and m.role = 'owner')
    ), '[]'::jsonb)
  );
end
$$;

-- Claims one listing for the signed-in person. The listing's website domain
-- must equal the domain of their confirmed email. If a colleague already
-- manages it, this records a request for that colleague to approve instead.
-- Returns 'claimed', 'already_member' or 'requested'.
create function public.claim_listing(target_agency uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  my_email text := private.current_confirmed_email();
  my_domain text;
  agency_domain text;
begin
  if me is null or my_email is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  my_domain := split_part(my_email, '@', 2);
  if private.is_personal_email_domain(my_domain) then
    raise exception 'A personal email address cannot claim a listing'
      using errcode = 'P0001', hint = 'personal_email';
  end if;

  -- Lock the listing so two people cannot both become its first owner.
  select a.domain into agency_domain
  from public.agencies a
  where a.id = target_agency and a.status = 'published'
  for update;

  if agency_domain is null or agency_domain <> my_domain then
    raise exception 'This listing is not on your email domain'
      using errcode = 'P0001', hint = 'domain_mismatch';
  end if;

  if exists (select 1 from public.agency_members m
             where m.agency_id = target_agency and m.user_id = me) then
    return 'already_member';
  end if;

  if exists (select 1 from public.agency_members m where m.agency_id = target_agency) then
    insert into public.agency_access_requests (agency_id, user_id)
    values (target_agency, me)
    on conflict do nothing;
    return 'requested';
  end if;

  perform private.grant_membership(target_agency, me, 'owner');
  return 'claimed';
end
$$;

-- On first arrival: if exactly one unmanaged listing sits on the person's
-- email domain and they manage nothing yet, claim it for them, so claiming
-- needs no extra step. Returns the listing's id, or null if nothing was done.
create function public.claim_single_match()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  my_email text := private.current_confirmed_email();
  my_domain text;
  found uuid[];
begin
  if me is null or my_email is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  my_domain := split_part(my_email, '@', 2);
  if private.is_personal_email_domain(my_domain) then return null; end if;
  if exists (select 1 from public.agency_members m where m.user_id = me) then return null; end if;

  select array_agg(a.id) into found
  from public.agencies a
  where a.status = 'published' and a.domain = my_domain;

  if found is null or cardinality(found) <> 1 then return null; end if;
  if exists (select 1 from public.agency_members m where m.agency_id = found[1]) then
    return null;
  end if;

  if public.claim_listing(found[1]) = 'claimed' then return found[1]; end if;
  return null;
end
$$;

-- An owner approves or declines a colleague's request to join a listing.
create function public.decide_access_request(request_id uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  req public.agency_access_requests%rowtype;
begin
  if me is null then raise exception 'Not signed in' using errcode = '28000'; end if;

  select * into req from public.agency_access_requests r
  where r.id = request_id and r.status = 'pending'
  for update;
  if not found then
    raise exception 'Request not found' using errcode = 'P0001', hint = 'not_found';
  end if;
  if not private.is_agency_member(req.agency_id, true) then
    raise exception 'Only an owner of the listing can decide this'
      using errcode = '42501', hint = 'not_owner';
  end if;

  update public.agency_access_requests
  set status = case when approve then 'approved' else 'declined' end,
      decided_at = now(), decided_by = me
  where id = request_id;

  if approve then
    perform private.grant_membership(req.agency_id, req.user_id, 'member');
  end if;
end
$$;

-- The details of one listing for its editor. Only for people who manage it.
create function public.my_listing(target_agency uuid)
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

  return (
    select jsonb_build_object(
      'id', a.id, 'name', a.name, 'slug', a.slug, 'status', a.status, 'plan', a.plan,
      'website', a.website, 'domain', a.domain, 'logo_path', a.logo_path,
      'introduction', a.introduction, 'description', a.description,
      'country_id', a.country_id, 'country', co.name, 'country_slug', co.slug,
      'city_id', a.city_id, 'city', c.name, 'city_slug', c.slug,
      'specialism_ids', coalesce((
        select jsonb_agg(s.specialism_id order by s.specialism_id)
        from public.agency_specialisms s where s.agency_id = a.id), '[]'::jsonb),
      'role', (select m.role from public.agency_members m
               where m.agency_id = a.id and m.user_id = (select auth.uid()))
    )
    from public.agencies a
    join public.countries co on co.id = a.country_id
    left join public.cities c on c.id = a.city_id
    where a.id = target_agency
  );
end
$$;

-- Saves the words and specialisms of a listing. Only for people who manage it.
create function public.update_my_listing(
  target_agency uuid,
  new_introduction text,
  new_description text,
  new_specialism_ids smallint[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  intro text := private.clean_text(new_introduction);
  descr text := private.clean_text(new_description);
  wanted smallint[];
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if not private.is_agency_member(target_agency) then
    raise exception 'You do not manage this listing' using errcode = '42501', hint = 'not_member';
  end if;

  if intro is not null and char_length(intro) > 300 then
    raise exception 'The introduction is too long' using errcode = 'P0001', hint = 'introduction_length';
  end if;
  if descr is null or char_length(descr) < 80 or char_length(descr) > 4000 then
    raise exception 'The description must be between 80 and 4,000 characters'
      using errcode = 'P0001', hint = 'description_length';
  end if;

  select array_agg(distinct s.id) into wanted
  from public.specialisms s where s.id = any (new_specialism_ids);
  if wanted is null or cardinality(wanted) < 1 or cardinality(wanted) > 8 then
    raise exception 'Choose between one and eight specialisms'
      using errcode = 'P0001', hint = 'specialism_count';
  end if;

  update public.agencies
  set introduction = intro, description = descr
  where id = target_agency;

  delete from public.agency_specialisms
  where agency_id = target_agency and specialism_id <> all (wanted);
  insert into public.agency_specialisms (agency_id, specialism_id)
  select target_agency, unnest(wanted)
  on conflict do nothing;
end
$$;

-- Sends in a new listing for review. The website must be on the domain of the
-- sender's confirmed email, and that domain must not have a listing already.
create function public.submit_new_listing(
  new_name text,
  new_website text,
  new_country_id smallint,
  new_city_name text,
  new_introduction text,
  new_description text,
  new_specialism_ids smallint[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  my_email text := private.current_confirmed_email();
  my_domain text;
  site_host text;
  wanted smallint[];
  new_id uuid;
begin
  if me is null or my_email is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  my_domain := split_part(my_email, '@', 2);
  if private.is_personal_email_domain(my_domain) then
    raise exception 'A personal email address cannot add a listing'
      using errcode = 'P0001', hint = 'personal_email';
  end if;

  site_host := lower(regexp_replace(regexp_replace(btrim(coalesce(new_website, '')),
    '^https?://', '', 'i'), '[/?#].*$', ''));
  site_host := regexp_replace(site_host, '^www\.', '');
  if site_host = '' or site_host !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' then
    raise exception 'That website address does not look right'
      using errcode = 'P0001', hint = 'website_invalid';
  end if;
  if site_host <> my_domain then
    raise exception 'The website must be on the same domain as your email address'
      using errcode = 'P0001', hint = 'domain_mismatch';
  end if;

  if exists (select 1 from public.agencies a
             where a.status = 'published' and a.domain = my_domain) then
    raise exception 'This website already has a listing'
      using errcode = 'P0001', hint = 'already_listed';
  end if;
  if exists (select 1 from public.listing_submissions s
             where s.domain = my_domain and s.status = 'pending') then
    raise exception 'A listing for this website is already waiting for review'
      using errcode = 'P0001', hint = 'already_submitted';
  end if;
  if (select count(*) from public.listing_submissions s
      where s.user_id = me and s.created_at > now() - interval '1 day') >= 3 then
    raise exception 'Too many listings sent in today' using errcode = 'P0001', hint = 'rate_limited';
  end if;

  select array_agg(distinct s.id) into wanted
  from public.specialisms s where s.id = any (new_specialism_ids);
  if wanted is null or cardinality(wanted) < 1 or cardinality(wanted) > 8 then
    raise exception 'Choose between one and eight specialisms'
      using errcode = 'P0001', hint = 'specialism_count';
  end if;
  if not exists (select 1 from public.countries c where c.id = new_country_id) then
    raise exception 'Choose a country' using errcode = 'P0001', hint = 'country_invalid';
  end if;

  insert into public.listing_submissions
    (user_id, name, website, domain, country_id, city_name, introduction, description, specialism_ids)
  values (
    me,
    private.clean_text(regexp_replace(new_name, '\s+', ' ', 'g')),
    'https://' || site_host,
    my_domain,
    new_country_id,
    private.clean_text(regexp_replace(new_city_name, '\s+', ' ', 'g')),
    private.clean_text(new_introduction),
    private.clean_text(new_description),
    wanted
  )
  returning id into new_id;
  return new_id;
exception
  when check_violation or not_null_violation then
    raise exception 'Some of the details are missing or too long'
      using errcode = 'P0001', hint = 'invalid_details';
  when unique_violation then
    raise exception 'A listing for this website is already waiting for review'
      using errcode = 'P0001', hint = 'already_submitted';
end
$$;

-- ---------------------------------------------------------------------------
-- Functions for the people who run the site
-- ---------------------------------------------------------------------------

create function public.admin_list_submissions()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_site_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id, 'created_at', s.created_at, 'status', s.status,
      'name', s.name, 'website', s.website, 'email', lower(u.email),
      'country', co.name, 'city_name', s.city_name,
      'introduction', s.introduction, 'description', s.description,
      'specialisms', (select jsonb_agg(sp.name order by sp.sort_order)
                      from public.specialisms sp where sp.id = any (s.specialism_ids)),
      'city_exists', exists (
        select 1 from public.cities c
        where c.country_id = s.country_id and c.slug = private.slugify(s.city_name))
    ) order by s.created_at)
    from public.listing_submissions s
    join auth.users u on u.id = s.user_id
    join public.countries co on co.id = s.country_id
    where s.status = 'pending'
  ), '[]'::jsonb);
end
$$;

-- Publishes a submitted listing: creates the city if it is new, creates the
-- agency with a unique address, and makes the sender its owner.
-- Returns the new agency's slug.
create function public.admin_approve_submission(submission_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub public.listing_submissions%rowtype;
  the_city integer;
  city_slug text;
  base_slug text;
  final_slug text;
  n integer := 1;
  new_agency uuid;
begin
  if not private.is_site_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select * into sub from public.listing_submissions s
  where s.id = submission_id and s.status = 'pending'
  for update;
  if not found then
    raise exception 'Submission not found' using errcode = 'P0001', hint = 'not_found';
  end if;
  if exists (select 1 from public.agencies a
             where a.status = 'published' and a.domain = sub.domain) then
    raise exception 'This website already has a listing'
      using errcode = 'P0001', hint = 'already_listed';
  end if;

  city_slug := private.slugify(sub.city_name);
  if city_slug is null then
    raise exception 'The city name cannot be used' using errcode = 'P0001', hint = 'city_invalid';
  end if;
  select c.id into the_city from public.cities c
  where c.country_id = sub.country_id and c.slug = city_slug;
  if the_city is null then
    insert into public.cities (country_id, name, slug)
    values (sub.country_id, sub.city_name, city_slug)
    returning id into the_city;
  end if;

  base_slug := coalesce(private.slugify(sub.name), 'agency');
  if left(base_slug, 12) = 'recruitment-' then
    -- Old-site addresses all began this way and are looked up as redirects.
    base_slug := 'agency-' || base_slug;
  end if;
  base_slug := left(base_slug, 90);
  final_slug := base_slug;
  if exists (select 1 from public.agencies a where a.slug = final_slug) then
    final_slug := left(base_slug || '-' || city_slug, 110);
  end if;
  while exists (select 1 from public.agencies a where a.slug = final_slug) loop
    n := n + 1;
    final_slug := left(base_slug || '-' || city_slug, 110) || '-' || n;
  end loop;

  insert into public.agencies
    (name, slug, website, domain, introduction, description, country_id, city_id, status)
  values
    (sub.name, final_slug, sub.website, sub.domain, sub.introduction, sub.description,
     sub.country_id, the_city, 'published')
  returning id into new_agency;

  insert into public.agency_specialisms (agency_id, specialism_id)
  select new_agency, unnest(sub.specialism_ids)
  on conflict do nothing;

  perform private.grant_membership(new_agency, sub.user_id, 'owner');

  update public.listing_submissions
  set status = 'approved', reviewed_at = now(), reviewed_by = (select auth.uid()),
      agency_id = new_agency
  where id = submission_id;

  return final_slug;
end
$$;

create function public.admin_reject_submission(submission_id uuid, note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_site_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  update public.listing_submissions
  set status = 'rejected', reviewed_at = now(), reviewed_by = (select auth.uid()),
      review_note = left(private.clean_text(note), 500)
  where id = submission_id and status = 'pending';
  if not found then
    raise exception 'Submission not found' using errcode = 'P0001', hint = 'not_found';
  end if;
end
$$;

-- Links a person (by the email they signed in with) to a listing by hand.
-- For people who could only sign in with a personal address.
create function public.admin_link_person(person_email text, agency_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  person uuid;
  target uuid;
begin
  if not private.is_site_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select u.id into person from auth.users u
  where lower(u.email) = lower(btrim(person_email)) and u.email_confirmed_at is not null;
  if person is null then
    raise exception 'Nobody has signed in with that email address yet'
      using errcode = 'P0001', hint = 'person_not_found';
  end if;
  select a.id into target from public.agencies a
  where a.slug = lower(btrim(agency_slug)) and a.status = 'published';
  if target is null then
    raise exception 'No published listing has that address'
      using errcode = 'P0001', hint = 'agency_not_found';
  end if;
  perform private.grant_membership(
    target, person,
    case when exists (select 1 from public.agency_members m where m.agency_id = target)
      then 'member' else 'owner' end);
end
$$;

-- ---------------------------------------------------------------------------
-- Functions only the site's server may call (with its secret key)
-- ---------------------------------------------------------------------------

-- Records a sign-in email and says whether it may be sent: at most 5 an hour
-- to one address, 15 an hour from one visitor, 400 an hour in all.
create function public.allow_login_email(target_email text, visitor_ip text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  e text := lower(btrim(target_email));
begin
  delete from private.login_email_log where created_at < now() - interval '2 days';

  if (select count(*) from private.login_email_log l
      where l.email = e and l.created_at > now() - interval '1 hour') >= 5 then
    return false;
  end if;
  if visitor_ip is not null and (select count(*) from private.login_email_log l
      where l.ip = visitor_ip and l.created_at > now() - interval '1 hour') >= 15 then
    return false;
  end if;
  if (select count(*) from private.login_email_log l
      where l.created_at > now() - interval '1 hour') >= 400 then
    return false;
  end if;

  insert into private.login_email_log (email, ip) values (e, visitor_ip);
  return true;
end
$$;

-- Records a new logo file name after the server has stored the file.
create function public.set_agency_logo(target_agency uuid, new_logo_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_path text;
begin
  if new_logo_path is not null
     and new_logo_path !~ '^[0-9a-f-]{36}-[0-9]{10,16}\.(png|jpg|webp)$' then
    raise exception 'Unexpected logo file name' using errcode = 'P0001';
  end if;
  select a.logo_path into old_path from public.agencies a where a.id = target_agency for update;
  update public.agencies set logo_path = new_logo_path where id = target_agency;
  return old_path;
end
$$;

-- Owners' email addresses for a listing, to tell them a colleague asked to join.
create function public.agency_owner_emails(target_agency uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(lower(u.email)), '{}')
  from public.agency_members m
  join auth.users u on u.id = m.user_id
  where m.agency_id = target_agency and m.role = 'owner' and u.email is not null
$$;

-- ---------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------

revoke all on function
  public.my_account(),
  public.claim_listing(uuid),
  public.claim_single_match(),
  public.decide_access_request(uuid, boolean),
  public.my_listing(uuid),
  public.update_my_listing(uuid, text, text, smallint[]),
  public.submit_new_listing(text, text, smallint, text, text, text, smallint[]),
  public.admin_list_submissions(),
  public.admin_approve_submission(uuid),
  public.admin_reject_submission(uuid, text),
  public.admin_link_person(text, text),
  public.allow_login_email(text, text),
  public.set_agency_logo(uuid, text),
  public.agency_owner_emails(uuid)
from public, anon, authenticated;

grant execute on function
  public.my_account(),
  public.claim_listing(uuid),
  public.claim_single_match(),
  public.decide_access_request(uuid, boolean),
  public.my_listing(uuid),
  public.update_my_listing(uuid, text, text, smallint[]),
  public.submit_new_listing(text, text, smallint, text, text, text, smallint[]),
  public.admin_list_submissions(),
  public.admin_approve_submission(uuid),
  public.admin_reject_submission(uuid, text),
  public.admin_link_person(text, text)
to authenticated;

grant execute on function
  public.allow_login_email(text, text),
  public.set_agency_logo(uuid, text),
  public.agency_owner_emails(uuid)
to service_role;

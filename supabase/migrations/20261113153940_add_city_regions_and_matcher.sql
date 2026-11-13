-- Cities get a state (US), province or territory (Canada) or state or
-- territory (Australia), and one shared matcher decides which existing city a
-- typed place means. "Miami, Florida", "Miami FL" and "miami" all find the
-- same Miami. A new city is only made when nothing matches.
--
-- This change only adds things. City addresses (slugs) stay as they are; the
-- "miami-fl" style addresses come in a later migration.

-- ---------------------------------------------------------------------------
-- Regions
-- ---------------------------------------------------------------------------

create table public.regions (
  id smallint generated always as identity primary key,
  country_id smallint not null references public.countries (id),
  code text not null check (code ~ '^[A-Z]{2,3}$'),
  name text not null check (length(name) between 2 and 60),
  unique (country_id, code),
  unique (country_id, name),
  unique (id, country_id)
);
comment on table public.regions is
  'States, provinces and territories for the countries whose cities need one (US, Canada, Australia). code is the postal code (FL, ON, NSW).';

alter table public.regions enable row level security;
revoke all on public.regions from public, anon, authenticated;
grant select on public.regions to anon, authenticated;
create policy "Anyone can read regions" on public.regions
  for select to anon, authenticated using (true);

insert into public.regions (country_id, code, name)
select co.id, v.code, v.name
from (values
  ('US', 'AL', 'Alabama'),
  ('US', 'AK', 'Alaska'),
  ('US', 'AZ', 'Arizona'),
  ('US', 'AR', 'Arkansas'),
  ('US', 'CA', 'California'),
  ('US', 'CO', 'Colorado'),
  ('US', 'CT', 'Connecticut'),
  ('US', 'DE', 'Delaware'),
  ('US', 'DC', 'District of Columbia'),
  ('US', 'FL', 'Florida'),
  ('US', 'GA', 'Georgia'),
  ('US', 'HI', 'Hawaii'),
  ('US', 'ID', 'Idaho'),
  ('US', 'IL', 'Illinois'),
  ('US', 'IN', 'Indiana'),
  ('US', 'IA', 'Iowa'),
  ('US', 'KS', 'Kansas'),
  ('US', 'KY', 'Kentucky'),
  ('US', 'LA', 'Louisiana'),
  ('US', 'ME', 'Maine'),
  ('US', 'MD', 'Maryland'),
  ('US', 'MA', 'Massachusetts'),
  ('US', 'MI', 'Michigan'),
  ('US', 'MN', 'Minnesota'),
  ('US', 'MS', 'Mississippi'),
  ('US', 'MO', 'Missouri'),
  ('US', 'MT', 'Montana'),
  ('US', 'NE', 'Nebraska'),
  ('US', 'NV', 'Nevada'),
  ('US', 'NH', 'New Hampshire'),
  ('US', 'NJ', 'New Jersey'),
  ('US', 'NM', 'New Mexico'),
  ('US', 'NY', 'New York'),
  ('US', 'NC', 'North Carolina'),
  ('US', 'ND', 'North Dakota'),
  ('US', 'OH', 'Ohio'),
  ('US', 'OK', 'Oklahoma'),
  ('US', 'OR', 'Oregon'),
  ('US', 'PA', 'Pennsylvania'),
  ('US', 'PR', 'Puerto Rico'),
  ('US', 'RI', 'Rhode Island'),
  ('US', 'SC', 'South Carolina'),
  ('US', 'SD', 'South Dakota'),
  ('US', 'TN', 'Tennessee'),
  ('US', 'TX', 'Texas'),
  ('US', 'UT', 'Utah'),
  ('US', 'VT', 'Vermont'),
  ('US', 'VA', 'Virginia'),
  ('US', 'WA', 'Washington'),
  ('US', 'WV', 'West Virginia'),
  ('US', 'WI', 'Wisconsin'),
  ('US', 'WY', 'Wyoming'),
  ('CA', 'AB', 'Alberta'),
  ('CA', 'BC', 'British Columbia'),
  ('CA', 'MB', 'Manitoba'),
  ('CA', 'NB', 'New Brunswick'),
  ('CA', 'NL', 'Newfoundland and Labrador'),
  ('CA', 'NS', 'Nova Scotia'),
  ('CA', 'NT', 'Northwest Territories'),
  ('CA', 'NU', 'Nunavut'),
  ('CA', 'ON', 'Ontario'),
  ('CA', 'PE', 'Prince Edward Island'),
  ('CA', 'QC', 'Quebec'),
  ('CA', 'SK', 'Saskatchewan'),
  ('CA', 'YT', 'Yukon'),
  ('AU', 'ACT', 'Australian Capital Territory'),
  ('AU', 'NSW', 'New South Wales'),
  ('AU', 'NT', 'Northern Territory'),
  ('AU', 'QLD', 'Queensland'),
  ('AU', 'SA', 'South Australia'),
  ('AU', 'TAS', 'Tasmania'),
  ('AU', 'VIC', 'Victoria'),
  ('AU', 'WA', 'Western Australia')
) as v (iso2, code, name)
join public.countries co on co.iso2 = v.iso2;

alter table public.cities add column region_id smallint;
alter table public.cities add constraint cities_region_fkey
  foreign key (region_id, country_id) references public.regions (id, country_id);
create index cities_region_idx on public.cities (region_id);
comment on column public.cities.region_id is
  'The state, province or territory. Set for every US, Canadian and Australian city.';

-- ---------------------------------------------------------------------------
-- Other names for a city
-- ---------------------------------------------------------------------------

create table public.city_aliases (
  country_id smallint not null,
  alias_slug text not null check (alias_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  city_id integer not null,
  primary key (country_id, alias_slug),
  foreign key (city_id, country_id) references public.cities (id, country_id) on delete cascade
);
comment on table public.city_aliases is
  'Other spellings and old addresses of a city (Muenchen, den-haag). A city page asked for by an alias redirects to the city.';
create index city_aliases_city_idx on public.city_aliases (city_id);

alter table public.city_aliases enable row level security;
revoke all on public.city_aliases from public, anon, authenticated;
grant select on public.city_aliases to anon, authenticated;
create policy "Anyone can read city aliases" on public.city_aliases
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Matching
-- ---------------------------------------------------------------------------

-- The key two place names are compared by: "St. Petersburg", "Saint
-- Petersburg" and "st petersburg" all give "saint-petersburg".
create function private.place_key(input text)
returns text
language sql
stable
set search_path = ''
as $$
  select private.slugify(
    regexp_replace(regexp_replace(regexp_replace(
      lower(coalesce(input, '')),
      '\m(st)\M\.?\s*', 'saint ', 'g'),
      '\m(ft)\M\.?\s*', 'fort ', 'g'),
      '\m(mt)\M\.?\s*', 'mount ', 'g'))
$$;

-- Finds the region a piece of text names, by code ("FL") or name ("Florida").
create function private.find_region(target_country smallint, input text)
returns smallint
language sql
stable
set search_path = ''
as $$
  select r.id from public.regions r
  where r.country_id = target_country
    and (r.code = upper(btrim(input)) or private.place_key(r.name) = private.place_key(input))
  limit 1
$$;

-- Splits a typed place into the city part and the region it names, and drops
-- a trailing country ("Miami, Florida, USA" gives "Miami" and Florida).
-- region_id is null when the text names no region.
create function private.split_place(target_country smallint, place text)
returns table (full_text text, city_text text, region_id smallint)
language plpgsql
stable
set search_path = ''
as $$
#variable_conflict use_column
declare
  co public.countries%rowtype;
  parts text[];
  last_part text;
  words text[];
  k integer;
  found_region smallint;
begin
  select * into co from public.countries c where c.id = target_country;
  full_text := btrim(regexp_replace(coalesce(place, ''), '\s+', ' ', 'g'));
  full_text := btrim(full_text, ' ,');

  -- Drop a trailing country part.
  parts := regexp_split_to_array(full_text, '\s*,\s*');
  if cardinality(parts) > 1 then
    last_part := parts[cardinality(parts)];
    if private.place_key(last_part) = co.slug
       or lower(last_part) = lower(co.iso2)
       or private.place_key(last_part) = private.place_key(co.name)
       or (co.iso2 = 'US' and private.place_key(last_part) in
           ('usa', 'u-s-a', 'u-s', 'america', 'united-states-of-america'))
       or (co.iso2 = 'GB' and private.place_key(last_part) in
           ('uk', 'u-k', 'great-britain', 'britain', 'england', 'scotland', 'wales', 'northern-ireland'))
       or (co.iso2 = 'AE' and private.place_key(last_part) in ('uae', 'u-a-e'))
    then
      parts := parts[1:cardinality(parts) - 1];
      full_text := array_to_string(parts, ', ');
    end if;
  end if;

  city_text := full_text;
  region_id := null;
  if not exists (select 1 from public.regions r where r.country_id = target_country) then
    return next;
    return;
  end if;

  -- "Miami, Florida" or "Miami, FL".
  if cardinality(parts) > 1 then
    found_region := private.find_region(target_country, parts[cardinality(parts)]);
    if found_region is not null then
      city_text := array_to_string(parts[1:cardinality(parts) - 1], ', ');
      region_id := found_region;
      return next;
      return;
    end if;
  end if;

  -- "Miami FL", "Miami Florida", "Sydney New South Wales".
  words := regexp_split_to_array(full_text, '\s+');
  for k in reverse least(3, cardinality(words) - 1)..1 loop
    found_region := private.find_region(target_country,
      array_to_string(words[cardinality(words) - k + 1:cardinality(words)], ' '));
    if found_region is not null then
      city_text := btrim(array_to_string(words[1:cardinality(words) - k], ' '), ' ,');
      region_id := found_region;
      return next;
      return;
    end if;
  end loop;

  return next;
end
$$;

-- The one place matcher, used by search, the listing form and listing review.
-- Returns the existing cities the typed place can mean, the most likely
-- first. A region (code or name) narrows the result. No rows means there is
-- no such city yet.
create function public.match_city(target_country smallint, place text, region text default null)
returns table (
  city_id integer,
  name text,
  slug text,
  region_code text,
  region_name text,
  agency_count integer,
  matched_by text
)
language plpgsql
stable
set search_path = ''
as $$
#variable_conflict use_column
declare
  sp record;
  wanted_region smallint;
  lookup text;
  narrow smallint;
  pass integer;
begin
  if target_country is null or coalesce(btrim(place), '') = '' then
    return;
  end if;
  select * into sp from private.split_place(target_country, place);
  if nullif(btrim(coalesce(region, '')), '') is not null then
    wanted_region := private.find_region(target_country, region);
    if wanted_region is null then
      return;
    end if;
  end if;

  -- The whole text first ("Virginia Beach" is a city, not Beach in Virginia),
  -- then the city part once a region is split off ("Miami FL").
  for pass in 1..2 loop
    if pass = 1 then
      lookup := sp.full_text;
      narrow := wanted_region;
    else
      continue when sp.region_id is null;
      lookup := sp.city_text;
      narrow := coalesce(wanted_region, sp.region_id);
    end if;
    continue when private.place_key(lookup) is null;

    -- A city with no region yet still matches: it is not known to be elsewhere.
    return query
      select ci.id, ci.name, ci.slug, r.code, r.name, s.agency_count, max(m.matched_by)
      from (
        select c.id as cid, 'name'::text as matched_by
        from public.cities c
        where c.country_id = target_country and private.place_key(c.name) = private.place_key(lookup)
        union all
        select a.city_id, 'alias'
        from public.city_aliases a
        where a.country_id = target_country
          and a.alias_slug in (private.place_key(lookup), private.slugify(lookup))
      ) m
      join public.cities ci on ci.id = m.cid
      left join public.regions r on r.id = ci.region_id
      cross join lateral (
        select count(*)::integer as agency_count
        from public.agencies ag where ag.city_id = ci.id and ag.status = 'published'
      ) s
      where narrow is null or ci.region_id is null or ci.region_id = narrow
      group by ci.id, ci.name, ci.slug, r.code, r.name, s.agency_count
      order by (narrow is not null and ci.region_id is not distinct from narrow) desc,
               s.agency_count desc, ci.id;
    if found then
      return;
    end if;
  end loop;
end
$$;
comment on function public.match_city(smallint, text, text) is
  'Finds the existing cities a typed place means ("Miami, Florida", "Miami FL", "Muenchen"), most likely first. Used by search, the listing form and listing review.';

revoke all on function public.match_city(smallint, text, text) from public;
grant execute on function public.match_city(smallint, text, text) to anon, authenticated, service_role;
revoke all on function private.place_key(text), private.find_region(smallint, text),
  private.split_place(smallint, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Aliases from the old site's place names
-- ---------------------------------------------------------------------------

insert into public.city_aliases (country_id, alias_slug, city_id)
select distinct on (co.id, private.place_key(m.legacy_city)) co.id, private.place_key(m.legacy_city), ci.id
from private.legacy_city_map m
join public.countries co on co.name = m.country
join public.cities ci on ci.country_id = co.id and ci.name = m.city
where private.place_key(m.legacy_city) is not null
  and private.place_key(m.legacy_city) <> private.place_key(ci.name)
on conflict do nothing;

insert into public.city_aliases (country_id, alias_slug, city_id)
select distinct on (co.id, private.slugify(m.legacy_city)) co.id, private.slugify(m.legacy_city), ci.id
from private.legacy_city_map m
join public.countries co on co.name = m.country
join public.cities ci on ci.country_id = co.id and ci.name = m.city
where private.slugify(m.legacy_city) is not null
  and private.slugify(m.legacy_city) <> ci.slug
  and private.slugify(m.legacy_city) <> private.place_key(ci.name)
on conflict do nothing;

insert into public.city_aliases (country_id, alias_slug, city_id)
select ci.country_id, 'al-sharjah', ci.id
from public.cities ci join public.countries co on co.id = ci.country_id
where co.slug = 'united-arab-emirates' and ci.slug = 'sharjah'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- City counts show the region
-- ---------------------------------------------------------------------------

create or replace view public.city_stats with (security_invoker = true) as
select
  ci.id as city_id,
  ci.name,
  ci.slug,
  ci.photo_path,
  ci.country_id,
  co.name as country_name,
  co.slug as country_slug,
  co.iso2 as country_iso2,
  s.agency_count,
  s.agency_count >= 3 as is_indexable,
  r.code as region_code,
  r.name as region_name
from public.cities ci
join public.countries co on co.id = ci.country_id
left join public.regions r on r.id = ci.region_id
cross join lateral (
  select count(*)::integer as agency_count
  from public.agencies a
  where a.city_id = ci.id and a.status = 'published'
) s;

-- ---------------------------------------------------------------------------
-- Listing submissions carry the region
-- ---------------------------------------------------------------------------

alter table public.listing_submissions add column region_id smallint;
alter table public.listing_submissions add constraint listing_submissions_region_fkey
  foreign key (region_id, country_id) references public.regions (id, country_id);

drop function public.submit_new_listing(text, text, smallint, text, text, text, smallint[]);

create function public.submit_new_listing(
  new_name text,
  new_website text,
  new_country_id smallint,
  new_city_name text,
  new_introduction text,
  new_description text,
  new_specialism_ids smallint[],
  new_region_id smallint default null
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
  if new_region_id is not null and not exists (
    select 1 from public.regions r where r.id = new_region_id and r.country_id = new_country_id
  ) then
    raise exception 'Choose a state' using errcode = 'P0001', hint = 'region_invalid';
  end if;

  insert into public.listing_submissions
    (user_id, name, website, domain, country_id, region_id, city_name, introduction, description, specialism_ids)
  values (
    me,
    private.clean_text(regexp_replace(new_name, '\s+', ' ', 'g')),
    'https://' || site_host,
    my_domain,
    new_country_id,
    new_region_id,
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

revoke all on function
  public.submit_new_listing(text, text, smallint, text, text, text, smallint[], smallint)
from public, anon, authenticated;
grant execute on function
  public.submit_new_listing(text, text, smallint, text, text, text, smallint[], smallint)
to authenticated;

-- Review list: shows the region and the existing city the listing will join.
create or replace function public.admin_list_submissions()
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
      'region', r.name, 'region_code', r.code,
      'introduction', s.introduction, 'description', s.description,
      'specialisms', (select jsonb_agg(sp.name order by sp.sort_order)
                      from public.specialisms sp where sp.id = any (s.specialism_ids)),
      'city_exists', m.city_id is not null,
      'matched_city', case when m.city_id is null then null else jsonb_build_object(
        'id', m.city_id, 'name', m.name, 'slug', m.slug,
        'region_code', m.region_code, 'agency_count', m.agency_count) end
    ) order by s.created_at)
    from public.listing_submissions s
    join auth.users u on u.id = s.user_id
    join public.countries co on co.id = s.country_id
    left join public.regions r on r.id = s.region_id
    left join lateral (
      select * from public.match_city(s.country_id, s.city_name, r.code) limit 1
    ) m on true
    where s.status = 'pending'
  ), '[]'::jsonb);
end
$$;

-- Publishes a submitted listing. The city comes from match_city; a new city
-- is only made when nothing matches, named without the state text and with
-- the state set (address "portland-me").
create or replace function public.admin_approve_submission(submission_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub public.listing_submissions%rowtype;
  sp record;
  the_city integer;
  city_slug text;
  city_region smallint;
  city_label text;
  region_code text;
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

  select r.code into region_code from public.regions r where r.id = sub.region_id;
  select m.city_id, m.slug into the_city, city_slug
  from public.match_city(sub.country_id, sub.city_name, region_code) m
  limit 1;

  if the_city is not null then
    if sub.region_id is not null then
      update public.cities c set region_id = sub.region_id
      where c.id = the_city and c.region_id is null;
    end if;
  else
    select * into sp from private.split_place(sub.country_id, sub.city_name);
    city_region := coalesce(sub.region_id, sp.region_id);
    city_label := case when sp.region_id is not null then sp.city_text else sp.full_text end;
    city_label := private.clean_text(btrim(city_label, ' ,'));
    if private.slugify(city_label) is null then
      raise exception 'The city name cannot be used' using errcode = 'P0001', hint = 'city_invalid';
    end if;
    if city_region is null
       and exists (select 1 from public.regions r where r.country_id = sub.country_id) then
      raise exception 'Choose the state for this city' using errcode = 'P0001', hint = 'region_required';
    end if;
    select r.code into region_code from public.regions r where r.id = city_region;
    base_slug := private.slugify(city_label)
      || case when region_code is not null then '-' || lower(region_code) else '' end;
    city_slug := base_slug;
    while exists (select 1 from public.cities c
                  where c.country_id = sub.country_id and c.slug = city_slug) loop
      n := n + 1;
      city_slug := base_slug || '-' || n;
    end loop;
    n := 1;
    insert into public.cities (country_id, region_id, name, slug)
    values (sub.country_id, city_region, city_label, city_slug)
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

-- Agency listings for the owner's AI agent (Grokbot), through the MCP
-- connector. Same API keys, limits and checks as the blog functions: the key
-- is the credential and is checked in the database with every call.
--
-- What the agent can do:
--   * look listings up (by name or website) before adding one;
--   * add free listings, published at once (like an approved submission);
--   * edit listings no agency has claimed (claimed ones belong to their owner);
--   * give a listing Premium without payment ("comped", for Lovelio clients),
--     and take a comped Premium away again. Premium paid through Stripe is
--     never touched.

-- ---------------------------------------------------------------------------
-- Who added a listing, and comped Premium
-- ---------------------------------------------------------------------------

alter table private.agency_private
  add column created_by_key uuid references private.api_keys (id) on delete set null,
  add column created_by text check (char_length(created_by) <= 200),
  add column premium_comped_at timestamptz,
  add column premium_comped_by text check (char_length(premium_comped_by) <= 200),
  add column premium_comp_note text check (char_length(premium_comp_note) <= 300);

comment on column private.agency_private.created_by_key is
  'The API key that added this listing through the connector; null for listings from the old site or from agency sign-up.';
comment on column private.agency_private.premium_comped_at is
  'Set when Premium was given without payment through the connector (for example to a Lovelio client). Null for Stripe-paid Premium.';

create index agency_private_created_by_key_idx on private.agency_private (created_by_key)
  where created_by_key is not null;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- The same city matching and city creation as admin approval: an existing
-- city if one matches, otherwise a new one with a region-coded slug.
create function private.find_or_create_city(target_country smallint, city_name text, target_region smallint)
returns table (city_id integer, city_slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  sp record;
  the_city integer;
  the_slug text;
  city_region smallint;
  city_label text;
  region_code text;
  base_slug text;
  n integer := 1;
begin
  select r.code into region_code from public.regions r where r.id = target_region;
  select m.city_id, m.slug into the_city, the_slug
  from public.match_city(target_country, city_name, region_code) m
  limit 1;

  if the_city is not null then
    if target_region is not null then
      update public.cities c set region_id = target_region
      where c.id = the_city and c.region_id is null;
    end if;
    return query select the_city, the_slug;
    return;
  end if;

  select * into sp from private.split_place(target_country, city_name);
  city_region := coalesce(target_region, sp.region_id);
  city_label := case when sp.region_id is not null then sp.city_text else sp.full_text end;
  city_label := private.clean_text(btrim(city_label, ' ,'));
  if private.slugify(city_label) is null then
    raise exception 'The city name "%" cannot be used.', city_name using errcode = '22023';
  end if;
  if city_region is null
     and exists (select 1 from public.regions r where r.country_id = target_country) then
    raise exception 'This country needs a region (state or province) for a new city: pass "region" as its code, e.g. "NSW", "TX" or "ON".'
      using errcode = '22023';
  end if;
  select r.code into region_code from public.regions r where r.id = city_region;
  base_slug := private.slugify(city_label)
    || case when region_code is not null then '-' || lower(region_code) else '' end;
  the_slug := base_slug;
  while exists (select 1 from public.cities c
                where c.country_id = target_country and c.slug = the_slug) loop
    n := n + 1;
    the_slug := base_slug || '-' || n;
  end loop;
  insert into public.cities (country_id, region_id, name, slug)
  values (target_country, city_region, city_label, the_slug)
  returning id into the_city;
  return query select the_city, the_slug;
end
$$;

-- A free agency slug, built the same way as admin approval.
create function private.new_agency_slug(agency_name text, city_slug text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  base_slug text := coalesce(private.slugify(agency_name), 'agency');
  final_slug text;
  n integer := 1;
begin
  if left(base_slug, 12) = 'recruitment-' then
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
  return final_slug;
end
$$;

-- Country by slug, two-letter code or name.
create function private.bot_country(country text)
returns public.countries
language plpgsql
stable
set search_path = ''
as $$
declare
  c public.countries;
  t text := lower(btrim(coalesce(country, '')));
begin
  select * into c from public.countries x
  where x.slug = t or lower(x.iso2) = t or lower(x.name) = t
     or (t in ('uk', 'gb', 'great britain', 'england', 'scotland', 'wales') and x.slug = 'united-kingdom')
     or (t in ('us', 'usa', 'united states of america') and x.slug = 'united-states')
     or (t = 'uae' and x.slug = 'united-arab-emirates')
  limit 1;
  if c.id is null then
    raise exception 'Unknown country "%". Use a country slug from get_listing_options, e.g. "united-kingdom".', country
      using errcode = '22023';
  end if;
  return c;
end
$$;

-- Region by code or name within a country; null when none was given.
create function private.bot_region(target_country smallint, region text)
returns smallint
language plpgsql
stable
set search_path = ''
as $$
declare
  rid smallint;
  t text := lower(btrim(coalesce(region, '')));
begin
  if t = '' then return null; end if;
  select r.id into rid from public.regions r
  where r.country_id = target_country and (lower(r.code) = t or lower(r.name) = t)
  limit 1;
  if rid is null then
    raise exception 'Unknown region "%" for this country. Use a region code from get_listing_options.', region
      using errcode = '22023';
  end if;
  return rid;
end
$$;

-- Specialism ids from slugs: 1 to 8, all known.
create function private.bot_specialism_ids(slugs text[])
returns smallint[]
language plpgsql
stable
set search_path = ''
as $$
declare
  wanted text[] := array(select distinct lower(btrim(s)) from unnest(coalesce(slugs, '{}')) s where btrim(s) <> '');
  ids smallint[];
  unknown text;
begin
  if cardinality(wanted) < 1 or cardinality(wanted) > 8 then
    raise exception 'Give 1 to 8 specialisms (slugs from get_listing_options).' using errcode = '22023';
  end if;
  select string_agg(w, ', ') into unknown
  from unnest(wanted) w where not exists (select 1 from public.specialisms s where s.slug = w);
  if unknown is not null then
    raise exception 'Unknown specialism: %. Use slugs from get_listing_options.', unknown using errcode = '22023';
  end if;
  select array_agg(s.id order by s.sort_order) into ids from public.specialisms s where s.slug = any (wanted);
  return ids;
end
$$;

-- Listing words, with the limits of the agency forms.
create function private.bot_check_listing_text(new_name text, new_introduction text, new_description text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if new_name is not null and char_length(new_name) not between 2 and 120 then
    raise exception 'The name must be 2 to 120 characters.' using errcode = '22023';
  end if;
  if new_introduction is not null and char_length(new_introduction) > 300 then
    raise exception 'The introduction must be 300 characters or fewer (it is %).', char_length(new_introduction)
      using errcode = '22023';
  end if;
  if new_description is not null and char_length(new_description) not between 80 and 4000 then
    raise exception 'The description must be 80 to 4,000 characters (it is %).', char_length(new_description)
      using errcode = '22023';
  end if;
end
$$;

-- One listing as the agent sees it.
create function private.bot_agency_json(target uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id,
    'slug', a.slug,
    'name', a.name,
    'website', a.website,
    'domain', a.domain,
    'country_slug', c.slug,
    'country', c.name,
    'city_slug', ci.slug,
    'city', ci.name,
    'region', r.code,
    'introduction', a.introduction,
    'description', a.description,
    'specialisms', coalesce((
      select jsonb_agg(s.slug order by s.sort_order)
      from public.agency_specialisms x join public.specialisms s on s.id = x.specialism_id
      where x.agency_id = a.id), '[]'::jsonb),
    'plan', a.plan,
    'premium_source', case
      when a.plan <> 'premium' then null
      when p.premium_comped_at is not null and p.stripe_subscription_id is null then 'comped'
      else 'paid' end,
    'premium_comp_note', case when a.plan = 'premium' then p.premium_comp_note end,
    'is_claimed', a.is_claimed,
    'status', a.status,
    'has_logo', a.logo_path is not null,
    'added_by_connector', p.created_by_key is not null,
    'created_at', a.created_at,
    'updated_at', a.updated_at
  )
  from public.agencies a
  join public.countries c on c.id = a.country_id
  left join public.cities ci on ci.id = a.city_id
  left join public.regions r on r.id = ci.region_id
  left join private.agency_private p on p.agency_id = a.id
  where a.id = target
$$;

-- The bare host of a website address, as stored in agencies.domain.
create function private.bot_domain(website text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(regexp_replace(regexp_replace(regexp_replace(lower(btrim(coalesce(website, ''))),
    '^https?://', ''), '[/?#].*$', ''), '^www\.', ''), '')
$$;

revoke all on function
  private.find_or_create_city(smallint, text, smallint),
  private.new_agency_slug(text, text),
  private.bot_country(text),
  private.bot_region(smallint, text),
  private.bot_specialism_ids(text[]),
  private.bot_check_listing_text(text, text, text),
  private.bot_agency_json(uuid),
  private.bot_domain(text)
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- What the agent calls
-- ---------------------------------------------------------------------------

-- Countries, regions and specialisms, so the agent passes known values.
create function public.bot_listing_options(api_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  k private.api_keys := private.use_api_key(api_key, false);
begin
  return jsonb_build_object(
    'countries', (
      select jsonb_agg(jsonb_build_object(
        'slug', c.slug, 'name', c.name, 'code', c.iso2,
        'regions', (select jsonb_agg(jsonb_build_object('code', r.code, 'name', r.name) order by r.name)
                    from public.regions r where r.country_id = c.id)
      ) order by c.name)
      from public.countries c),
    'specialisms', (
      select jsonb_agg(jsonb_build_object('slug', s.slug, 'name', s.name) order by s.sort_order)
      from public.specialisms s)
  );
end
$$;

-- Look listings up: by websites (exact domain) and/or by words in the name.
create function public.bot_find_agencies(api_key text, websites text[], name_query text, max_rows integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  k private.api_keys := private.use_api_key(api_key, false);
  domains text[];
  q text := btrim(coalesce(name_query, ''));
  lim integer := least(greatest(coalesce(max_rows, 20), 1), 100);
  by_domain jsonb;
  by_name jsonb;
begin
  if cardinality(coalesce(websites, '{}')) > 200 then
    raise exception 'Check at most 200 websites per call.' using errcode = '22023';
  end if;
  domains := array(select distinct private.bot_domain(w) from unnest(coalesce(websites, '{}')) w
                   where private.bot_domain(w) is not null);

  if cardinality(domains) > 0 then
    select jsonb_agg(jsonb_build_object(
      'website', d,
      'listed', exists (select 1 from public.agencies a where a.domain = d),
      'listings', coalesce((
        select jsonb_agg(jsonb_build_object('slug', a.slug, 'name', a.name, 'city', ci.name,
                                            'country_slug', c.slug, 'status', a.status, 'plan', a.plan,
                                            'is_claimed', a.is_claimed))
        from public.agencies a
        join public.countries c on c.id = a.country_id
        left join public.cities ci on ci.id = a.city_id
        where a.domain = d), '[]'::jsonb)
    ) order by d)
    into by_domain
    from unnest(domains) d;
  end if;

  if char_length(q) >= 2 then
    select jsonb_agg(x) into by_name from (
      select jsonb_build_object('slug', a.slug, 'name', a.name, 'domain', a.domain, 'city', ci.name,
                                'country_slug', c.slug, 'status', a.status, 'plan', a.plan,
                                'is_claimed', a.is_claimed) x
      from public.agencies a
      join public.countries c on c.id = a.country_id
      left join public.cities ci on ci.id = a.city_id
      where a.name ilike '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%'
      order by (lower(a.name) = lower(q)) desc, a.status = 'published' desc, a.name
      limit lim
    ) s;
  end if;

  return jsonb_build_object('by_website', coalesce(by_domain, '[]'::jsonb),
                            'by_name', coalesce(by_name, '[]'::jsonb));
end
$$;

-- One listing in full.
create function public.bot_get_agency(api_key text, agency_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  k private.api_keys := private.use_api_key(api_key, false);
  target uuid;
begin
  select a.id into target from public.agencies a where a.slug = lower(btrim(agency_slug));
  if target is null then
    raise exception 'No listing with the slug "%".', agency_slug using errcode = 'P0002';
  end if;
  return private.bot_agency_json(target);
end
$$;

-- Add a listing, published at once.
create function public.bot_create_agency(
  api_key text,
  new_name text,
  new_website text,
  new_country text,
  new_city text,
  new_region text,
  new_introduction text,
  new_description text,
  new_specialisms text[],
  branch_office boolean default false,
  make_premium boolean default false,
  premium_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  k private.api_keys := private.use_api_key(api_key, true);
  actor text := private.api_key_actor(k);
  the_name text := private.clean_text(btrim(coalesce(new_name, '')));
  the_intro text := nullif(btrim(coalesce(new_introduction, '')), '');
  the_desc text := btrim(coalesce(new_description, ''));
  the_domain text := private.bot_domain(new_website);
  the_website text;
  ctry public.countries;
  the_region smallint;
  spec smallint[];
  place record;
  final_slug text;
  new_agency uuid;
  clash record;
begin
  perform private.bot_check_listing_text(the_name, the_intro, the_desc);
  if the_domain is null
     or the_domain !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' then
    raise exception 'The website "%" is not a plain web address. Pass e.g. "https://www.example.com".', new_website
      using errcode = '22023';
  end if;
  -- Keep "www." when the agent gave it: most of these sites answer there.
  the_website := 'https://' || regexp_replace(regexp_replace(lower(btrim(new_website)), '^https?://', ''), '[/?#].*$', '');
  if char_length(btrim(coalesce(new_city, ''))) not between 2 and 80 then
    raise exception 'The city must be 2 to 80 characters.' using errcode = '22023';
  end if;
  if premium_note is not null and char_length(premium_note) > 300 then
    raise exception 'premium_note must be 300 characters or fewer.' using errcode = '22023';
  end if;

  ctry := private.bot_country(new_country);
  the_region := private.bot_region(ctry.id, new_region);
  spec := private.bot_specialism_ids(new_specialisms);

  -- One listing per website, except a branch office in another city.
  select a.slug, a.status, a.city_id into clash
  from public.agencies a where a.domain = the_domain
  order by a.status = 'published' desc limit 1;
  if found and not coalesce(branch_office, false) then
    raise exception 'Already listed: % has the listing "%" (status %). Use update_agency_listing to change it, or pass branch_office=true for a separate office in another city.',
      the_domain, clash.slug, clash.status using errcode = '23505';
  end if;

  select * into place from private.find_or_create_city(ctry.id, btrim(new_city), the_region);

  if exists (select 1 from public.agencies a where a.domain = the_domain and a.city_id = place.city_id) then
    raise exception 'Already listed: % has a listing in this city.', the_domain using errcode = '23505';
  end if;

  final_slug := private.new_agency_slug(the_name, place.city_slug);

  insert into public.agencies
    (name, slug, website, domain, introduction, description, country_id, city_id, status, plan)
  values
    (the_name, final_slug, the_website, the_domain, the_intro, the_desc,
     ctry.id, place.city_id, 'published', case when make_premium then 'premium' else 'free' end)
  returning id into new_agency;

  insert into public.agency_specialisms (agency_id, specialism_id)
  select new_agency, unnest(spec)
  on conflict do nothing;

  insert into private.agency_private
    (agency_id, created_by_key, created_by, premium_since, premium_comped_at, premium_comped_by, premium_comp_note)
  values
    (new_agency, k.id, actor,
     case when make_premium then now() end,
     case when make_premium then now() end,
     case when make_premium then actor end,
     case when make_premium then nullif(btrim(premium_note), '') end);

  return private.bot_agency_json(new_agency);
end
$$;

-- Change a listing no agency has claimed. Null leaves a field as it is.
create function public.bot_update_agency(
  api_key text,
  agency_slug text,
  new_name text,
  new_website text,
  new_country text,
  new_city text,
  new_region text,
  new_introduction text,
  new_description text,
  new_specialisms text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  k private.api_keys := private.use_api_key(api_key, true);
  a public.agencies;
  old_listing jsonb;
  the_domain text;
  ctry public.countries;
  the_region smallint;
  spec smallint[];
  new_city_id integer;
begin
  select * into a from public.agencies x where x.slug = lower(btrim(agency_slug)) for update;
  if a.id is null then
    raise exception 'No listing with the slug "%".', agency_slug using errcode = 'P0002';
  end if;
  if a.is_claimed then
    raise exception 'The agency has claimed this listing, so only they can edit it.' using errcode = '42501';
  end if;
  old_listing := private.bot_agency_json(a.id);

  new_name := nullif(private.clean_text(btrim(coalesce(new_name, ''))), '');
  new_introduction := case when new_introduction is null then null else btrim(new_introduction) end;
  new_description := nullif(btrim(coalesce(new_description, '')), '');
  perform private.bot_check_listing_text(new_name, new_introduction, new_description);

  if new_website is not null then
    the_domain := private.bot_domain(new_website);
    if the_domain is null
       or the_domain !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' then
      raise exception 'The website "%" is not a plain web address.', new_website using errcode = '22023';
    end if;
    if the_domain is distinct from a.domain
       and exists (select 1 from public.agencies x where x.domain = the_domain and x.id <> a.id) then
      raise exception 'Another listing already uses %.', the_domain using errcode = '23505';
    end if;
  end if;

  if new_country is not null or new_city is not null or new_region is not null then
    if new_city is null then
      raise exception 'Pass "city" (and "region" where needed) when moving a listing.' using errcode = '22023';
    end if;
    if char_length(btrim(new_city)) not between 2 and 80 then
      raise exception 'The city must be 2 to 80 characters.' using errcode = '22023';
    end if;
    if new_country is null then
      select * into ctry from public.countries c where c.id = a.country_id;
    else
      ctry := private.bot_country(new_country);
    end if;
    the_region := private.bot_region(ctry.id, new_region);
    select f.city_id into new_city_id from private.find_or_create_city(ctry.id, btrim(new_city), the_region) f;
  end if;

  if new_specialisms is not null then
    spec := private.bot_specialism_ids(new_specialisms);
  end if;

  update public.agencies x set
    name = coalesce(new_name, x.name),
    website = case when new_website is null then x.website
                   else 'https://' || regexp_replace(regexp_replace(lower(btrim(new_website)), '^https?://', ''), '[/?#].*$', '') end,
    domain = coalesce(the_domain, x.domain),
    introduction = case when new_introduction is null then x.introduction else nullif(new_introduction, '') end,
    description = coalesce(new_description, x.description),
    country_id = coalesce(ctry.id, x.country_id),
    city_id = coalesce(new_city_id, x.city_id)
  where x.id = a.id;

  if spec is not null then
    delete from public.agency_specialisms s where s.agency_id = a.id and s.specialism_id <> all (spec);
    insert into public.agency_specialisms (agency_id, specialism_id)
    select a.id, unnest(spec) on conflict do nothing;
  end if;

  return jsonb_build_object('before', old_listing, 'after', private.bot_agency_json(a.id));
end
$$;

-- Give Premium without payment, or take a comped Premium away.
create function public.bot_set_agency_premium(api_key text, agency_slug text, premium boolean, note text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  k private.api_keys := private.use_api_key(api_key, true);
  a public.agencies;
  p private.agency_private;
  old_listing jsonb;
  outcome text;
begin
  if premium is null then
    raise exception 'Pass premium=true or premium=false.' using errcode = '22023';
  end if;
  if note is not null and char_length(note) > 300 then
    raise exception 'note must be 300 characters or fewer.' using errcode = '22023';
  end if;
  select * into a from public.agencies x where x.slug = lower(btrim(agency_slug)) for update;
  if a.id is null then
    raise exception 'No listing with the slug "%".', agency_slug using errcode = 'P0002';
  end if;
  if a.status <> 'published' then
    raise exception 'This listing is hidden; Premium can only be given to a published listing.' using errcode = '22023';
  end if;
  insert into private.agency_private (agency_id) values (a.id) on conflict (agency_id) do nothing;
  select * into p from private.agency_private x where x.agency_id = a.id for update;
  old_listing := private.bot_agency_json(a.id);

  if premium then
    if a.plan = 'premium' and p.stripe_subscription_id is not null then
      outcome := 'already_paid';
    else
      update private.agency_private x set
        premium_since = coalesce(x.premium_since, now()),
        premium_comped_at = coalesce(x.premium_comped_at, now()),
        premium_comped_by = coalesce(x.premium_comped_by, private.api_key_actor(k)),
        premium_comp_note = coalesce(nullif(btrim(note), ''), x.premium_comp_note)
      where x.agency_id = a.id;
      update public.agencies x set plan = 'premium' where x.id = a.id and x.plan <> 'premium';
      outcome := case when a.plan = 'premium' then 'already_premium' else 'premium_given' end;
    end if;
  else
    if a.plan <> 'premium' then
      outcome := 'already_free';
    elsif p.stripe_subscription_id is not null or p.premium_comped_at is null then
      raise exception 'This listing pays for Premium itself, so the connector cannot remove it.' using errcode = '42501';
    else
      update private.agency_private x set
        premium_since = null, premium_comped_at = null, premium_comped_by = null, premium_comp_note = null
      where x.agency_id = a.id;
      update public.agencies x set plan = 'free' where x.id = a.id;
      outcome := 'premium_removed';
    end if;
  end if;

  return jsonb_build_object('outcome', outcome, 'listing', private.bot_agency_json(a.id));
end
$$;

-- For the logo search after a listing is added: the key is checked, the
-- listing must not be claimed (its owner manages the logo).
create function public.bot_agency_for_logo(api_key text, agency_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  k private.api_keys := private.use_api_key(api_key, true);
  a public.agencies;
begin
  select * into a from public.agencies x where x.slug = lower(btrim(agency_slug));
  if a.id is null then
    raise exception 'No listing with the slug "%".', agency_slug using errcode = 'P0002';
  end if;
  if a.is_claimed then
    raise exception 'The agency has claimed this listing, so only they can change its logo.' using errcode = '42501';
  end if;
  return jsonb_build_object('id', a.id, 'slug', a.slug, 'website', a.website, 'domain', a.domain,
                            'logo_path', a.logo_path);
end
$$;

revoke all on function
  public.bot_listing_options(text),
  public.bot_find_agencies(text, text[], text, integer),
  public.bot_get_agency(text, text),
  public.bot_create_agency(text, text, text, text, text, text, text, text, text[], boolean, boolean, text),
  public.bot_update_agency(text, text, text, text, text, text, text, text, text, text[]),
  public.bot_set_agency_premium(text, text, boolean, text),
  public.bot_agency_for_logo(text, text)
from public;

grant execute on function
  public.bot_listing_options(text),
  public.bot_find_agencies(text, text[], text, integer),
  public.bot_get_agency(text, text),
  public.bot_create_agency(text, text, text, text, text, text, text, text, text[], boolean, boolean, text),
  public.bot_update_agency(text, text, text, text, text, text, text, text, text, text[]),
  public.bot_set_agency_premium(text, text, boolean, text),
  public.bot_agency_for_logo(text, text)
to anon, authenticated;

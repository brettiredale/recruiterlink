-- Clean public directory schema. Public tables hold only what the site may
-- show; anything sensitive lives in schema "private", which the API does not
-- expose. Data is loaded from legacy.recruitment_agencies by later migrations.

create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Private schema: never exposed through the API.
-- ---------------------------------------------------------------------------
create schema if not exists private;
comment on schema private is
  'Server-only data and helpers (unverified emails, billing ids, legacy mapping tables). Not exposed through the API; no public role can read it.';
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;
alter default privileges in schema private revoke all on tables from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

-- Lowercase ASCII slug with hyphens. Accents are folded, Cyrillic is
-- transliterated, possessive apostrophes are dropped ("All's" -> "alls").
-- Returns null when nothing usable is left.
create function private.slugify(input text)
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(
    trim(both '-' from
      regexp_replace(
        lower(extensions.unaccent(
          translate(
            replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
              regexp_replace(lower(input), '[''’]s\M', 's', 'g'),
              'щ', 'shch'), 'ж', 'zh'), 'х', 'kh'), 'ц', 'ts'), 'ч', 'ch'),
              'ш', 'sh'), 'ю', 'yu'), 'я', 'ya'), 'ъ', ''), 'ь', ''),
            'абвгдеёзийклмнопрстуфыэ',
            'abvgdeeziyklmnoprstufye')
        )),
        '[^a-z0-9]+', '-', 'g')
    ),
    '')
$$;
revoke all on function private.slugify(text) from public, anon, authenticated;
grant execute on function private.slugify(text) to service_role;

-- ---------------------------------------------------------------------------
-- Public tables
-- ---------------------------------------------------------------------------
create table public.countries (
  id smallint generated always as identity primary key,
  name text not null unique,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  iso2 text unique check (iso2 ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now()
);
comment on table public.countries is 'Countries that have agencies. iso2 is the ISO 3166-1 alpha-2 code.';

create table public.cities (
  id integer generated always as identity primary key,
  country_id smallint not null references public.countries (id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  photo_path text,
  created_at timestamptz not null default now(),
  unique (country_id, slug),
  unique (id, country_id)
);
comment on table public.cities is 'One row per real city. slug is unique within its country. photo_path is an optional city photo file.';

create table public.specialisms (
  id smallint generated always as identity primary key,
  name text not null unique,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sort_order smallint not null
);
comment on table public.specialisms is 'Fixed list of recruitment sectors. Legacy labels are mapped onto it in private.legacy_specialism_map.';

create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  legacy_slug text unique,
  website text check (website ~ '^https://[^/\s]+$'),
  domain text,
  description text,
  introduction text,
  country_id smallint not null references public.countries (id) on delete restrict,
  city_id integer,
  logo_path text,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  is_claimed boolean not null default false,
  status text not null default 'published' check (status in ('published', 'hidden')),
  duplicate_of uuid references public.agencies (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Derived columns, kept by the database.
  is_premium boolean generated always as (plan = 'premium') stored,
  sort_name text generated always as (lower(regexp_replace(name, '^[^[:alnum:]]+', ''))) stored,
  quality_score smallint generated always as ((
      case when plan = 'premium' then 8 else 0 end
    + case when is_claimed then 4 else 0 end
    + case when logo_path is not null then 2 else 0 end
    + case when description is not null then 1 else 0 end
  )::smallint) stored,
  search_vector tsvector not null default ''::tsvector,
  -- A city must belong to the agency's country.
  foreign key (city_id, country_id) references public.cities (id, country_id) on delete restrict,
  check (duplicate_of is null or status = 'hidden'),
  check (duplicate_of is distinct from id)
);
comment on table public.agencies is 'Recruitment agencies. Only rows with status = published are readable through the API.';
comment on column public.agencies.legacy_slug is 'Slug on the old site (always started with "recruitment-"). Kept for redirects.';
comment on column public.agencies.website is 'Normalised to https://<host>.';
comment on column public.agencies.domain is 'Website host without "www.".';
comment on column public.agencies.logo_path is 'File name in the public storage bucket agency-logos; null means show an initials placeholder.';
comment on column public.agencies.duplicate_of is 'For hidden duplicates: the published agency that replaces this one.';
comment on column public.agencies.is_premium is 'True for the premium plan. Order by is_premium desc, sort_name to list premium first.';
comment on column public.agencies.sort_name is 'Lowercase name without leading punctuation, for alphabetical ordering.';
comment on column public.agencies.quality_score is 'Premium 8 + claimed 4 + has logo 2 + has description 1. Used to pick featured agencies.';
comment on column public.agencies.search_vector is 'Full-text index over name, city, country, specialisms, introduction and description. Maintained by triggers.';

create table public.agency_specialisms (
  agency_id uuid not null references public.agencies (id) on delete cascade,
  specialism_id smallint not null references public.specialisms (id) on delete cascade,
  primary key (agency_id, specialism_id)
);

create table public.slug_redirects (
  old_slug text primary key,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  created_at timestamptz not null default now()
);
comment on table public.slug_redirects is 'Old-site slugs (/agencies/<old_slug>) and the agency each should now redirect to. For hidden duplicates this is the kept agency.';

-- ---------------------------------------------------------------------------
-- Private per-agency data (never shown, never mailed without verification)
-- ---------------------------------------------------------------------------
create table private.agency_private (
  agency_id uuid primary key references public.agencies (id) on delete cascade,
  email_unverified text,
  legacy_user_id uuid,
  legacy_subscription_plan text,
  legacy_subscription_status text,
  stripe_customer_id text,
  stripe_subscription_id text,
  claimed_at timestamptz,
  claimed_by_name text,
  last_signed_in_at timestamptz
);
comment on table private.agency_private is
  'Sensitive per-agency data carried over from the old site. email_unverified is mostly guessed info@ addresses: never show or mail them. legacy_user_id points at old-site logins that no longer exist.';
alter table private.agency_private enable row level security;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index agencies_city_listing_idx on public.agencies (city_id, is_premium desc, sort_name)
  where status = 'published';
create index agencies_country_listing_idx on public.agencies (country_id, is_premium desc, sort_name)
  where status = 'published';
create index agencies_country_featured_idx on public.agencies (country_id, quality_score desc, id)
  where status = 'published';
create index agencies_search_idx on public.agencies using gin (search_vector);
create index agencies_duplicate_of_idx on public.agencies (duplicate_of) where duplicate_of is not null;
create index agency_specialisms_specialism_idx on public.agency_specialisms (specialism_id, agency_id);
create index slug_redirects_agency_idx on public.slug_redirects (agency_id);

-- ---------------------------------------------------------------------------
-- Access: the public may read published data and write nothing.
-- ---------------------------------------------------------------------------
alter table public.countries enable row level security;
alter table public.cities enable row level security;
alter table public.specialisms enable row level security;
alter table public.agencies enable row level security;
alter table public.agency_specialisms enable row level security;
alter table public.slug_redirects enable row level security;

revoke all on public.countries, public.cities, public.specialisms, public.agencies,
  public.agency_specialisms, public.slug_redirects from public, anon, authenticated;
grant select on public.countries, public.cities, public.specialisms, public.agencies,
  public.agency_specialisms, public.slug_redirects to anon, authenticated;

create policy "Anyone can read countries" on public.countries
  for select to anon, authenticated using (true);
create policy "Anyone can read cities" on public.cities
  for select to anon, authenticated using (true);
create policy "Anyone can read specialisms" on public.specialisms
  for select to anon, authenticated using (true);
create policy "Anyone can read published agencies" on public.agencies
  for select to anon, authenticated using (status = 'published');
create policy "Anyone can read specialisms of published agencies" on public.agency_specialisms
  for select to anon, authenticated using (
    exists (
      select 1 from public.agencies a
      where a.id = agency_specialisms.agency_id and a.status = 'published'
    )
  );
create policy "Anyone can read slug redirects" on public.slug_redirects
  for select to anon, authenticated using (true);

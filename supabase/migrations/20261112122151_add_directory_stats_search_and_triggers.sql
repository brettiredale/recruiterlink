-- Read helpers for pages (counts, search) and the triggers that keep
-- agencies.search_vector and agencies.updated_at correct from now on.

-- One old record had a website with no real domain ("http://www.facefit.").
update public.agencies set website = null, domain = null where domain !~ '\.[a-z]{2,}$';

-- ---------------------------------------------------------------------------
-- Count views. All run with the caller's rights (security_invoker), so they
-- only ever count published agencies for the public. Counts are live: nothing
-- is stored, so a city becomes indexable by itself when it reaches 3 agencies.
-- ---------------------------------------------------------------------------
create view public.country_stats with (security_invoker = true) as
select
  co.id as country_id,
  co.name,
  co.slug,
  co.iso2,
  (select count(*) from public.agencies a
    where a.country_id = co.id and a.status = 'published')::integer as agency_count,
  (select count(*) from public.cities ci
    where ci.country_id = co.id
      and exists (select 1 from public.agencies a where a.city_id = ci.id and a.status = 'published')
  )::integer as city_count
from public.countries co;
comment on view public.country_stats is 'Each country with its number of published agencies and of cities that have at least one.';

create view public.city_stats with (security_invoker = true) as
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
  s.agency_count >= 3 as is_indexable
from public.cities ci
join public.countries co on co.id = ci.country_id
cross join lateral (
  select count(*)::integer as agency_count
  from public.agencies a
  where a.city_id = ci.id and a.status = 'published'
) s;
comment on view public.city_stats is 'Each city with its live count of published agencies. is_indexable is true at 3 or more: only those cities are submitted to search engines.';

create view public.specialism_stats with (security_invoker = true) as
select
  s.id as specialism_id,
  s.name,
  s.slug,
  s.sort_order,
  (select count(*) from public.agency_specialisms x
    join public.agencies a on a.id = x.agency_id
    where x.specialism_id = s.id and a.status = 'published')::integer as agency_count
from public.specialisms s;
comment on view public.specialism_stats is 'Each specialism with its number of published agencies worldwide.';

create view public.city_specialism_stats with (security_invoker = true) as
select
  a.city_id,
  s.id as specialism_id,
  s.name,
  s.slug,
  s.sort_order,
  count(*)::integer as agency_count
from public.agencies a
join public.agency_specialisms x on x.agency_id = a.id
join public.specialisms s on s.id = x.specialism_id
where a.status = 'published' and a.city_id is not null
group by a.city_id, s.id;
comment on view public.city_specialism_stats is 'Published agencies per city and specialism (only combinations that have at least one). Filter by city_id.';

create view public.country_specialism_stats with (security_invoker = true) as
select
  a.country_id,
  s.id as specialism_id,
  s.name,
  s.slug,
  s.sort_order,
  count(*)::integer as agency_count
from public.agencies a
join public.agency_specialisms x on x.agency_id = a.id
join public.specialisms s on s.id = x.specialism_id
where a.status = 'published'
group by a.country_id, s.id;
comment on view public.country_specialism_stats is 'Published agencies per country and specialism (only combinations that have at least one). Filter by country_id.';

create view public.directory_totals with (security_invoker = true) as
select
  (select count(*) from public.agencies a where a.status = 'published')::integer as agency_count,
  (select count(*) from public.countries co
    where exists (select 1 from public.agencies a where a.country_id = co.id and a.status = 'published')
  )::integer as country_count,
  (select count(*) from public.cities ci
    where exists (select 1 from public.agencies a where a.city_id = ci.id and a.status = 'published')
  )::integer as city_count,
  (select count(*) from public.specialisms)::integer as specialism_count;
comment on view public.directory_totals is 'One row of site-wide totals (published agencies; countries and cities that have at least one).';

revoke all on public.country_stats, public.city_stats, public.specialism_stats,
  public.city_specialism_stats, public.country_specialism_stats, public.directory_totals
  from public, anon, authenticated;
grant select on public.country_stats, public.city_stats, public.specialism_stats,
  public.city_specialism_stats, public.country_specialism_stats, public.directory_totals
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Free-text search (Postgres full-text). Premium first, then best match.
-- ---------------------------------------------------------------------------
create function public.search_agencies(
  search_query text,
  country_slug text default null,
  city_slug text default null,
  result_limit integer default 20,
  result_offset integer default 0
)
returns setof public.agencies
language sql
stable
security invoker
set search_path = ''
as $$
  select a.*
  from public.agencies a,
       websearch_to_tsquery('english', extensions.unaccent(coalesce(search_query, ''))) q
  where a.status = 'published'
    and a.search_vector @@ q
    and (search_agencies.country_slug is null
         or a.country_id = (select co.id from public.countries co where co.slug = search_agencies.country_slug))
    and (search_agencies.city_slug is null
         or a.city_id in (
              select ci.id
              from public.cities ci
              join public.countries co on co.id = ci.country_id
              where ci.slug = search_agencies.city_slug
                and (search_agencies.country_slug is null or co.slug = search_agencies.country_slug)))
  order by a.is_premium desc, ts_rank(a.search_vector, q) desc, a.sort_name, a.id
  limit least(greatest(coalesce(result_limit, 20), 1), 100)
  offset greatest(coalesce(result_offset, 0), 0)
$$;
comment on function public.search_agencies(text, text, text, integer, integer) is
  'Full-text search over published agencies, optionally within a country and city (by slug). Premium first, then relevance. At most 100 rows per call.';
revoke all on function public.search_agencies(text, text, text, integer, integer) from public;
grant execute on function public.search_agencies(text, text, text, integer, integer) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create function private.agencies_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create function private.agencies_refresh_search_vector()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.search_vector := private.build_agency_search_vector(new);
  return new;
end
$$;

create function private.agency_specialisms_refresh_search_vector()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.agencies a
  set search_vector = private.build_agency_search_vector(a)
  where a.id in (select distinct c.agency_id from changed c);
  return null;
end
$$;

revoke all on function private.agencies_touch_updated_at() from public, anon, authenticated;
revoke all on function private.agencies_refresh_search_vector() from public, anon, authenticated;
revoke all on function private.agency_specialisms_refresh_search_vector() from public, anon, authenticated;

create trigger agencies_touch_updated_at
  before update on public.agencies
  for each row execute function private.agencies_touch_updated_at();

create trigger agencies_refresh_search_vector
  before insert or update of name, description, introduction, city_id, country_id on public.agencies
  for each row execute function private.agencies_refresh_search_vector();

create trigger agency_specialisms_search_after_insert
  after insert on public.agency_specialisms
  referencing new table as changed
  for each statement execute function private.agency_specialisms_refresh_search_vector();

create trigger agency_specialisms_search_after_update
  after update on public.agency_specialisms
  referencing new table as changed
  for each statement execute function private.agency_specialisms_refresh_search_vector();

create trigger agency_specialisms_search_after_delete
  after delete on public.agency_specialisms
  referencing old table as changed
  for each statement execute function private.agency_specialisms_refresh_search_vector();

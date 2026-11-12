-- Fills the clean public tables from legacy.recruitment_agencies (read only).
-- Reproducible: every correction comes from the rule tables in schema private.

-- The "drop the sentence" fallback becomes the last introduction rule, so the
-- whole clean-up is one ordered rule list. Any sentence that still ties a
-- founding-type claim to 2020 after the earlier rules is removed whole.
insert into private.text_cleaning_rules (kind, step, pattern, replacement) values
  ('introduction', 33, $re$(^|[.!?]\s+)(?=[^.!?]*(?:[Ee]stablish|[Ff]ound|[Ll]aunch|[Ff]ormed|[Ii]ncept|[Oo]rigin|[Oo]pen|[Bb]egan|[Cc]ommenc|[Ss]tarted|[Ii]nitiat|Since|Seit|С 2020))[^.!?]*2020[^.!?]*(?:[.!?]+|$)\s*$re$, $re$\1$re$);

-- Single-text version of the same rules, for text that arrives later.
create or replace function private.strip_founding_2020(input text, kind text)
returns text
language plpgsql
stable
set search_path = ''
as $fn$
declare
  result text := input;
  rule record;
begin
  if input is null or position('2020' in input) = 0 then
    return input;
  end if;
  for rule in
    select r.pattern, r.replacement
    from private.text_cleaning_rules r
    where r.kind = strip_founding_2020.kind
    order by r.step
  loop
    result := regexp_replace(result, rule.pattern, rule.replacement, 'g');
  end loop;
  return result;
end
$fn$;

-- Full-text search document for one agency: name (weight A), city, country
-- and specialisms (B), introduction (C), description (D).
create function private.build_agency_search_vector(agency public.agencies)
returns tsvector
language sql
stable
set search_path = ''
as $$
  select
    setweight(to_tsvector('english', extensions.unaccent(agency.name)), 'A')
    || setweight(to_tsvector('english', extensions.unaccent(
         coalesce((select ci.name from public.cities ci where ci.id = agency.city_id), '')
         || ' ' || coalesce((select co.name from public.countries co where co.id = agency.country_id), '')
         || ' ' || coalesce((select string_agg(s.name, ' ')
                             from public.agency_specialisms x
                             join public.specialisms s on s.id = x.specialism_id
                             where x.agency_id = agency.id), '')
       )), 'B')
    || setweight(to_tsvector('english', extensions.unaccent(coalesce(agency.introduction, ''))), 'C')
    || setweight(to_tsvector('english', extensions.unaccent(left(coalesce(agency.description, ''), 20000))), 'D')
$$;
revoke all on function private.build_agency_search_vector(public.agencies) from public, anon, authenticated;
grant execute on function private.build_agency_search_vector(public.agencies) to service_role;

-- ---------------------------------------------------------------------------
-- 1. Staging copy with corrected country, city, name and website host
-- ---------------------------------------------------------------------------
create temp table stage as
select
  l.id,
  regexp_replace(btrim(l.name), '\s+', ' ', 'g') as name,
  l.slug as legacy_slug,
  coalesce(o.country, l.country) as country_name,
  coalesce(cm.city, loc.city_raw) as city_name,
  w.host,
  l.description,
  l.introduction,
  case when l.subscription_plan in ('premium', 'ultra') then 'premium' else 'free' end as plan,
  (l.claimed_at is not null or l.user_id is not null) as is_claimed,
  coalesce(cardinality(l.specializations), 0) as label_count,
  l.created_at,
  l.updated_at
from legacy.recruitment_agencies l
left join private.legacy_agency_overrides o on o.agency_id = l.id
cross join lateral (
  select nullif(regexp_replace(btrim(case when o.agency_id is not null then o.city else l.city end), '\s+', ' ', 'g'), '') as city_raw
) loc
left join private.legacy_city_map cm
  on cm.country = coalesce(o.country, l.country) and cm.legacy_city = loc.city_raw
cross join lateral (
  select rtrim(split_part(regexp_replace(lower(btrim(l.website)), '^https?://', ''), '/', 1), '.') as host
) w;

-- ---------------------------------------------------------------------------
-- 2. Remove the false 2020 founding claims, one rule at a time
-- ---------------------------------------------------------------------------
do $$
declare
  rule record;
begin
  create temp table stage_text as
    select id, introduction, description from stage
    where introduction like '%2020%' or description like '%2020%';

  for rule in
    select kind, pattern, replacement from private.text_cleaning_rules order by kind, step
  loop
    if rule.kind = 'introduction' then
      update stage_text set introduction = regexp_replace(introduction, rule.pattern, rule.replacement, 'g')
      where introduction ~ rule.pattern;
    else
      update stage_text set description = regexp_replace(description, rule.pattern, rule.replacement, 'g')
      where description ~ rule.pattern;
    end if;
  end loop;

  update stage s
  set introduction = t.introduction, description = t.description
  from stage_text t
  where t.id = s.id;
end
$$;

update stage
set description = nullif(btrim(description), ''),
    introduction = case when length(btrim(introduction)) >= 40 then btrim(introduction) end;

-- ---------------------------------------------------------------------------
-- 3. Safety checks before anything is written
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from stage s where not exists (select 1 from public.countries c where c.name = s.country_name)) then
    raise exception 'A legacy country has no row in public.countries';
  end if;
  if exists (select 1 from stage where city_name is not null and private.slugify(city_name) is null) then
    raise exception 'A city name cannot be turned into a slug';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 4. Cities: one row per country + slug, named by the most common spelling
-- ---------------------------------------------------------------------------
insert into public.cities (country_id, name, slug)
select distinct on (c.id, private.slugify(s.city_name))
  c.id, s.city_name, private.slugify(s.city_name)
from (
  select country_name, city_name, count(*) as uses
  from stage
  where city_name is not null
  group by country_name, city_name
) s
join public.countries c on c.name = s.country_name
order by c.id, private.slugify(s.city_name), s.uses desc, s.city_name;

-- ---------------------------------------------------------------------------
-- 5. Agencies. Duplicates (same normalised name, country and city) keep one
--    published row: claimed or paid first, then the fullest record. The rest
--    are hidden and point at the kept row.
-- ---------------------------------------------------------------------------
with base as (
  select
    s.*,
    c.id as country_id,
    ci.id as city_id,
    ci.slug as city_slug,
    coalesce(private.slugify(s.name), lower(s.name)) as norm_name,
    trim(both '-' from left(coalesce(private.slugify(s.name), 'agency'), 80)) as name_slug,
    lg.name as logo_path
  from stage s
  join public.countries c on c.name = s.country_name
  left join public.cities ci on ci.country_id = c.id and ci.slug = private.slugify(s.city_name)
  left join storage.objects lg on lg.bucket_id = 'agency-logos' and split_part(lg.name, '.', 1) = s.id::text
),
ranked as (
  select
    b.*,
    row_number() over w as dup_rank,
    first_value(b.id) over w as keep_id,
    case
      when b.city_slug is null or b.name_slug ~ ('(^|-)' || b.city_slug || '$') then b.name_slug
      else b.name_slug || '-' || b.city_slug
    end as base_slug
  from base b
  window w as (
    partition by b.norm_name, b.country_id, b.city_id
    order by (b.is_claimed or b.plan = 'premium') desc,
             (b.logo_path is not null) desc,
             length(coalesce(b.description, '')) desc,
             (b.introduction is not null) desc,
             b.label_count desc,
             length(b.legacy_slug),
             b.id
  )
),
numbered as (
  select r.*, row_number() over (partition by r.base_slug order by r.dup_rank, r.id) as slug_n
  from ranked r
)
insert into public.agencies
  (id, name, slug, legacy_slug, website, domain, description, introduction, country_id, city_id,
   logo_path, plan, is_claimed, status, duplicate_of, created_at, updated_at)
select
  n.id,
  n.name,
  case when n.slug_n = 1 then n.base_slug else n.base_slug || '-' || n.slug_n end,
  n.legacy_slug,
  case when v.valid then 'https://' || n.host end,
  case when v.valid then regexp_replace(n.host, '^www\.', '') end,
  n.description,
  n.introduction,
  n.country_id,
  n.city_id,
  n.logo_path,
  n.plan,
  n.is_claimed,
  case when n.dup_rank = 1 then 'published' else 'hidden' end,
  case when n.dup_rank > 1 then n.keep_id end,
  n.created_at,
  n.updated_at
from numbered n
cross join lateral (
  select coalesce(n.host ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$', false) as valid
) v;

-- ---------------------------------------------------------------------------
-- 6. Specialisms, private data, redirects
-- ---------------------------------------------------------------------------
insert into public.agency_specialisms (agency_id, specialism_id)
select distinct l.id, m.specialism_id
from legacy.recruitment_agencies l
cross join lateral unnest(coalesce(l.specializations, '{}') || coalesce(l.industry_focus, '{}')) as label
join private.legacy_specialism_map m on m.legacy_label = btrim(label)
where m.specialism_id is not null;

insert into private.agency_private
  (agency_id, email_unverified, legacy_user_id, legacy_subscription_plan, legacy_subscription_status,
   stripe_customer_id, stripe_subscription_id, claimed_at, claimed_by_name, last_signed_in_at)
select
  l.id, nullif(btrim(l.email), ''), l.user_id, l.subscription_plan, l.subscription_status,
  l.stripe_customer_id, l.stripe_subscription_id, l.claimed_at, l.claimed_by_name, l.last_signed_in_at
from legacy.recruitment_agencies l;

insert into public.slug_redirects (old_slug, agency_id)
select a.legacy_slug, coalesce(a.duplicate_of, a.id)
from public.agencies a
where a.legacy_slug is not null;

-- ---------------------------------------------------------------------------
-- 7. Search documents
-- ---------------------------------------------------------------------------
update public.agencies a set search_vector = private.build_agency_search_vector(a);

drop table stage_text;
drop table stage;

analyze public.countries, public.cities, public.specialisms, public.agencies,
  public.agency_specialisms, public.slug_redirects, private.agency_private;

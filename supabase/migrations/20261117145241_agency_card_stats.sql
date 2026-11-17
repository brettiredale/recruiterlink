-- Views and clicks of agency cards, per agency, per day and per place.
--
-- A "view" is an agency card that was at least half on screen in a
-- visitor's browser; a "click" is a press on that card. Both are counted
-- once per card per page visit by the browser, sent to /api/card-events,
-- and written here with the server's secret key only.
--
-- Places ("source"): search (the /search page), city (city and city +
-- specialism pages), country (country pages), home (home page), related
-- (the "similar agencies" list on an agency's own page).

create table private.agency_card_stats (
  agency_id uuid not null references public.agencies (id) on delete cascade,
  day date not null,
  source text not null check (source in ('search', 'city', 'country', 'home', 'related')),
  views integer not null default 0 check (views >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  primary key (agency_id, day, source)
);

comment on table private.agency_card_stats is
  'Agency card views (at least half on screen) and clicks, per agency, UTC day and place. Written only by public.record_card_events (secret key).';

create index agency_card_stats_day_idx on private.agency_card_stats (day);

alter table private.agency_card_stats enable row level security;

-- events: [{"agency": "<uuid>", "source": "search", "kind": "view"|"click"}, ...]
-- At most 200 events per call. Unknown agencies, places and kinds are skipped.
create function public.record_card_events(events jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  written integer;
begin
  if jsonb_typeof(events) <> 'array' or jsonb_array_length(events) > 200 then
    raise exception 'events must be an array of at most 200 items' using errcode = '22023';
  end if;

  with raw as (
    select e->>'agency' as agency, e->>'source' as source, e->>'kind' as kind
    from jsonb_array_elements(events) e
    where jsonb_typeof(e) = 'object'
  ),
  valid as (
    select a.id as agency_id, r.source, r.kind
    from raw r
    join public.agencies a
      on r.agency ~ '^[0-9a-fA-F-]{36}$' and a.id = r.agency::uuid and a.status = 'published'
    where r.source in ('search', 'city', 'country', 'home', 'related')
      and r.kind in ('view', 'click')
  ),
  summed as (
    select agency_id, source,
           count(*) filter (where kind = 'view')::integer as views,
           count(*) filter (where kind = 'click')::integer as clicks
    from valid
    group by agency_id, source
  )
  insert into private.agency_card_stats as s (agency_id, day, source, views, clicks)
  select agency_id, (now() at time zone 'utc')::date, source, views, clicks
  from summed
  on conflict (agency_id, day, source) do update
    set views = s.views + excluded.views,
        clicks = s.clicks + excluded.clicks;

  get diagnostics written = row_count;
  return written;
end
$$;

-- Admin list: every agency (any status) with its views and clicks.
--   search_text: part of the name, website domain or slug (blank = all)
--   since_day:   first UTC day counted (null = all time)
--   place:       one source, or null for all places
--   sort_by:     'views' | 'clicks' | 'ctr' | 'name'
create function public.admin_agency_card_stats(
  search_text text default null,
  since_day date default null,
  place text default null,
  sort_by text default 'views',
  page_size integer default 50,
  page_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  term text := nullif(btrim(coalesce(search_text, '')), '');
  size integer := least(greatest(coalesce(page_size, 50), 1), 200);
  skip integer := greatest(coalesce(page_offset, 0), 0);
  result jsonb;
begin
  perform private.require_site_admin();

  if place is not null and place not in ('search', 'city', 'country', 'home', 'related') then
    raise exception 'Unknown place' using errcode = '22023';
  end if;

  with totals as (
    select s.agency_id, sum(s.views)::bigint as views, sum(s.clicks)::bigint as clicks
    from private.agency_card_stats s
    where (since_day is null or s.day >= since_day)
      and (place is null or s.source = place)
    group by s.agency_id
  ),
  matched as (
    select a.id, a.name, a.slug, a.domain, a.plan, a.status, a.is_claimed,
           c.name as city, co.name as country,
           coalesce(t.views, 0) as views, coalesce(t.clicks, 0) as clicks
    from public.agencies a
    join public.countries co on co.id = a.country_id
    left join public.cities c on c.id = a.city_id
    left join totals t on t.agency_id = a.id
    where term is null
       or a.name ilike '%' || term || '%'
       or a.domain ilike '%' || term || '%'
       or a.slug ilike '%' || replace(lower(term), ' ', '-') || '%'
  ),
  numbered as (
    select r.*,
      row_number() over (order by
        case when sort_by = 'name' then lower(r.name) end asc,
        case when sort_by = 'clicks' then r.clicks end desc,
        case when sort_by = 'ctr' then case when r.views > 0 then r.clicks::numeric / r.views else 0 end end desc,
        case when sort_by is null or sort_by not in ('name', 'clicks', 'ctr') then r.views end desc,
        r.views desc, r.clicks desc, lower(r.name), r.id
      ) as rn
    from matched r
  ),
  ordered as (
    select * from numbered where rn > skip and rn <= skip + size
  )
  select jsonb_build_object(
    'total', (select count(*) from matched),
    'sum_views', (select coalesce(sum(views), 0) from matched),
    'sum_clicks', (select coalesce(sum(clicks), 0) from matched),
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
      'id', o.id, 'name', o.name, 'slug', o.slug, 'domain', o.domain, 'plan', o.plan,
      'status', o.status, 'is_claimed', o.is_claimed, 'city', o.city, 'country', o.country,
      'views', o.views, 'clicks', o.clicks
    ) order by o.rn) from ordered o), '[]'::jsonb)
  ) into result;

  return result;
end
$$;

revoke all on function public.record_card_events(jsonb) from public, anon, authenticated;
grant execute on function public.record_card_events(jsonb) to service_role;

revoke all on function public.admin_agency_card_stats(text, date, text, text, integer, integer) from public, anon;
grant execute on function public.admin_agency_card_stats(text, date, text, text, integer, integer) to authenticated;

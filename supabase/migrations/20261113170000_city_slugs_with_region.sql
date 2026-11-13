-- City addresses carry the state, province or territory in the US, Canada and
-- Australia: /united-states/miami-fl, /canada/london-on, /australia/sydney-nsw.
-- Every old address is kept as an alias, and the app redirects it (308) to
-- the new one.
--
-- Apply this with the app code that follows aliases (the city pages and
-- /recruiters-in). The app before that code would 404 the old addresses.

-- 1. Keep every old address as an alias of its city. The old site used
--    "washington" for Washington, DC, so that address goes to DC, not to
--    Washington, NC.
insert into public.city_aliases (country_id, alias_slug, city_id)
select
  c.country_id,
  c.slug,
  case
    when co.iso2 = 'US' and c.slug = 'washington' then coalesce(dc.id, c.id)
    else c.id
  end
from public.cities c
join public.countries co on co.id = c.country_id
join public.regions r on r.id = c.region_id
left join lateral (
  select d.id from public.cities d
  join public.regions dr on dr.id = d.region_id
  where d.country_id = c.country_id and dr.code = 'DC'
    and private.place_key(d.name) = 'washington'
  limit 1
) dc on true
where co.iso2 in ('US', 'CA', 'AU')
  and c.slug <> private.slugify(c.name) || '-' || lower(r.code)
on conflict (country_id, alias_slug) do nothing;

-- 2. The new addresses: name + state code.
update public.cities c
set slug = private.slugify(c.name) || '-' || lower(r.code)
from public.regions r, public.countries co
where r.id = c.region_id
  and co.id = c.country_id
  and co.iso2 in ('US', 'CA', 'AU')
  and c.slug <> private.slugify(c.name) || '-' || lower(r.code);

-- 3. An alias that is now a city's own address is not needed.
delete from public.city_aliases a
using public.cities c
where c.id = a.city_id and c.slug = a.alias_slug;

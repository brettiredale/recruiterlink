-- Covers the (city_id, country_id) foreign key on agencies for every row,
-- including hidden ones (the listing indexes only cover published rows).
create index agencies_city_country_idx on public.agencies (city_id, country_id);

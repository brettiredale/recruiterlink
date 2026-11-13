-- match_city calls helpers in the private schema (split_place, find_region,
-- place_key), which visitors (anon) cannot use, so search failed with
-- "permission denied for schema private". It reads only public directory
-- data (cities, regions, aliases, published agency counts), so it runs as
-- its owner.
alter function public.match_city(smallint, text, text) security definer;

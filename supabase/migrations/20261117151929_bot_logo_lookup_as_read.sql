-- The logo lookup after a listing is added counts as a read, not a write:
-- the listing itself was the counted write, and a batch of 25 new listings
-- plus 25 logo lookups would otherwise pass the 30-writes-a-minute limit.
create or replace function public.bot_agency_for_logo(api_key text, agency_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  k private.api_keys := private.use_api_key(api_key, false);
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

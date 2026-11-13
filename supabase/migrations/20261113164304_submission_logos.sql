-- New listings get a logo found on the agency's own website (Firecrawl),
-- or from logo.dev when the website has none that shows on white. The server
-- stores the file in bucket agency-logos and records its name here; the
-- admin sees it on the review page, and publishing carries it to the agency.

alter table public.listing_submissions
  add column logo_path text
    check (logo_path is null or logo_path ~ '^[0-9a-f-]{36}-[0-9]{10,16}\.(png|jpg|webp)$'),
  add column logo_source text check (logo_source in ('website', 'logo.dev')),
  -- Set when a search for a logo finished, found or not. Null while it runs.
  add column logo_checked_at timestamptz;

comment on column public.listing_submissions.logo_path is
  'Logo file in bucket agency-logos, found automatically when the listing was sent in. Copied to agencies.logo_path on approval.';

-- Records the outcome of a logo search. Server (secret key) only; pending
-- submissions only. Returns the previous file name so the caller can remove it.
create function public.set_submission_logo(target_submission uuid, new_logo_path text, new_logo_source text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_path text;
begin
  if new_logo_path is not null
     and new_logo_path !~ '^[0-9a-f-]{36}-[0-9]{10,16}\.(png|jpg|webp)$' then
    raise exception 'Unexpected logo file name' using errcode = 'P0001';
  end if;
  select s.logo_path into old_path from public.listing_submissions s
  where s.id = target_submission and s.status = 'pending'
  for update;
  if not found then
    raise exception 'Submission not found' using errcode = 'P0001', hint = 'not_found';
  end if;
  update public.listing_submissions
  set logo_path = coalesce(new_logo_path, logo_path),
      logo_source = case when new_logo_path is null then logo_source else new_logo_source end,
      logo_checked_at = now()
  where id = target_submission;
  return case when new_logo_path is null then null else old_path end;
end
$$;

revoke all on function public.set_submission_logo(uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_submission_logo(uuid, text, text) to service_role;

-- Review list: as before, plus the logo.
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
      'logo_path', s.logo_path, 'logo_source', s.logo_source,
      'logo_checked_at', s.logo_checked_at,
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

-- Publishing copies the submission's logo onto the new agency.
create function private.carry_submission_logo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' and old.status = 'pending'
     and new.agency_id is not null and new.logo_path is not null then
    update public.agencies a set logo_path = new.logo_path
    where a.id = new.agency_id and a.logo_path is null;
  end if;
  return new;
end
$$;

revoke all on function private.carry_submission_logo() from public, anon, authenticated;

create trigger listing_submissions_carry_logo
  after update of status on public.listing_submissions
  for each row execute function private.carry_submission_logo();

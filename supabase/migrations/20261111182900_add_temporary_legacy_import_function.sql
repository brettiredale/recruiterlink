-- TEMPORARY. Lets the one-off loader push the exported agencies into the
-- private archive in batches without anyone having to handle the database's
-- master key. Each call must present a one-time token whose hash is stored
-- in legacy.import_tokens and which expires. Removed again by the migration
-- drop_temporary_legacy_import_function once the load is verified.

create table legacy.import_tokens (
  token_hash bytea primary key,
  expires_at timestamptz not null
);
alter table legacy.import_tokens enable row level security;
revoke all on legacy.import_tokens from anon, authenticated;

create function public.import_legacy_agencies(p_token text, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_token is null or not exists (
    select 1
    from legacy.import_tokens t
    where t.token_hash = sha256(convert_to(p_token, 'UTF8'))
      and t.expires_at > now()
  ) then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  insert into legacy.recruitment_agencies (
    id, name, description, website, email, phone, country, city, address,
    specializations, logo_url, linkedin_url, twitter_url, facebook_url,
    founded_year, employee_count, created_at, updated_at, slug, offices, team,
    videos, user_id, subscription_plan, subscription_status,
    stripe_customer_id, stripe_subscription_id, claimed_at, claimed_by_name,
    last_signed_in_at, introduction, jobseeker_videos, has_videos, jobs,
    job_feed_url, brand_colors, brand_fonts, enrichment_status,
    scraped_content, scraped_at, enrichment_error, testimonials, awards,
    certifications, service_types, industry_focus
  )
  select
    r.id, r.name, r.description, r.website, r.email, r.phone, r.country,
    r.city, r.address, r.specializations, r.logo_url, r.linkedin_url,
    r.twitter_url, r.facebook_url, r.founded_year, r.employee_count,
    r.created_at, r.updated_at, r.slug, r.offices, r.team, r.videos,
    r.user_id, r.subscription_plan, r.subscription_status,
    r.stripe_customer_id, r.stripe_subscription_id, r.claimed_at,
    r.claimed_by_name, r.last_signed_in_at, r.introduction,
    r.jobseeker_videos, r.has_videos, r.jobs, r.job_feed_url, r.brand_colors,
    r.brand_fonts, r.enrichment_status, r.scraped_content, r.scraped_at,
    r.enrichment_error, r.testimonials, r.awards, r.certifications,
    r.service_types, r.industry_focus
  from jsonb_populate_recordset(null::legacy.recruitment_agencies, p_rows) as r
  on conflict (id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.import_legacy_agencies(text, jsonb) from public, authenticated;
grant execute on function public.import_legacy_agencies(text, jsonb) to anon;

-- Private archive of the agency data exported from the old Lovable-built site
-- on 11 Nov 2026. It is an untouched copy, kept so the clean public tables can
-- be built from it by later migrations and so nothing from the old site is lost.
-- The schema is not exposed through the API and no public role can read it.

create schema if not exists legacy;

comment on schema legacy is
  'Untouched copy of data exported from the old RecruiterLink site. Private: never exposed through the API. Source for building the clean public tables.';

revoke all on schema legacy from anon, authenticated;

create table legacy.recruitment_agencies (
  id uuid primary key,
  name text not null,
  description text,
  website text,
  email text,
  phone text,
  country text not null,
  city text,
  address text,
  specializations text[],
  logo_url text,
  linkedin_url text,
  twitter_url text,
  facebook_url text,
  founded_year integer,
  employee_count text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  slug text,
  offices jsonb,
  team jsonb,
  videos jsonb,
  user_id uuid,
  subscription_plan text,
  subscription_status text,
  stripe_customer_id text,
  stripe_subscription_id text,
  claimed_at timestamptz,
  claimed_by_name text,
  last_signed_in_at timestamptz,
  introduction text,
  jobseeker_videos jsonb,
  has_videos boolean not null,
  jobs jsonb,
  job_feed_url text,
  brand_colors jsonb,
  brand_fonts jsonb,
  enrichment_status text,
  scraped_content text,
  scraped_at timestamptz,
  enrichment_error text,
  testimonials jsonb,
  awards text[],
  certifications text[],
  service_types text[],
  industry_focus text[],
  imported_at timestamptz not null default now()
);

comment on table legacy.recruitment_agencies is
  'Old site''s recruitment_agencies table as exported on 11 Nov 2026 (46 fields). The export''s vector embeddings and search index were not carried over; both are to be rebuilt from cleaned content. user_id refers to login accounts that were not part of the export.';

alter table legacy.recruitment_agencies enable row level security;
revoke all on legacy.recruitment_agencies from anon, authenticated;

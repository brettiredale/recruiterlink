-- Requests sent from the site's forms: agencies registering interest in
-- claiming their listing or in Premium (/for-agencies), and messages from
-- the contact page. Logins and payments do not exist yet, so this is where
-- those requests wait for the RecruiterLink team.
--
-- The public can add a row and nothing else: no reading, changing or
-- deleting. Rows hold personal details (name, email), so they must never be
-- exposed through the API.

create table public.listing_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null
    constraint listing_requests_kind_check check (kind in ('claim', 'premium', 'contact')),
  name text not null
    constraint listing_requests_name_check check (char_length(name) between 2 and 120),
  email text not null
    constraint listing_requests_email_check check (
      char_length(email) between 5 and 254
      and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$'
    ),
  agency_name text
    constraint listing_requests_agency_name_check check (char_length(agency_name) between 2 and 160),
  website text
    constraint listing_requests_website_check check (char_length(website) between 4 and 300),
  message text
    constraint listing_requests_message_check check (char_length(message) between 1 and 2000),
  -- The page the form was on, e.g. "/for-agencies".
  source_path text
    constraint listing_requests_source_path_check check (char_length(source_path) <= 200),
  -- Claims and Premium interest must say which agency; a contact message must say something.
  constraint listing_requests_required_check check (
    case when kind = 'contact' then message is not null else agency_name is not null end
  )
);

comment on table public.listing_requests is
  'Requests from the site forms (claim a listing, Premium interest, contact). Insert-only for the public; holds personal details, never readable through the API.';

create index listing_requests_created_at_idx on public.listing_requests (created_at desc);
create index listing_requests_email_created_at_idx on public.listing_requests (lower(email), created_at desc);

-- Abuse protection that holds even if someone posts straight to the API:
-- the server sets id and time itself, one email address can send at most
-- 3 requests an hour, and the whole table accepts at most 200 an hour.
create function private.listing_requests_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.id := gen_random_uuid();
  new.created_at := now();
  new.email := lower(btrim(new.email));

  if (select count(*) from public.listing_requests r
       where lower(r.email) = new.email
         and r.created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Too many requests from this email address. Please try again later.'
      using errcode = 'P0001', hint = 'rate_limited_email';
  end if;

  if (select count(*) from public.listing_requests r
       where r.created_at > now() - interval '1 hour') >= 200 then
    raise exception 'Too many requests right now. Please try again later.'
      using errcode = 'P0001', hint = 'rate_limited_global';
  end if;

  return new;
end
$$;

revoke all on function private.listing_requests_guard() from public, anon, authenticated;

create trigger listing_requests_guard
  before insert on public.listing_requests
  for each row execute function private.listing_requests_guard();

alter table public.listing_requests enable row level security;

revoke all on public.listing_requests from public, anon, authenticated;
grant insert on public.listing_requests to anon, authenticated;

-- Insert only. There is deliberately no select, update or delete policy.
create policy "Anyone can send a listing request" on public.listing_requests
  for insert to anon, authenticated
  with check (true);

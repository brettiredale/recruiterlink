-- Agency text trial (growth plan step 2, owner approved 15 Nov 2026).
-- Each agency's own website is read (Firecrawl) and its introduction and
-- description are written again from that text only (OpenAI). The results
-- land here, in a private staging table, for the owner to review. Nothing
-- here changes what the live site shows: agencies rows are never written.

create table private.agency_text_trial (
  trial text not null,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'failed')),
  -- ready: good enough to publish; thin: too little on the site (noindex
  -- candidate); not_agency: the site is not a recruitment agency;
  -- unusable: parked, broken, blocked or another company's site;
  -- fetch_failed: the site could not be read at all.
  verdict text check (verdict in ('ready', 'thin', 'not_agency', 'unusable', 'fetch_failed')),
  verdict_reason text,
  introduction text,
  description text,
  facts jsonb,
  checks jsonb,
  pages jsonb,
  source_text text,
  model text,
  input_tokens integer,
  output_tokens integer,
  firecrawl_credits integer,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  primary key (trial, agency_id)
);

comment on table private.agency_text_trial is
  'Staging for the agency text rewrite (step 2). Owner reviews before any text reaches public.agencies.';

-- The server (secret key) takes the next queued agencies of a trial.
-- A row left running for more than 10 minutes is taken again.
create function public.agency_text_trial_next(trial_name text, batch_size integer)
returns table (
  agency_id uuid,
  name text,
  website text,
  city text,
  country text,
  country_code text
)
language sql
security definer
set search_path = ''
as $$
  with picked as (
    select t.agency_id
    from private.agency_text_trial t
    where t.trial = trial_name
      and (t.status = 'queued'
        or (t.status = 'running' and t.started_at < now() - interval '10 minutes'))
    order by t.agency_id
    limit least(greatest(batch_size, 1), 20)
    for update skip locked
  ), marked as (
    update private.agency_text_trial t
    set status = 'running', started_at = now()
    from picked
    where t.trial = trial_name and t.agency_id = picked.agency_id
    returning t.agency_id
  )
  select a.id, a.name, a.website, ci.name, co.name, co.iso2
  from marked m
  join public.agencies a on a.id = m.agency_id
  join public.countries co on co.id = a.country_id
  left join public.cities ci on ci.id = a.city_id;
$$;

-- The server (secret key) stores one finished result.
create function public.agency_text_trial_save(trial_name text, target uuid, result jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.agency_text_trial t
  set status = coalesce(result ->> 'status', 'done'),
      verdict = result ->> 'verdict',
      verdict_reason = left(result ->> 'verdict_reason', 1000),
      introduction = left(result ->> 'introduction', 4000),
      description = left(result ->> 'description', 8000),
      facts = result -> 'facts',
      checks = result -> 'checks',
      pages = result -> 'pages',
      source_text = left(result ->> 'source_text', 40000),
      model = result ->> 'model',
      input_tokens = (result ->> 'input_tokens')::integer,
      output_tokens = (result ->> 'output_tokens')::integer,
      firecrawl_credits = (result ->> 'firecrawl_credits')::integer,
      error = left(result ->> 'error', 2000),
      finished_at = now()
  where t.trial = trial_name and t.agency_id = target;
end;
$$;

-- Progress of a trial, for the server's answer.
create function public.agency_text_trial_progress(trial_name text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'status', coalesce((select jsonb_object_agg(s, n) from (
      select status s, count(*) n from private.agency_text_trial
      where trial = trial_name group by status) x), '{}'::jsonb),
    'verdict', coalesce((select jsonb_object_agg(v, n) from (
      select coalesce(verdict, 'none') v, count(*) n from private.agency_text_trial
      where trial = trial_name and status in ('done', 'failed') group by verdict) y), '{}'::jsonb)
  );
$$;

revoke all on function public.agency_text_trial_next(text, integer) from public, anon, authenticated;
revoke all on function public.agency_text_trial_save(text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.agency_text_trial_progress(text) from public, anon, authenticated;
grant execute on function public.agency_text_trial_next(text, integer) to service_role;
grant execute on function public.agency_text_trial_save(text, uuid, jsonb) to service_role;
grant execute on function public.agency_text_trial_progress(text) to service_role;

-- The first trial: 200 published agencies, spread over the main countries,
-- picked in a fixed random order so the sample can be drawn again.
insert into private.agency_text_trial (trial, agency_id)
select 'trial-1', id
from (
  select a.id, co.iso2,
    row_number() over (partition by co.iso2 order by md5(a.id::text || 'trial-1')) as rn
  from public.agencies a
  join public.countries co on co.id = a.country_id
  where a.status = 'published' and a.duplicate_of is null
    and a.website is not null and a.website <> ''
) s
where (s.iso2 = 'GB' and s.rn <= 50)
   or (s.iso2 = 'US' and s.rn <= 50)
   or (s.iso2 in ('NL', 'AU', 'DE', 'CA') and s.rn <= 15)
   or (s.iso2 in ('CH', 'SE') and s.rn <= 8)
   or (s.iso2 in ('ZA', 'IN', 'FR') and s.rn <= 6)
   or (s.iso2 in ('NZ', 'SG', 'IE', 'AE', 'BE', 'DK') and s.rn <= 1);

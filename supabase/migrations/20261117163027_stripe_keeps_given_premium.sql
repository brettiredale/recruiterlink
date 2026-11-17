-- A listing given Premium for free (bot_set_agency_premium, e.g. a Lovelio
-- client) keeps it when a Stripe subscription on the same listing ends.
-- Stripe only ever decides Premium the agency pays for itself.
create or replace function public.set_agency_premium_from_stripe(
  target_agency uuid,
  premium boolean,
  customer_id text,
  subscription_id text,
  billing_interval text,
  event_id text default null,
  event_type text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
  current_subscription text;
  given boolean;
begin
  if event_id is not null then
    insert into private.stripe_events (id, type, agency_id) values (event_id, coalesce(event_type, ''), target_agency)
    on conflict (id) do nothing;
    if not found then return null; end if;
  end if;

  select jsonb_build_object('slug', a.slug, 'country_slug', c.slug, 'city_slug', ci.slug, 'name', a.name)
  into result
  from public.agencies a
  join public.countries c on c.id = a.country_id
  left join public.cities ci on ci.id = a.city_id
  where a.id = target_agency
  for update of a;
  if result is null then return null; end if;

  insert into private.agency_private (agency_id) values (target_agency) on conflict (agency_id) do nothing;
  select p.stripe_subscription_id, p.premium_comped_at is not null into current_subscription, given
  from private.agency_private p where p.agency_id = target_agency;

  -- An ending subscription only turns Premium off if it is the listing's
  -- current one (not an older one the agency replaced).
  if not premium and current_subscription is not null and current_subscription <> subscription_id then
    return result;
  end if;

  update private.agency_private set
    stripe_customer_id = coalesce(customer_id, stripe_customer_id),
    stripe_subscription_id = coalesce(subscription_id, stripe_subscription_id),
    premium_interval = case when premium then coalesce(billing_interval, premium_interval) else premium_interval end,
    premium_since = case when premium or given then coalesce(premium_since, now()) else null end
  where agency_id = target_agency;

  update public.agencies set plan = case when premium or given then 'premium' else 'free' end
  where id = target_agency and plan is distinct from case when premium or given then 'premium' else 'free' end;

  return result;
end
$$;

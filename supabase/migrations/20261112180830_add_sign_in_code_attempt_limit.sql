-- Limits guesses at the six-digit sign-in code: at most 8 tries an hour for
-- one email address. Only the site's server (secret key) can call it.
create table private.code_attempt_log (
  id bigint generated always as identity primary key,
  email text not null,
  created_at timestamptz not null default now()
);
comment on table private.code_attempt_log is
  'One row per attempt to enter a sign-in code, to stop guessing. Rows older than two days are removed as new ones arrive.';
alter table private.code_attempt_log enable row level security;
create index code_attempt_log_email_idx on private.code_attempt_log (email, created_at desc);
create index code_attempt_log_created_idx on private.code_attempt_log (created_at);

create function public.allow_code_attempt(target_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  e text := lower(btrim(target_email));
begin
  delete from private.code_attempt_log where created_at < now() - interval '2 days';
  if (select count(*) from private.code_attempt_log l
      where l.email = e and l.created_at > now() - interval '1 hour') >= 8 then
    return false;
  end if;
  insert into private.code_attempt_log (email) values (e);
  return true;
end
$$;

revoke all on function public.allow_code_attempt(text) from public, anon, authenticated;
grant execute on function public.allow_code_attempt(text) to service_role;

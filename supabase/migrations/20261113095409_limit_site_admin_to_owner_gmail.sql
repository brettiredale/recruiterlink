-- Owner's instruction, 13 Nov 2026: the admin area (/admin) is open to one
-- address only, brettiredale@gmail.com. brett@recruiterlink.com stays an
-- ordinary account (it still manages the listing the-recruiter-link) and
-- still receives the form notification emails, but is no longer a site admin.
delete from private.site_admins where email <> 'brettiredale@gmail.com';

insert into private.site_admins (email) values ('brettiredale@gmail.com')
on conflict (email) do nothing;

comment on table private.site_admins is
  'Who can open /admin and run the admin_* functions. Owner''s decision 13 Nov 2026: brettiredale@gmail.com only.';

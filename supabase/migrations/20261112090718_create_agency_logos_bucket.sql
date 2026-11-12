-- Public storage for agency logos, so listings never depend on images hosted
-- by someone else. Files are named <agency id>.<extension>.
-- Public means anyone can view a logo by its address; nobody can list,
-- upload, change or delete files without the database's own server-side key.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agency-logos',
  'agency-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
);

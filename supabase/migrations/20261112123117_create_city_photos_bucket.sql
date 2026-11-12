-- Public storage for city photos (AI-generated), shown at the top of city
-- pages. Files are named <city id>.jpg and recorded in public.cities.photo_path.
-- Public means anyone can view a photo by its address; nobody can list,
-- upload, change or delete files without the database's own server-side key
-- (no storage policies are added, so the public API has no write or list access).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'city-photos',
  'city-photos',
  true,
  1572864,
  array['image/jpeg', 'image/webp']
);

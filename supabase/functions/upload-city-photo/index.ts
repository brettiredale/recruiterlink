// Retired. This was a one-off job that stored AI-generated city photos in the
// `city-photos` storage bucket and recorded them in public.cities.photo_path
// (run on 12 Nov 2026). It now does nothing and is safe to delete. The source
// it ran with is kept beside this file as working-source.reference.ts.txt.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(() =>
  Response.json(
    { error: "gone: this one-off job has finished and is retired" },
    { status: 410 },
  )
);

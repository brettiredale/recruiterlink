import { getSupabaseConfig } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** What a Premium agency has added to its page. Empty for free listings. */
export type PremiumContent = {
  videoUrl: string | null;
  photos: { id: string; path: string; caption: string | null }[];
  team: { id: string; name: string; jobTitle: string | null; photoPath: string | null; linkedInUrl: string | null }[];
  testimonials: { id: string; quote: string; person: string; detail: string | null }[];
};

export const EMPTY_PREMIUM_CONTENT: PremiumContent = { videoUrl: null, photos: [], team: [], testimonials: [] };

/** Public address of a Premium photo or team portrait. */
export function agencyMediaUrl(path: string): string {
  const { url } = getSupabaseConfig();
  return `${url}/storage/v1/object/public/agency-media/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * The public Premium content of a listing. The database only returns rows
 * for published Premium listings, so a lapsed listing reads as empty.
 */
export async function getPremiumContent(agencyId: string): Promise<PremiumContent> {
  const supabase = getSupabaseServerClient();
  const [video, photos, team, testimonials] = await Promise.all([
    supabase.from("agency_videos").select("url").eq("agency_id", agencyId).maybeSingle(),
    supabase
      .from("agency_photos")
      .select("id, path, caption")
      .eq("agency_id", agencyId)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("agency_team_members")
      .select("id, name, job_title, photo_path, linkedin_url")
      .eq("agency_id", agencyId)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("agency_testimonials")
      .select("id, quote, person, detail")
      .eq("agency_id", agencyId)
      .order("sort_order")
      .order("created_at"),
  ]);
  for (const result of [video, photos, team, testimonials]) {
    if (result.error) throw new Error(`Premium content read failed: ${result.error.code} ${result.error.message}`);
  }
  return {
    videoUrl: video.data?.url ?? null,
    photos: photos.data ?? [],
    team: (team.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      jobTitle: row.job_title,
      photoPath: row.photo_path,
      linkedInUrl: row.linkedin_url,
    })),
    testimonials: testimonials.data ?? [],
  };
}

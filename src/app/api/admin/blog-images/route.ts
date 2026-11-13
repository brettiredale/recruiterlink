import { blogErrorFrom, BlogError } from "@/features/blog/errors";
import { UPLOAD_MAX_BYTES } from "@/features/blog/image-check";
import { storeBlogImage } from "@/features/blog/images";
import { getSupabaseSessionClient } from "@/lib/supabase/session";

export const maxDuration = 60;

/**
 * POST /api/admin/blog-images: a picture from the admin editor (a "file"
 * form field). Only for signed-in site admins; the database confirms that
 * before the file is stored. Returns { url }.
 */
export async function POST(request: Request) {
  const fail = (message: string, status: number) =>
    Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });

  try {
    const supabase = await getSupabaseSessionClient();
    const { error } = await supabase.rpc("admin_check");
    if (error) {
      const problem = blogErrorFrom(error);
      return fail(problem.status === 401 ? "Your sign-in has ended. Sign in again, then retry." : problem.message, problem.status);
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return fail("Choose a picture to upload.", 400);
    if (file.size > UPLOAD_MAX_BYTES) return fail("That picture is too large. Use one under 4 MB.", 413);

    const { url } = await storeBlogImage(new Uint8Array(await file.arrayBuffer()));
    return Response.json({ url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof BlogError) return fail(error.message, error.status);
    console.error("Admin image upload failed:", error);
    return fail("The picture could not be uploaded. Please try again.", 500);
  }
}

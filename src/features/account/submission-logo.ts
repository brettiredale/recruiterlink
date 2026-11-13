import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { findAgencyLogo } from "./logo-finder";

/** Only files this site stored; the logos copied from the old site are never deleted. */
export const OWN_LOGO_NAME = /^[0-9a-f-]{36}-\d{10,16}\.(png|jpg|webp)$/;

/**
 * Looks for a logo for a listing waiting for review, stores it in the
 * agency-logos bucket and records it on the submission. Always records that
 * the search finished, found or not, so the review page stops saying
 * "looking". Never throws: it runs after the agency has had its answer.
 */
export async function lookForSubmissionLogo(submissionId: string, website: string, domain: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  let newPath: string | null = null;
  let source: string | null = null;
  try {
    const found = await findAgencyLogo(website, domain);
    if (found) {
      newPath = `${submissionId}-${Date.now()}.png`;
      const upload = await admin.storage.from("agency-logos").upload(newPath, found.bytes, {
        contentType: "image/png",
        cacheControl: "31536000",
        upsert: false,
      });
      if (upload.error) {
        console.error("Submission logo upload failed:", upload.error.message);
        newPath = null;
      } else {
        source = found.source;
      }
    }
  } catch (error) {
    console.error("Submission logo search failed:", error);
    newPath = null;
  }

  const saved = await admin.rpc("set_submission_logo", {
    target_submission: submissionId,
    new_logo_path: newPath as string,
    new_logo_source: source as string,
  });
  if (saved.error) {
    // Reviewed in the meantime, for example: the new file is not wanted.
    console.error("set_submission_logo failed:", saved.error.code, saved.error.message);
    if (newPath) await removeLogoFile(newPath);
    return;
  }
  const oldPath = saved.data;
  if (oldPath && oldPath !== newPath) await removeLogoFile(oldPath);
}

export async function removeLogoFile(path: string): Promise<void> {
  if (!OWN_LOGO_NAME.test(path)) return;
  const removed = await getSupabaseAdminClient().storage.from("agency-logos").remove([path]);
  if (removed.error) console.error("Logo file not removed:", removed.error.message);
}

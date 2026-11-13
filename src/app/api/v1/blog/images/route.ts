import { UploadArgs, checkKey, uploadBytes, uploadImage } from "@/features/blog/bot";
import { BlogError } from "@/features/blog/errors";
import { UPLOAD_MAX_BYTES } from "@/features/blog/image-check";
import { apiJson, readJson, withApiKey } from "@/features/blog/rest";

export const maxDuration = 60;

/**
 * POST /api/v1/blog/images: store a picture on RecruiterLink's own image
 * host. Either JSON { "image_url": "https://…" } (or "image_base64"), or a
 * multipart form with a "file" field. Returns { url, markdown }.
 */
export async function POST(request: Request) {
  return withApiKey(request, async (key) => {
    if ((request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
      await checkKey(key, true);
      const form = await request.formData().catch(() => null);
      const file = form?.get("file");
      if (!(file instanceof File)) throw new BlogError("invalid", "Send the picture in a form field called \"file\".", 400);
      if (file.size > UPLOAD_MAX_BYTES) {
        throw new BlogError("too_large", "Files sent directly can be up to 4 MB. For bigger images send image_url instead.", 413);
      }
      const alt = form?.get("alt");
      return apiJson(await uploadBytes(new Uint8Array(await file.arrayBuffer()), typeof alt === "string" ? alt : undefined), 201);
    }
    return apiJson(await uploadImage(key, await readJson(request, UploadArgs)), 201);
  });
}

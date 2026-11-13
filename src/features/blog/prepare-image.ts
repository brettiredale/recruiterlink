// Browser only: gets a picture ready to upload from the admin editor.
//
// Photos straight from a phone or camera are often 5 to 15 MB and 4,000+
// pixels wide, which is more than a web page needs and more than one upload
// can carry. Large pictures are scaled down to 2,400 pixels on the long side
// and saved as WebP (or JPEG where the browser cannot make WebP), which
// keeps them sharp on large screens. Small pictures and GIFs (which may
// move) are sent as they are.

import { UPLOAD_MAX_BYTES } from "./image-check";

const LONG_SIDE = 2400;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export class ImagePrepError extends Error {}

function load(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImagePrepError("That file could not be opened as a picture."));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareImage(file: File): Promise<File> {
  if (!ACCEPTED.includes(file.type)) {
    throw new ImagePrepError("Use a PNG, JPEG, WebP or GIF picture.");
  }
  if (file.type === "image/gif") {
    if (file.size > UPLOAD_MAX_BYTES) throw new ImagePrepError("That GIF is too large. Use one under 4 MB.");
    return file;
  }

  const img = await load(file);
  const longSide = Math.max(img.naturalWidth, img.naturalHeight);
  if (file.size <= 1.5 * 1024 * 1024 && longSide <= LONG_SIDE) return file;

  const scale = Math.min(1, LONG_SIDE / longSide);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.imageSmoothingQuality = "high";
  context.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Some browsers cannot make WebP and quietly hand back PNG instead.
  let blob = await toBlob(canvas, "image/webp", 0.86);
  let type = "image/webp";
  if (!blob || blob.type !== "image/webp") {
    blob = await toBlob(canvas, "image/jpeg", 0.86);
    type = "image/jpeg";
  }
  if (!blob) return file;
  if (blob.size > UPLOAD_MAX_BYTES) {
    throw new ImagePrepError("That picture is still too large after shrinking. Try a smaller one.");
  }
  const name = file.name.replace(/\.[^.]+$/, "") + (type === "image/webp" ? ".webp" : ".jpg");
  return new File([blob], name, { type });
}
